"use client";

// Zet de campagneparameters op elke link naar het platform (D-96). De regels —
// welke hosts, wat er mee mag, en waarom een URL geen opslag is — staan in
// lib/platform-handover.ts; dit bestand gaat alleen over WANNEER en WAAROP.
//
// WAAROM GEDELEGEERD OVER DE DOM EN NIET PER COMPONENT. De twee plekken die
// vandaag naar het platform wijzen zijn de navbar en de prijskaarten, en die had
// je met een hook allebei kunnen bedienen. Dat lost het op voor de links die er
// NU zijn, en precies daar gaat dit soort reparatie stuk: de derde uitgaande
// link die iemand over een maand toevoegt, krijgt de hook niet mee en niemand
// merkt het, want een ontbrekende campagne geeft geen fout — hij is gewoon leeg.
// Eén plek die op de bestemming selecteert dekt ook de link die nog niet
// bestaat, inclusief die in gerenderde content.
//
// WAAROM HET GEEN KLIK-HANDLER IS. De href bij de klik omzetten dekt de gewone
// klik en verder niets: middelklik, "link kopiëren" en het contextmenu lezen het
// attribuut zoals het in de DOM staat. De checkout-CTA opent bovendien een nieuw
// tabblad, en dat is nou juist de link waar dit voor bestaat.
//
// WAAROM HET DRAAIT OP ROUTEWISSEL EN OP TOESTEMMINGSWISSEL. Bij een routewissel
// staan er andere ankers op de pagina. Bij een toestemmingswissel verandert wat
// er mee MAG: wie hier weigert, hoort zijn klik-id niet alsnog mee te sturen.
// Beide keren is de pas idempotent — `withCampaignParams` overschrijft nooit een
// parameter die er al staat — dus herhalen kost niets en stapelt niets.
//
// WAT DIT NIET REPAREERT, en dat hoort erbij: vóór hydratie draagt de href de
// kale URL. Klikt iemand in dat venster, dan is het gedrag exact wat het vandaag
// al is. Dit maakt niets slechter en de rest van de meetketen zit achter
// dezelfde hydratie.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { onCookiebotConsent, readConsentCookie } from "@/lib/consent";
import { effectiveConsent, readAttributionCookie } from "@/lib/attribution";
import {
  campaignParamsForHandover,
  handoverConsentFrom,
  withCampaignParams,
} from "@/lib/platform-handover";

/**
 * De querystring van de LANDING, vastgehouden voor de rest van het bezoek.
 *
 * DIT IS DE HELE REDEN DAT HIER EEN VARIABELE STAAT, en het is dezelfde val
 * waar dit werk uit voortkomt. Het effect hieronder draait ook bij een
 * routewissel, en op dat moment is `window.location.search` leeg: de bezoeker
 * staat twee kliks verder en de parameters staan al lang niet meer in de
 * adresbalk. Zou de bron per aanroep opnieuw uit de URL gelezen worden, dan
 * kregen de links op elke pagina ná de landing niets mee — precies de bug die
 * D-96 dicht, opnieuw ingebouwd, één laag hoger.
 *
 * Op modulenivo en niet in een ref, om dezelfde reden als bij
 * `attribution-capture.tsx`: de root layout overleeft soft navigation, maar de
 * component eronder hoeft dat niet te doen om deze waarde te mogen houden.
 * Geheugen, geen opslag — er gaat hier niets naar een schijf.
 */
let landingSearch: string | null = null;

/**
 * De href zoals hij uit de build kwam, per anker.
 *
 * WAAROM DE ORIGINELE BEWAARD WORDT IN PLAATS VAN OP DE HUIDIGE DOOR TE
 * BOUWEN. Elke pas wordt zo opnieuw uitgerekend vanaf een vaste bron, en dat
 * maakt hem in twee richtingen juist: erbij zetten kan, en er weer AFHALEN ook.
 * Dat tweede is geen luxe — het is de enige manier waarop een weigering
 * halverwege het bezoek nog effect heeft op links die al gepatcht waren. Zou de
 * pas op de vorige uitkomst doorbouwen, dan is wat er eenmaal op staat er niet
 * meer af te krijgen, want `withCampaignParams` overschrijft per contract niets.
 *
 * Meteen ook het antwoord op de vraag die anders was blijven liggen: een
 * parameter die de link ZELF al droeg (`plan`, een actiecode) zit in het
 * origineel en overleeft dus elke pas, terwijl wat wij toevoegden weer weg kan.
 *
 * Een WeakMap, zodat een anker dat React weggooit ook hier verdwijnt.
 */
const originalHref = new WeakMap<HTMLAnchorElement, string>();

export function PlatformHandoverLinks() {
  const pathname = usePathname();

  useEffect(() => {
    if (landingSearch === null) landingSearch = window.location.search;

    const apply = (cookiebot: Parameters<Parameters<typeof onCookiebotConsent>[0]>[0]) => {
      // De keuze van het PLATFORM telt hier net zo hard mee als die van
      // Cookiebot, en `effectiveConsent` is de plek die dat al weet: een
      // bezoeker die op mijn.letsdog.nl koos, komt hier binnen met een
      // `ld_consent` en een Cookiebot die van niets weet. Waarom het rauwe
      // record er als TWEEDE bron naast staat — een weigering die niets toestaat
      // valt uit `effectiveConsent` zodra Cookiebot ontbreekt — staat bij
      // `handoverConsentFrom`.
      const state = handoverConsentFrom(effectiveConsent(cookiebot), readConsentCookie());

      const params = campaignParamsForHandover({
        search: landingSearch ?? "",
        // Per klikmoment lezen en niet cachen, om dezelfde reden als de
        // CTATracker: het record kan tussendoor versmald of gewist zijn.
        stored: readAttributionCookie(),
        consent: state,
      });

      for (const anchor of document.querySelectorAll("a[href]")) {
        if (!(anchor instanceof HTMLAnchorElement)) continue;
        // `getAttribute` en niet `.href`: die tweede is al geresolveerd tot een
        // absolute URL, en dan zou een relatieve link stilzwijgend absoluut
        // worden gemaakt in de DOM.
        const current = anchor.getAttribute("href");
        if (current === null) continue;

        let source = originalHref.get(anchor);
        if (source === undefined) {
          source = current;
          originalHref.set(anchor, source);
        }

        const next = withCampaignParams(source, params, window.location.href);
        if (next !== current) anchor.setAttribute("href", next);
      }
    };

    // METEEN EEN PAS, VOORDAT ER OP TOESTEMMING GEWACHT WORDT — en dit is geen
    // optimalisatie maar dekking. `onCookiebotConsent` levert niets zolang
    // Cookiebot niet bruikbaar is, en dat is precies wat er gebeurt bij een
    // bezoeker met een adblocker: geen banner, geen keuze, geen levering, dus
    // zonder deze regel zouden zijn links nooit gepatcht worden. Juist die
    // bezoeker heeft het nodig, want het platform stelt zijn eigen vraag wél en
    // kan daarna alsnog opslaan.
    //
    // Dat dit de onbeantwoorde stand aanneemt is niet optimistisch maar juist:
    // zolang er geen keuze is, IS er geen keuze. Komt er alsnog een levering
    // met een weigering, dan rekent de pas hierboven vanaf het origineel
    // opnieuw en zijn de parameters er weer af.
    apply(null);
    return onCookiebotConsent(apply);
  }, [pathname]);

  return null;
}
