import { describe, expect, it } from "vitest";
import {
  campaignParamsForHandover,
  handoverConsentFrom,
  isHandoverTarget,
  withCampaignParams,
} from "./platform-handover";

const BASE = "https://letsdog.nl/prijzen/";

// De volledige link zoals een advertentie hem aanlevert, in de vorm die op
// 2026-08-24 op productie gemeten is (run C/D). Niet verzonnen: dit is precies
// de querystring waarmee het verlies gereproduceerd werd.
const AD_SEARCH =
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=ld_meta_jaar_24aug_c" +
  "&utm_term=jur_proef&utm_content=website_route&fbclid=IwZXTESTjaar24augC";

describe("isHandoverTarget", () => {
  it("herkent het platform", () => {
    expect(isHandoverTarget(new URL("https://mijn.letsdog.nl/checkout?plan=yearly"))).toBe(true);
  });

  it("laat de andere Let's dog-hosts met rust", () => {
    // Deze drie staan wél in TRACKED_HOSTS van cta-destination.ts. Ze draaien de
    // attributielezer niet, dus parameters eraan plakken stuurt een klik-id naar
    // een host die er niets mee doet.
    expect(isHandoverTarget(new URL("https://app.letsdog.nl/checkout/"))).toBe(false);
    expect(isHandoverTarget(new URL("https://keuzehulp.letsdog.nl/"))).toBe(false);
    expect(isHandoverTarget(new URL("https://agenda.letsdog.nl/"))).toBe(false);
  });

  it("laat de eigen site en derden met rust", () => {
    expect(isHandoverTarget(new URL("https://letsdog.nl/prijzen/"))).toBe(false);
    expect(isHandoverTarget(new URL("https://example.com/"))).toBe(false);
  });
});

describe("handoverConsentFrom", () => {
  it("noemt het onbeantwoord als geen van beide bronnen iets zegt", () => {
    expect(handoverConsentFrom(null, null)).toEqual({ answered: false });
  });

  it("gebruikt de effectieve keuze als die er is", () => {
    expect(handoverConsentFrom({ s: true, m: false }, null)).toEqual({
      answered: true,
      s: true,
      m: false,
    });
  });

  it("VALT TERUG OP HET RAUWE RECORD BIJ EEN WEIGERING DIE NIETS TOESTAAT", () => {
    // De regressie waar deze functie voor bestaat, gemeten 2026-08-24 op de
    // gebouwde site: `consentCookieSupersedes` geeft bij een ontbrekende
    // Cookiebot `allowsAnyCategory(cookie)`, dus een "alles nee" komt uit
    // `effectiveConsent` als null. Zonder de tweede bron leest dat hier als
    // "nog niets beantwoord" en reist de campagne alsnog mee — precies bij de
    // bezoeker met een adblocker, die Cookiebot nooit krijgt.
    expect(handoverConsentFrom(null, { s: false, m: false })).toEqual({
      answered: true,
      s: false,
      m: false,
    });
  });

  it("laat de effectieve keuze voorgaan op het rauwe record", () => {
    expect(handoverConsentFrom({ s: true, m: true }, { s: false, m: false })).toEqual({
      answered: true,
      s: true,
      m: true,
    });
  });
});

describe("campaignParamsForHandover", () => {
  it("stuurt bij een ONBEANTWOORDE banner alles mee, want dat is het gat dat D-96 dicht", () => {
    const params = campaignParamsForHandover({
      search: AD_SEARCH,
      stored: null,
      consent: { answered: false },
    });
    expect(params.utm_campaign).toBe("ld_meta_jaar_24aug_c");
    expect(params.fbclid).toBe("IwZXTESTjaar24augC");
    expect(params.utm_source).toBe("facebook");
  });

  it("stuurt na een WEIGERING op beide poorten niets mee", () => {
    const params = campaignParamsForHandover({
      search: AD_SEARCH,
      stored: null,
      consent: { answered: true, s: false, m: false },
    });
    expect(params).toEqual({});
  });

  it("splitst de twee poorten: statistiek draagt de utm's, marketing de fbclid", () => {
    const alleenStatistiek = campaignParamsForHandover({
      search: AD_SEARCH,
      stored: null,
      consent: { answered: true, s: true, m: false },
    });
    expect(alleenStatistiek.utm_campaign).toBe("ld_meta_jaar_24aug_c");
    expect(alleenStatistiek.fbclid).toBeUndefined();

    const alleenMarketing = campaignParamsForHandover({
      search: AD_SEARCH,
      stored: null,
      consent: { answered: true, s: false, m: true },
    });
    expect(alleenMarketing.fbclid).toBe("IwZXTESTjaar24augC");
    expect(alleenMarketing.utm_campaign).toBeUndefined();
  });

  it("laat de EERSTE touch winnen van wat er toevallig in de URL staat", () => {
    // Tweede advertentieklik in hetzelfde tabblad: het bewaarde record houdt het
    // krediet, precies zoals het cookie zelf dat doet.
    const params = campaignParamsForHandover({
      search: "?utm_campaign=tweede_klik&fbclid=IwZXTWEEDE",
      stored: { utm_campaign: "eerste_klik", fbclid: "IwZXEERSTE" },
      consent: { answered: true, s: true, m: true },
    });
    expect(params.utm_campaign).toBe("eerste_klik");
    expect(params.fbclid).toBe("IwZXEERSTE");
  });

  it("levert een lege set als er niets te dragen valt", () => {
    expect(
      campaignParamsForHandover({ search: "", stored: null, consent: { answered: false } }),
    ).toEqual({});
  });
});

describe("withCampaignParams", () => {
  it("plakt de campagne op de checkout-CTA en houdt het plan intact", () => {
    const href = withCampaignParams(
      "https://mijn.letsdog.nl/checkout?plan=yearly",
      { utm_campaign: "ld_meta_jaar_24aug_c", fbclid: "IwZXTESTjaar24augC" },
      BASE,
    );
    const url = new URL(href);
    expect(url.searchParams.get("plan")).toBe("yearly");
    expect(url.searchParams.get("utm_campaign")).toBe("ld_meta_jaar_24aug_c");
    expect(url.searchParams.get("fbclid")).toBe("IwZXTESTjaar24augC");
  });

  it("overschrijft NOOIT een parameter die er al staat, dus herhalen is een no-op", () => {
    const eerste = withCampaignParams(
      "https://mijn.letsdog.nl/checkout?plan=yearly&utm_campaign=handmatig",
      { utm_campaign: "uit_het_record" },
      BASE,
    );
    expect(new URL(eerste).searchParams.get("utm_campaign")).toBe("handmatig");

    // Idempotent: de component draait bij elke route- en toestemmingswissel over
    // dezelfde ankers, dus een tweede pas mag niets meer veranderen.
    const tweede = withCampaignParams(eerste, { utm_campaign: "uit_het_record" }, BASE);
    expect(tweede).toBe(eerste);
  });

  it("laat een actiecode ongemoeid", () => {
    const href = withCampaignParams(
      "https://mijn.letsdog.nl/checkout?plan=monthly&code=GEHEIM",
      { utm_source: "facebook" },
      BASE,
    );
    expect(new URL(href).searchParams.get("code")).toBe("GEHEIM");
  });

  it("laat een link die niet naar het platform gaat letterlijk ongewijzigd", () => {
    const intern = withCampaignParams("/prijzen/", { utm_source: "facebook" }, BASE);
    expect(intern).toBe("/prijzen/");

    const derde = withCampaignParams("https://example.com/", { utm_source: "facebook" }, BASE);
    expect(derde).toBe("https://example.com/");
  });

  it("laat de link ongewijzigd als er niets mee te geven is", () => {
    const href = "https://mijn.letsdog.nl/checkout?plan=yearly";
    expect(withCampaignParams(href, {}, BASE)).toBe(href);
  });

  it("bezwijkt niet op een href die geen URL is", () => {
    expect(withCampaignParams("mailto:hallo@letsdog.nl", { utm_source: "x" }, BASE)).toBe(
      "mailto:hallo@letsdog.nl",
    );
    expect(withCampaignParams("", { utm_source: "x" }, BASE)).toBe("");
  });

  it("kapt een lang klik-id NIET af, want een half klik-id matcht bij Meta nergens op", () => {
    const lang = "IwZX" + "A".repeat(220);
    const href = withCampaignParams(
      "https://mijn.letsdog.nl/checkout?plan=yearly",
      { fbclid: lang },
      BASE,
    );
    expect(new URL(href).searchParams.get("fbclid")).toBe(lang);
  });
});
