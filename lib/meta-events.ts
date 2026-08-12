// Maps this site's internal event names onto Meta's *standard* events.
//
// Pure on purpose (no window, no fbq) so it can be unit-tested in the Node
// test env — same reason lib/cta-destination.ts exists apart from the
// CTATracker that consumes it. lib/analytics.ts does the actual firing.
//
// Only events Meta recognises by name are mapped. A standard event is what
// lets a campaign optimise for it in Ads Manager; an unmapped internal event
// (e.g. cta_clicked) would arrive as a custom event that no campaign objective
// can bid on, so it is deliberately left out rather than sent as noise.
//
// NOT mapped, and not an oversight: `Purchase`. Payment happens on another
// domain, so this pixel can never observe it. That gap is now closed on the
// other side rather than here: since 2026-08-10 the platform sends `Purchase`
// server-side over Meta's Conversions API.
//
// WHICH HOST OWNS WHICH EVENT is therefore a real question, and it is settled in
// loop decision D-101 rather than per file. Both hosts receive ad traffic, so
// anything both could fire would be counted twice. This host owns the top of the
// funnel it can actually witness — `PageView`, `ViewContent`, `AddToCart`,
// `Lead`. The platform owns `InitiateCheckout` and `Purchase`. Before adding a
// mapping here, check that table.

// Defined here rather than in lib/analytics.ts, and imported *from* here by the
// chokepoint. This module is a leaf with no imports of its own, so owning the
// type keeps one definition without creating an analytics <-> meta-events cycle.
export type MetaEventParams = Record<string, string | number | boolean | null | undefined | object>;

export type MetaEvent = {
  name: string;
  params: Record<string, unknown>;
};

// A single line item as begin_checkout emits it (components/sections/plan-cta.tsx).
type CheckoutItem = {
  item_id?: unknown;
  price?: unknown;
  quantity?: unknown;
};

function readItems(params: MetaEventParams): CheckoutItem[] {
  const items = params.items;
  if (!Array.isArray(items)) return [];
  // Drop non-objects before anything reads a property off them: a stray null or
  // string in the array would otherwise throw inside the mapping, and this runs
  // on the checkout click path.
  return items.filter((item): item is CheckoutItem => typeof item === "object" && item !== null);
}

// Meta expects content ids as strings. item_id is already a string SKU upstream
// (the shared item contract: ld_maand / ld_jaar), but coerce defensively — a
// numeric id silently breaks catalogue matching rather than erroring.
function asContentId(value: unknown): string | null {
  return value === undefined || value === null ? null : String(value);
}

// Internal event name → its Meta standard event. The names are Meta's exact
// spelling and are matched case-sensitively: "Lead" is a standard event that a
// campaign can optimise for, "lead" is an unbiddable custom event.
const MAPPINGS: Record<string, { name: string; params: (p: MetaEventParams) => Record<string, unknown> }> = {
  // Pricing tier CTA CLICKED — intent, not arrival. Carries value + currency so
  // Ads Manager reports against real euros instead of a bare count.
  //
  // WHY AddToCart AND NOT InitiateCheckout (loop decision D-101, 2026-08-11).
  // What this trigger can honestly claim is that someone clicked a price on this
  // site. It cannot claim the visitor reached the checkout: the checkout is on
  // another host, and a click is not an arrival. The platform CAN see that, and
  // it sees it for BOTH ways in — straight to the checkout from an ad, or
  // through the quiz funnel — so `InitiateCheckout` is owned there and fires
  // there. Two hosts firing the same event would simply count it twice, which is
  // why ownership is settled per event rather than per host.
  //
  // AddToCart is Meta's own standard step between ViewContent and
  // InitiateCheckout in the same ladder, so the event stays biddable and the
  // funnel keeps its order. Do not "fix" this into a custom event: a custom
  // event cannot be optimised or bid on, which is the whole reason this mapping
  // table only ever emits standard events.
  begin_checkout: {
    name: "AddToCart",
    params: (p) => {
      // Filter once, up front: content_ids and contents must describe the SAME
      // line items. Filtering only content_ids would let the two arrays
      // disagree in length on an item with no id, which Meta reads as a
      // malformed payload rather than an error.
      const items = readItems(p).filter((item) => asContentId(item.item_id) !== null);
      return {
        currency: p.currency,
        value: p.value,
        content_type: "product",
        content_ids: items.map((item) => asContentId(item.item_id)),
        contents: items.map((item) => ({
          id: asContentId(item.item_id),
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          item_price: typeof item.price === "number" ? item.price : undefined,
        })),
        num_items: items.length,
      };
    },
  },

  // Both form successes are the same thing to Meta: a lead. They stay
  // distinguishable via content_name, so one campaign can optimise for contact
  // leads and another for creator applications.
  contact_form_submitted: {
    name: "Lead",
    params: () => ({ content_name: "contact_form" }),
  },
  creator_form_submitted: {
    name: "Lead",
    params: (p) => ({ content_name: "creator_form", content_category: p.collaboration }),
  },

  // Pricing section scrolled into view — the retargeting audience worth having
  // ("looked at prices but didn't start checkout").
  view_item_list: {
    name: "ViewContent",
    params: (p) => ({
      content_type: "product_group",
      content_name: p.item_list_name,
      content_category: p.source,
    }),
  },
};

/**
 * Every internal event this host maps, exported so a test can assert on the
 * WHOLE table instead of a list someone has to remember to extend. The
 * ownership split in D-101 is only worth anything if a new mapping cannot
 * quietly reintroduce an event the platform owns.
 */
export const MAPPED_EVENTS = Object.keys(MAPPINGS);

/**
 * Translate an internal event into its Meta standard event, or null when the
 * event has no Meta equivalent (the common case — most events aren't sent).
 */
export function toMetaEvent(eventName: string, params: MetaEventParams = {}): MetaEvent | null {
  // hasOwn, not a truthiness check: a bare lookup would resolve inherited
  // Object.prototype keys, so an event literally named "constructor" or
  // "toString" would return a truthy non-mapping and throw on the call below.
  if (!Object.hasOwn(MAPPINGS, eventName)) return null;
  const mapping = MAPPINGS[eventName];

  // Drop undefined values so the payload stays clean — Meta raises a
  // diagnostic in Events Manager for params it receives as undefined.
  const cleaned = Object.fromEntries(
    Object.entries(mapping.params(params)).filter(([, value]) => value !== undefined),
  );

  return { name: mapping.name, params: cleaned };
}
