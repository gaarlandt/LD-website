import { describe, it, expect } from "vitest";
import { toMetaEvent } from "./meta-events";

describe("toMetaEvent", () => {
  it("returns null for events with no Meta standard equivalent", () => {
    // cta_clicked is the busiest event on the site and is deliberately not
    // mapped — sending it would be an unbiddable custom event.
    expect(toMetaEvent("cta_clicked", { link_destination: "checkout" })).toBeNull();
    expect(toMetaEvent("some_future_event")).toBeNull();
  });

  it("maps begin_checkout to InitiateCheckout with value and content ids", () => {
    const result = toMetaEvent("begin_checkout", {
      currency: "EUR",
      value: 59,
      billing_period: "yearly",
      items: [
        {
          item_id: "2233",
          item_name: "Jaarlidmaatschap",
          item_category: "membership",
          price: 59,
          quantity: 1,
        },
      ],
    });

    expect(result).toEqual({
      name: "InitiateCheckout",
      params: {
        currency: "EUR",
        value: 59,
        content_type: "product",
        content_ids: ["2233"],
        contents: [{ id: "2233", quantity: 1, item_price: 59 }],
        num_items: 1,
      },
    });
  });

  it("coerces a numeric item_id to a string so catalogue matching still works", () => {
    const result = toMetaEvent("begin_checkout", {
      currency: "EUR",
      value: 59,
      items: [{ item_id: 2234, price: 59, quantity: 1 }],
    });

    expect(result?.params.content_ids).toEqual(["2234"]);
  });

  it("survives begin_checkout without an items array", () => {
    const result = toMetaEvent("begin_checkout", { currency: "EUR", value: 59 });

    expect(result?.name).toBe("InitiateCheckout");
    expect(result?.params.content_ids).toEqual([]);
    expect(result?.params.num_items).toBe(0);
  });

  it("maps both form successes to Lead but keeps them distinguishable", () => {
    expect(toMetaEvent("contact_form_submitted")).toEqual({
      name: "Lead",
      params: { content_name: "contact_form" },
    });

    expect(toMetaEvent("creator_form_submitted", { collaboration: "ugc" })).toEqual({
      name: "Lead",
      params: { content_name: "creator_form", content_category: "ugc" },
    });
  });

  it("maps view_item_list to ViewContent", () => {
    expect(toMetaEvent("view_item_list", { item_list_name: "pricing", source: "homepage" })).toEqual(
      {
        name: "ViewContent",
        params: {
          content_type: "product_group",
          content_name: "pricing",
          content_category: "homepage",
        },
      },
    );
  });

  it("keeps content_ids and contents describing the same line items", () => {
    // An item with no id must drop out of BOTH arrays, not just content_ids —
    // mismatched lengths read as a malformed payload on Meta's side.
    const result = toMetaEvent("begin_checkout", {
      currency: "EUR",
      value: 59,
      items: [
        { item_id: "2233", price: 59, quantity: 1 },
        { item_name: "no id here", price: 12, quantity: 1 },
      ],
    });

    expect(result?.params.content_ids).toEqual(["2233"]);
    expect(result?.params.contents).toEqual([{ id: "2233", quantity: 1, item_price: 59 }]);
    expect(result?.params.num_items).toBe(1);
  });

  it("survives a malformed items array instead of throwing on the checkout click", () => {
    const result = toMetaEvent("begin_checkout", {
      currency: "EUR",
      value: 59,
      items: [null, "nonsense", { item_id: "2234", price: 59, quantity: 2 }],
    });

    expect(result?.params.content_ids).toEqual(["2234"]);
    expect(result?.params.contents).toEqual([{ id: "2234", quantity: 2, item_price: 59 }]);
  });

  it("defaults a non-numeric quantity and omits a non-numeric price", () => {
    const result = toMetaEvent("begin_checkout", {
      currency: "EUR",
      value: 59,
      items: [{ item_id: "2233", price: "59,00", quantity: "one" }],
    });

    expect(result?.params.contents).toEqual([{ id: "2233", quantity: 1, item_price: undefined }]);
  });

  it("does not treat inherited Object keys as mapped events", () => {
    // A bare MAPPINGS[name] lookup would return a truthy function here and throw.
    expect(toMetaEvent("constructor")).toBeNull();
    expect(toMetaEvent("toString")).toBeNull();
    expect(toMetaEvent("__proto__")).toBeNull();
  });

  it("drops undefined params rather than sending them to Meta", () => {
    // creator_form_submitted without `collaboration` must not send
    // content_category: undefined — Events Manager flags that as a diagnostic.
    const result = toMetaEvent("creator_form_submitted");

    expect(result?.params).toEqual({ content_name: "creator_form" });
    expect("content_category" in (result?.params ?? {})).toBe(false);
  });
});
