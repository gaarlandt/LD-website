---
title: GA4 en de checkout-links naar het nieuwe platform - Plan
type: feat
date: 2026-08-06
---

# GA4 en de checkout-links naar het nieuwe platform - Plan

**Voor:** een sessie die in deze repo werkt. Dit document is zelfstandig: je hebt de discussie
waaruit het voortkomt niet nodig.

**Waarom dit bestaat.** Let's Dog verlaat WooCommerce. De betaling verhuist van
`app.letsdog.nl/checkout/` (WordPress plus WooCommerce) naar `mijn.letsdog.nl/checkout` (het nieuwe
platform). Deze site wijst nog naar de oude checkout en stuurt GA4-bedragen die straks niet meer
kloppen met wat de andere kant meet. Dit plan trekt die twee kanten gelijk.

**De andere helft.** Het platform bouwt tegelijk de server-side conversiemeting: elke betaalde
factuur stuurt `purchase`, `subscription_renewal` of `refund` naar GA4 via de Measurement Protocol.
Dat plan staat in de andere repo, als
`Code_LD_Platform/docs/plans/2026-08-06-002-ga4-funnelmeting-purchase-trial-en-attributie-plan.md`.
Je hebt het niet nodig om dit uit te voeren, met een uitzondering: de tabel onder "Het gedeelde
artikelcontract" hieronder geldt voor beide kanten en dit document is er de eigenaar van.

**Wat er niet in zit.** De Facebook-pixel, Meta's Conversions API en Google Consent Mode v2. Alle
drie apart besloten werk.

---

## Achtergrond die je nodig hebt

Deze site draagt vandaag al een werkende GA4-funnelkop:

- `components/sections/pricing-view-tracker.tsx` vuurt `view_item_list` als de prijssectie in beeld
  komt.
- `components/sections/plan-cta.tsx` vuurt `begin_checkout` op de klik van een prijskaart-knop, met
  `currency`, `value`, `billing_period` en een `items`-array.
- `components/analytics/cta-tracker.tsx` plus `lib/cta-destination.ts` vuren `cta_clicked` met
  `link_location` en `link_destination`.

Wat ontbreekt is de staart: `purchase`. Die vuurde tot nu toe in PHP op de WooCommerce-bedankpagina
en verdwijnt met WordPress. Het platform neemt hem over, server-side.

Twee dingen die je moet weten voordat je iets aanraakt:

**`link_location` en `link_destination` zijn geregistreerde GA4 custom dimensions.** Een nieuwe
waarde toevoegen mag, de dimensie hernoemen niet. Dat staat ook in `docs/analytics-events.md` en in
de repo-CLAUDE.md.

**De DNS-cutover van deze site is al gebeurd** (2 juli 2026, zie `docs/CUTOVER.md`). De cutover waar
dit document over gaat is een andere: het moment waarop de betaling van WooCommerce naar het platform
verhuist. Verwar de twee niet.

---

## Het gedeelde artikelcontract

Beide kanten moeten identieke artikelvelden sturen, anders valt de funnel `view_item_list` naar
`begin_checkout` naar `purchase` in GA4 uit elkaar: item-scoped rapporten koppelen op `item_id`.

| Veld | Maandabonnement | Jaarabonnement |
|---|---|---|
| `item_id` | `ld_maand` | `ld_jaar` |
| `item_name` | `Maandabonnement` | `Jaarabonnement` |
| `item_variant` | `Maand` | `Jaar` |
| `item_category` | `abonnement` | `abonnement` |
| `price` (excl. BTW) | `16.52` | `48.76` bij early-bird, `98.35` daarna |
| `quantity` | `1` | `1` |

`billing_period` blijft op eventniveau staan met de bestaande waarden `monthly` en `yearly`. Die
parameter bestaat al en wordt niet vervangen door `item_variant`; ze bestaan naast elkaar.

Twee dingen om te weten bij het aflezen:

De bedragen zijn exclusief 21 procent BTW. De klant ziet EUR 19,99 en EUR 59; GA gaat de zuivere
omzet tonen. Dat is een bewuste breuk met het WooCommerce-tijdperk, waar `purchase` het bedrag
inclusief BTW stuurde. De reden is dat Google Ads op deze waarde biedt en een lagere, echte waarde
een eerlijker acquisitierekensom geeft.

Deze site kan alleen de Nederlandse lijstprijs sturen, terwijl het platform per land het werkelijke
BTW-tarief van Stripe leest. Voor een Belgische klant lopen `begin_checkout` en `purchase` dus
uiteen. Dat is geaccepteerd; `begin_checkout` is een intentie, geen transactie.

---

## Implementatie-eenheden

### W1. Bedragen naar exclusief BTW

**Doel.** `begin_checkout` stuurt de omzetwaarde, niet de consumentenprijs.

**Bestanden.** `components/sections/pricing-data.ts`, `components/sections/plan-cta.tsx`,
`components/sections/pricing-toggle-card.tsx`, plus de bijbehorende tests.

**Aanpak.** `priceValue` is vandaag de prijs inclusief BTW en wordt op twee plekken gebruikt: door
`plan-cta.tsx` als analytics-waarde en door `pricing-toggle-card.tsx` om afgeleide getallen te
tonen (jaartotaal, besparingspercentage, maandequivalent). Die twee mogen niet dezelfde variabele
blijven delen, anders verandert de zichtbare prijs mee.

Splits daarom: de tonende component houdt de prijs inclusief BTW, de analytics-laag krijgt een eigen
veld met de waarde exclusief BTW. Leid het tweede niet af met een deling in de component; zet het als
expliciete waarde in `pricing-data.ts` naast de bestaande, zodat een reviewer beide naast elkaar
ziet.

`listPriceValue` (de doorgestreepte EUR 119) is puur visueel en blijft inclusief BTW.

**Tests.**
- De prijskaarten tonen nog steeds EUR 19,99 en EUR 59, en het jaartotaal en de besparing zijn
  ongewijzigd.
- `begin_checkout` stuurt `value: 16.52` voor maand en `48.76` voor het early-bird-jaar.
- De som van `items[].price` maal `quantity` is gelijk aan `value`.

### W2. Eigen SKU's in plaats van de WooCommerce-ids

**Doel.** De artikel-ids overleven het vertrek van WooCommerce.

**Bestanden.** `components/sections/pricing-data.ts`, `components/sections/plan-cta.tsx`, tests,
`docs/analytics-events.md`.

**Aanpak.** `productId: 2234` en `2233` zijn WooCommerce-product-ids en verdwijnen. Vervang ze door
de waarden uit het artikelcontract hierboven, inclusief `item_name`, `item_variant` en
`item_category`, die nu nog niet allemaal meegestuurd worden.

De comment in `pricing-data.ts` zegt dat het analytics-id naast `ctaHref` staat zodat een
cutover-wissel ze in hetzelfde gebaar meeneemt. Dat klopt en blijft zo: W2 en W3 horen in dezelfde
commit.

Werk `docs/analytics-events.md` bij. Daar staat nu letterlijk dat `item_id` het WooCommerce-product-id
is.

**Gevolg dat je moet accepteren.** De item-historie in GA4 breekt: oude en nieuwe rijen tellen als
verschillende artikelen. Dat is bewust, dit wordt als een nieuwe start behandeld.

**Tests.** `begin_checkout` stuurt de vier artikelvelden met de exacte waarden uit de tabel.

### W3. De checkout-links naar het platform

**Doel.** De prijskaart-knoppen sturen naar de nieuwe checkout.

**Bestanden.** `components/sections/pricing-data.ts`.

**Aanpak.** Vervang `ctaHref`:

| Van | Naar |
|---|---|
| `https://app.letsdog.nl/checkout/?add-to-cart=2234&quantity=1` | `https://mijn.letsdog.nl/checkout?plan=monthly` |
| `https://app.letsdog.nl/checkout/?add-to-cart=2233&quantity=1` | `https://mijn.letsdog.nl/checkout?plan=yearly` |

Geverifieerd: de parameter heet `plan` en accepteert alleen `monthly` of `yearly`; een ontbrekende of
onbekende waarde stuurt de bezoeker door naar de plankeuzepagina.

Twee dingen om te weten. Wie al is ingelogd komt niet op de checkout maar op de app-home; dat is
bestaand en bedoeld gedrag.

En `&code=<campagnecode>` **bestaat nog niet.** Het platformplan bouwt hem (unit U4): de code komt
dan voorgevuld in het codeveld en de klant past hem zelf toe. Zet die parameter dus niet in een
gepubliceerde campagne-URL en niet in `docs/CUTOVER.md` voordat U4 live staat, want vandaag negeert
de checkout hem stilzwijgend en betaalt de klant de volle prijs.

**Timing.** Dit is de enige eenheid die niet vooraf gemerged mag worden. `mijn.letsdog.nl` staat nog
achter een Basic-Auth-poort; een bezoeker die daar nu op klikt krijgt een inlogvenster. W3 gaat live
op het moment dat het platform opengaat, niet eerder.

**Tests.** De prijskaart-knoppen wijzen naar de twee URL's hierboven.

### W4. De attributieregel voor de nieuwe host

**Doel.** Een klik naar de checkout blijft `link_destination: "checkout"` opleveren.

**Bestanden.** `lib/cta-destination.ts`, `lib/cta-destination.test.ts`,
`components/analytics/cta-tracker.tsx` (alleen als de comment daar aanpassing nodig heeft),
`docs/analytics-events.md`, repo-CLAUDE.md.

**Aanpak.** `TRACKED_HOSTS` kent nu drie hosts, en `app.letsdog.nl` wordt op pad gesplitst zodat
`/checkout*` de waarde `"checkout"` krijgt en de rest `"app"`. Voeg `mijn.letsdog.nl` toe met
dezelfde padsplitsing.

Laat `app.letsdog.nl` staan zolang die host nog bestaat. De waarden `"checkout"` en `"app"` blijven
ongewijzigd; dit is een nieuwe host op bestaande waarden, geen nieuwe dimensiewaarde.

**Tests.** Uitbreiden van de bestaande tabelgestuurde tests met de nieuwe host, voor beide paden.

### W5. Het cutover-document

**Doel.** De wissel is uitvoerbaar door iemand die dit plan niet gelezen heeft.

**Bestanden.** `docs/CUTOVER.md`.

**Aanpak.** Voeg een sectie toe voor de platformcutover, los van de DNS-cutover die al gebeurd is.
Daarin: de twee nieuwe URL's letterlijk, de SKU-wissel, de volgorde (W1, W2 en W4 mogen vooruit; W3
gaat op het go-moment), en de handelingen aan Google-kant die niemand in code kan doen. Die staan
onder "Handelingen voor Jur" hieronder; neem ze daar verbatim over.

### W6. WooCommerce-tracking opruimen

**Doel.** Er staat na de cutover geen tweede `purchase`-implementatie meer naar dezelfde GA4-property
te sturen.

**Dit is grotendeels geen code in deze repo.** De GA4-tracking van de oude checkout zit in PHP in het
child theme `buddyboss-theme-child-1.0.0` op `app.letsdog.nl`, ongeveer regel 125 tot 194 van
`functions.php`. Die omgeving is alleen via WordPress-admin of SFTP te bereiken. Zie de handelingen
hieronder.

**Wat wel in deze repo hoort.** Zodra `app.letsdog.nl` uit de lucht is: de host uit `TRACKED_HOSTS`
halen en de padsplitsing opruimen. Doe dat niet eerder; zolang die host bestaat moet de attributie
blijven werken.

**Overlapperiode.** Tussen het live gaan van de platformmeting en het uitzetten van de oude tracking
sturen twee implementaties `purchase` naar dezelfde property, op verschillende schalen (oud inclusief
BTW, nieuw exclusief). Houd ze uit elkaar met de standaarddimensie `hostname` in GA4-rapporten. Hoe
korter die periode, hoe minder je dat hoeft uit te leggen.

---

## Handelingen voor Jur (geen code)

Deze horen in `docs/CUTOVER.md` te landen en zijn niet door een agent uit te voeren.

**In GA4** (Beheer, stream "Website let's dog", stream-id `14294238254`):

1. Voeg `mijn.letsdog.nl` toe aan de domeinlijst onder Tag-instellingen, Je domeinen configureren.
   *Gedaan op 2026-08-06.*
2. Markeer `trial_started` als sleutelgebeurtenis zodra het event minstens een keer binnen is
   (Beheer, Gegevensweergave, Gebeurtenissen, schakelaar Markeren als sleutelgebeurtenis).
   `purchase` staat al gemarkeerd.
3. Maak een Measurement Protocol API secret aan (Beheer, Gegevensstromen, de stream, API-geheimen
   voor Measurement Protocol) en geef die door voor de platformkant.
4. Overweeg de tagnaam te wijzigen. De stream heet inmiddels "Website let's dog", maar de Google-tag
   zelf heet nog "Website The Brink". Dat zijn twee verschillende objecten met een eigen naam.

**In Google Ads** (account `350-389-4674`):

5. Importeer `trial_started` als conversie met telling One conversion. `purchase` bestaat al als
   "Purchase Membership" op Every conversion en blijft ongewijzigd.
6. Let op dat de biedwaarde van `purchase` omlaag gaat zodra de nieuwe meting live is, omdat de
   waarde exclusief BTW wordt. Dat is bedoeld.

**Op app.letsdog.nl** (WordPress, of de partij die daar toegang heeft):

7. Zet het GA4-blok in `functions.php` uit zodra de platformmeting live is. Niet eerder, anders meet
   je even helemaal niets.
8. Controleer of `sign_up` daar nog vuurt. Het hangt aan de queryparameter `?activated=1` uit de
   oude freemium-registratie, en het bedrijf is over op subscription-only. Als dat event al maanden
   nul telt, is het uitzetten geen verlies maar een opruiming. Kijk in GA4 over de laatste 90 dagen.
9. Bewaar een kopie van het oude PHP-blok voordat je het weghaalt, zodat de historie naleesbaar
   blijft.

---

## Wat je niet moet aanraken

- `link_location` en `link_destination` hernoemen. Geregistreerde GA4-dimensies.
- De eventnamen `view_item_list`, `begin_checkout` en `cta_clicked`. Die werken en zijn ingericht.
- `components/analytics/ga4.tsx` en zijn bewuste keuze om de tag niet achter Cookiebot te zetten.
  Dat is een apart, door de eigenaar genomen besluit; verander het niet als bijvangst van dit werk.
- De consent-instellingen. Google Consent Mode v2 is eigen werk en ligt bij Jur.
- `app.letsdog.nl` uit `TRACKED_HOSTS` halen zolang die host bestaat.

---

## Verificatie

Uit `website-redesign/CLAUDE.md`: de gebruikelijke poort van deze repo, groen voor de push.

Specifiek voor dit werk:

- De prijzenpagina toont onveranderd EUR 19,99 en EUR 59. Dat is de belangrijkste regressietest: W1
  raakt de variabele die ook de zichtbare prijs voedt.
- In GA4 DebugView op een preview-URL: `begin_checkout` draagt de vier artikelvelden en de nieuwe
  waarde. Preview-hosts sturen `traffic_type: internal` mee, dus dit vervuilt de rapporten niet.
- De twee checkout-URL's openen op het platform en tonen het juiste plan.
- `cta_clicked` op een link naar `mijn.letsdog.nl/checkout` levert `link_destination: "checkout"`.

---

## Volgorde

W1, W2 en W4 kunnen samen vooruit en mogen gemerged worden voordat het platform live is. Ze veranderen
alleen wat er gemeten wordt, niet waar de klant heen gaat.

W3 gaat live op het go-moment van het platform, geen dag eerder.

W5 rijdt mee met W1, W2 en W4.

W6 begint op het go-moment en loopt door tot `app.letsdog.nl` uit de lucht is.

Raakt de bestaande loop-items T-2 (cutover) en T-6 (utm-parameters op CTA-knoppen). T-6 is
GATED op de cutover en gaat over utm's op de uitgaande knoppen; dat is aanvullend op dit plan, niet
overlappend. Mint eigen taaknummers via `scripts/loop/new.sh` in de werkmap, niet met de hand.
