// De campagneparameters meegeven op een link NAAR het platform, zodat de
// overdracht niet meer aan één draadje hangt (D-96).
//
// WAAROM DIT BESTAAT, en dit is gemeten en niet bedacht. De overdracht liep tot
// nu toe uitsluitend via het `ld_attribution`-cookie, en dat cookie wordt hier
// pas geschreven zodra de bezoeker de banner beantwoordt. Wie dat NIET doet en
// pas op de checkout van het platform ja zegt, is zijn campagne kwijt: de
// parameters leefden alleen in het geheugen van de pagina die hij net verlaten
// heeft. Gemeten op productie 2026-08-24, met de positieve tak ernaast in
// dezelfde run (wél antwoorden op /prijzen/ → het record staat er compleet).
// Het is geen randgeval: het is de normale bezoeker die een banner wegklikt of
// negeert, en het kost precies de attributie waar de campagnes op sturen.
//
// WAAROM DE URL EN NIET OPSLAG. Een URL is geen opslag, en lezen van een URL
// vraagt geen toestemming — dat is de redenering waar `lib/attribution.ts` al
// op staat. De ontvanger bewaart pas na zijn eigen ja (`captureFirstTouch` op
// het platform doet niets zonder toestemming), dus er belandt geen byte op een
// schijf die er nu niet belandt. Daarmee blijft [[D-93]] overeind, terwijl
// sessionStorage of localStorage vóór de keuze dat besluit wél zou breken.
// sessionStorage was bovendien geen oplossing geweest: de checkout-CTA opent
// een NIEUW TABBLAD en sessionStorage is per tabblad.
//
// WAT DE UITKOMST IS: een uitgaande link krijgt exact de vorm die een
// advertentie die rechtstreeks naar de checkout wijst al heeft. Die route is de
// bewezen route — het platform leest de parameters daar van zijn eigen URL — dus
// dit maakt de omweg over deze site structureel gelijk aan de rechtstreekse
// klik, in plaats van er een tweede mechanisme naast te zetten.

import { consentedParams, type AttributionParams, ATTRIBUTION_URL_PARAMS } from "./attribution";

/**
 * De hosts die deze overdracht KUNNEN ontvangen.
 *
 * BEWUST SMALLER DAN `TRACKED_HOSTS` in `lib/cta-destination.ts`, en dat
 * verschil is de hele reden dat hier een eigen lijst staat. Die lijst
 * beantwoordt "waar klikt iemand heen" (voor de meting van de klik zelf) en
 * bevat daarom ook `app.letsdog.nl` (de oude WordPress-host die verdwijnt),
 * `keuzehulp.letsdog.nl` en `agenda.letsdog.nl`. Geen van die drie draait de
 * attributielezer van het platform, dus parameters eraan plakken zou ze naar
 * een host sturen die er niets mee doet — ruis in andermans logs, en een
 * klik-id in een URL waar niemand om vroeg.
 *
 * Komt er een host bij die de lezer wél draait, dan hoort hij HIER bij en niet
 * in de andere lijst.
 */
export const HANDOVER_HOSTS = ["mijn.letsdog.nl"] as const;

/** Ontvangt deze URL de overdracht? */
export function isHandoverTarget(url: URL): boolean {
  return (HANDOVER_HOSTS as readonly string[]).includes(url.hostname);
}

/**
 * De toestemmingsstand zoals deze module hem nodig heeft, en het onderscheid
 * dat hier alles bepaalt: NIET-BEANTWOORD is iets anders dan GEWEIGERD.
 *
 * `consentedParams` kent dat verschil niet — die krijgt twee booleans en twee
 * keer `false` betekent daar "mag niet". Voor ons zijn dat twee tegengestelde
 * gevallen, dus het onderscheid moet in het TYPE zitten en niet in een
 * conventie die een volgende lezer moet raden.
 */
export type HandoverConsent = { answered: false } | { answered: true; s: boolean; m: boolean };

/**
 * De toestemmingsstand voor DEZE vraag, uit de twee bronnen die de site al
 * heeft — en de reden dat dit een eigen functie is in plaats van een `??` in de
 * component.
 *
 * `effectiveConsent` is niet genoeg, en dat is gemeten en niet beredeneerd
 * (2026-08-24, op de gebouwde site): `consentCookieSupersedes` zegt bij een
 * ontbrekende Cookiebot `return allowsAnyCategory(cookie)`, dus een `ld_consent`
 * die ALLES weigert telt daar als GEEN signaal en `effectiveConsent` geeft
 * `null`. Voor de aanroepers waarvoor die regel geschreven is klopt dat precies:
 * die vragen "mag ik vuren", en `null` en "alles nee" leiden daar tot hetzelfde
 * gedrag. Bij ons is `null` juist de stand waarin ALLES meereist, dus dezelfde
 * helper geeft hier het tegenovergestelde van wat hij daar geeft — een
 * weigeraar zonder Cookiebot kreeg zijn campagne alsnog mee.
 *
 * Vandaar de tweede bron: het rauwe `ld_consent`-record valt in als
 * `effectiveConsent` niets teruggeeft. Een keuze die er ligt, telt — ook als het
 * een nee is. Pas als er geen van beide is, is er echt niets beantwoord.
 */
export function handoverConsentFrom(
  effective: { s: boolean; m: boolean } | null,
  recorded: { s: boolean; m: boolean } | null,
): HandoverConsent {
  const answer = effective ?? recorded;
  return answer ? { answered: true, s: answer.s, m: answer.m } : { answered: false };
}

/**
 * Wat er mee mag reizen op een link naar het platform.
 *
 * DRIE REGELS, en de eerste is degene waar dit voor gebouwd is:
 *
 * 1. NIET BEANTWOORD → alles gaat mee. Dit is het gat dat D-96 dicht. De
 *    bezoeker heeft nog niets geweigerd, er wordt hier niets bewaard, en de
 *    ontvanger stelt zijn eigen vraag voordat hij iets opslaat. Zou je hier
 *    niets meesturen, dan verandert er precies niets aan de bug.
 *
 * 2. BEANTWOORD → alleen wat die keuze toelaat, via dezelfde `consentedParams`
 *    die het cookie ook narrowt. Een weigering op beide poorten levert dus een
 *    lege set en er reist niets mee. DAT IS EEN KEUZE EN GEEN NOODZAAK: een
 *    weigering hier had ook gelezen kunnen worden als "geldt voor de cookies van
 *    deze site" waarna het platform apart zijn eigen vraag stelt. Het is de
 *    behoudende kant op beslist, omdat een klik-id dat na een uitgesproken nee
 *    tóch doorreist precies het soort ding is dat je niet wilt hoeven uitleggen.
 *
 * 3. FIRST TOUCH WINT, net als overal in deze keten. Staat er een bewaard
 *    record, dan reist DAT mee en niet wat er toevallig in de huidige URL staat;
 *    die twee lopen uiteen zodra iemand een tweede advertentie aanklikt, en dan
 *    hoort de eerste klik het krediet te houden. Pas als er geen record is, is
 *    de huidige URL de bron — en dat is exact het geval waarvoor dit bestaat,
 *    want zonder toestemming is er per constructie geen record.
 */
export function campaignParamsForHandover(input: {
  search: string;
  stored: AttributionParams | null;
  consent: HandoverConsent;
}): AttributionParams {
  const { search, stored, consent } = input;

  const source: AttributionParams = stored ?? readParams(search);
  if (!consent.answered) return source;
  return consentedParams(source, { s: consent.s, m: consent.m });
}

/**
 * De parameters uit een querystring, beperkt tot de zeven namen van het
 * contract.
 *
 * Eigen kopie in plaats van `readAttributionParams` omdat die de waarden ook
 * afkapt op de opslaglimiet; hier gaat er niets de opslag in en is afkappen
 * juist schadelijk — een half klik-id matcht bij Meta nergens meer op. Te lang
 * betekent hier dus ONGEWIJZIGD DOORGEVEN en de ontvanger beslist, dezelfde
 * lijn die `readAttribution` op het platform voor `_fbc` aanhoudt.
 */
function readParams(search: string): AttributionParams {
  const query = new URLSearchParams(search);
  const params: AttributionParams = {};
  for (const name of ATTRIBUTION_URL_PARAMS) {
    const value = query.get(name);
    if (typeof value === "string" && value.trim()) params[name] = value.trim();
  }
  return params;
}

/**
 * De link met de campagne erop, of ONGEWIJZIGD als er niets te doen is.
 *
 * NOOIT EEN BESTAANDE PARAMETER OVERSCHRIJVEN, en dat is wat deze functie
 * herhaalbaar maakt. De component hieronder draait bij elke routewissel en bij
 * elke toestemmingswissel over dezelfde ankers; zou dit overschrijven, dan
 * stapelt of verspringt de waarde. Nu is de tweede aanroep per constructie een
 * no-op. Het beschermt meteen het geval dat ertoe doet: een link die zelf al
 * `plan=yearly` of een actiecode draagt, houdt die precies zoals hij was.
 *
 * Geeft een STRING terug en geen URL, want dat is wat er in `href` moet.
 */
export function withCampaignParams(href: string, params: AttributionParams, base: string): string {
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return href;
  }
  if (!isHandoverTarget(url)) return href;

  let changed = false;
  for (const name of ATTRIBUTION_URL_PARAMS) {
    const value = params[name];
    if (value === undefined) continue;
    if (url.searchParams.has(name)) continue;
    url.searchParams.set(name, value);
    changed = true;
  }
  return changed ? url.href : href;
}
