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
// domain (WooCommerce on app.letsdog.nl today, mijn.letsdog.nl after the
// platform cutover), so this pixel can never observe it. Revenue attribution
// needs the pixel and/or the Conversions API on that side — separate work.

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
  return Array.isArray(items) ? (items as CheckoutItem[]) : [];
}

// Meta expects content ids as strings. item_id is already String(productId)
// upstream, but coerce defensively — a numeric id silently breaks catalogue
// matching rather than erroring.
function asContentId(value: unknown): string | null {
  return value === undefined || value === null ? null : String(value);
}

// Internal event name → its Meta standard event. The names are Meta's exact
// spelling and are matched case-sensitively: "Lead" is a standard event that a
// campaign can optimise for, "lead" is an unbiddable custom event.
const MAPPINGS: Record<string, { name: string; params: (p: MetaEventParams) => Record<string, unknown> }> = {
  // Pricing tier CTA clicked. Carries value + currency so Ads Manager reports
  // cost-per-checkout against real euros instead of a bare count.
  begin_checkout: {
    name: "InitiateCheckout",
    params: (p) => {
      const items = readItems(p);
      return {
        currency: p.currency,
        value: p.value,
        content_type: "product",
        content_ids: items.map((item) => asContentId(item.item_id)).filter((id) => id !== null),
        contents: items.map((item) => ({
          id: asContentId(item.item_id) ?? "",
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          item_price: item.price,
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
 * Translate an internal event into its Meta standard event, or null when the
 * event has no Meta equivalent (the common case — most events aren't sent).
 */
export function toMetaEvent(eventName: string, params: MetaEventParams = {}): MetaEvent | null {
  const mapping = MAPPINGS[eventName];
  if (!mapping) return null;

  // Drop undefined values so the payload stays clean — Meta raises a
  // diagnostic in Events Manager for params it receives as undefined.
  const cleaned = Object.fromEntries(
    Object.entries(mapping.params(params)).filter(([, value]) => value !== undefined),
  );

  return { name: mapping.name, params: cleaned };
}
