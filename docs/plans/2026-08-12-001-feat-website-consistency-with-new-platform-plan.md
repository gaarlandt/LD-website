# De website gelijktrekken met het nieuwe platform

**Geschreven 2026-08-12 in een plansessie in LDplatform, bijgewerkt dezelfde dag met Jurs vier
beslissingen. Bestemming: de LDwebsite-repo (`gaarlandt/LD-website`, map `website-redesign/`).
Zelfstandig leesbaar: een sessie die dit uitvoert heeft het gesprek eronder niet nodig.**

Go-live van het platform is **vandaag, 12 augustus 2026, aan het eind van de middag**. Op dat moment
verhuist de klant van `app.letsdog.nl` (WordPress, BuddyBoss, LearnDash, WooCommerce, Mollie) naar
`mijn.letsdog.nl` (Expo-webapp op Supabase, Stripe). De marketingsite beschrijft op tientallen
plekken nog de oude wereld.

**Dit wordt ÉÉN taak en ÉÉN PR in de website-repo, die alles in één keer omzet** (Jur, 2026-08-12).
Er is geen fasering en geen "dit mag vooruit, dat wacht op het go-moment".

**De poort is er AL af, en dat haalt de enige echte volgordebeperking weg.** T-540 heeft de Basic
Auth vanochtend uit beide Workers gehaald (bundel A6, een dag eerder dan gepland zodat het bureau
kon meekijken). Zelf nagemeten op 2026-08-12: `mijn.letsdog.nl/`, `/login` en
`/checkout?plan=monthly` geven alle drie **200 zonder credentials**. Deze PR kan dus meteen live,
en hoeft op niets te wachten.

**Wat er aan de app-kant nog wél openstaat en deze PR niet raakt:** alle app-routes dragen nog
`X-Robots-Tag: noindex, nofollow, noarchive`. Dat is bewust de tweede helft van stap 9 in
`docs/runbooks/go-live.md` en het is platformwerk, geen websitewerk.

Alles hieronder is gemeten aan de bron: aan de bestanden in de website-repo, aan de code van het
platform, en aan de productiedatabase van het platform.

---

## 0. Wat er al ligt

**Het GA4- en checkoutlink-plan**, `docs/plans/2026-08-06-001-feat-ga4-platform-cutover-plan.md` in
de website-repo, is implementation-ready en **niet uitgevoerd** (gemeten:
`components/sections/pricing-data.ts` draagt nog `add-to-cart=2234`). Het heeft zes eenheden, W1 tot
en met W6. Drie ervan horen nu in dezelfde PR als de rest van dit document:

- **W3** (de checkoutlinks) — Jur wil dit expliciet in deze taak.
- **W4** (`mijn.letsdog.nl` toevoegen aan `TRACKED_HOSTS` in `lib/cta-destination.ts`) — **verplicht
  samen met W3.** Zonder W4 valt de attributie van elke checkout-klik weg op het moment dat W3
  landt, want de tracker kent de nieuwe host niet.
- **W1 en W2** (bedragen exclusief btw, eigen SKU's in plaats van de WooCommerce-product-id's) —
  neem mee als de tijd het toelaat. Ze staan los van welke omgeving live is en breken niets als ze
  later komen, maar ze zitten in dezelfde twee bestanden, dus het is goedkoper om ze nu mee te doen
  dan er een tweede PR voor te openen.
- **W5 en W6** (het cutoverdocument, en de oude WooCommerce-tracking in PHP uitzetten) — **na** de
  go-live. W6 is bovendien geen code in deze repo.

**De cookieverklaring** is T-25 in de website-loop. De volledige vervangende tekst ligt klaar:
`Docs_Dev_LD_Rebuild/cookieverklaring-2026-08-12-vervangende-tekst.md`. Neem die tekst over, schrijf
geen tweede versie. **Hij hoort in deze PR**, samen met de footerlink die hij belooft (U8).
`privacy@letsdog.nl` bestaat, bevestigd door Jur op 2026-08-12, dus dat is geen voorwaarde meer.

**De accountverwijderknop** (bevinding D1) is géén websitewerk. Die wordt gebouwd op het platform en
staat als eigen taak in de LDplatform-loop, met hoge prioriteit. Zie sectie 5.

---

## 1. De lijst

### A. Betaling en abonnement

| # | Waar | Wat er niet klopt |
|---|---|---|
| A1 | `app/veelgestelde-vragen/faq-data.ts:58` en `app/prijzen/page.tsx:33` | "Via Mollie accepteren we iDEAL en de creditcard." Mollie is weg. Het is Stripe, en het aanbod is ruimer: iDEAL, creditcard en SEPA-incasso. |
| A2 | `faq-data.ts:62` en `app/prijzen/page.tsx:37` | "Waarom wordt er eerst €0,10 afgeschreven?" Dat bedrag en die uitleg (Mollie, doorlopende machtiging) horen bij de oude wereld. Het is **€0,01**, het komt van Stripe zelf, en het **geldt alleen bij het jaarabonnement**. |
| A3 | dezelfde twee regels | De uitleg suggereert dat de verificatiebetaling voor beide abonnementen geldt. Onwaar. **Gemeten in `supabase/functions/submit-checkout/stripe.ts`:** jaar loopt via een SetupIntent (Stripe int 1 cent en boekt die meteen terug, mandaat klaar, na 7 dagen de volle incasso), maand via een losse PaymentIntent voor het volle bedrag (direct EUR 19,99, geen cent ervoor). Een zoek-en-vervang van 0,10 naar 0,01 levert hier dus een onjuiste zin op. |
| A4 | `faq-data.ts:51` | "Je betaalt pas na 7 dagen, dus de eerste 7 dagen zijn vrijblijvend", onder de vraag over beide abonnementen. De proef geldt alleen bij jaar. Het platform zegt het zelf goed: "Maandelijks € 19,99 zonder proefperiode, of jaarlijks € 119 met 7 dagen gratis proberen". |
| A5 | `faq-data.ts:77` | "Betaalinformatie wordt uitsluitend verwerkt via Mollie." Stripe. |
| A6 | `app/prijzen/page.tsx:18` (meta description) en `public/llms.txt` | "Betalen via Mollie." Makkelijk te missen: de een is SEO-metadata, de ander is wat AI-crawlers lezen. |
| A7 | `faq-data.ts:55` en `app/prijzen/page.tsx:42,46` | De opzegteksten kloppen inhoudelijk met de code (`cancel-subscription` zet `cancel_at_period_end=true`), maar noemen alleen "de accountinstellingen in de app". Benoem waar dat is. |
| A8 | `components/sections/pricing-data.ts:45,65` en `:47,70` | De `ctaHref`-waarden wijzen naar de WooCommerce-checkout en de `productId`-waarden zijn WooCommerce-product-id's. W3 en W2 van het GA4-plan; **W3 zit in deze PR**. |

### B. Waar de app woont

| # | Waar | Wat er niet klopt |
|---|---|---|
| B1 | `components/layout/navbar.tsx:127` en `:158` | Beide inlogknoppen (desktop "Inloggen", mobiele "Login"-pil) wijzen naar `https://app.letsdog.nl`. **Dit staat in geen enkele eenheid van het GA4-plan** en is dus het gat dat deze taak dicht. |
| B2 | `faq-data.ts:23` | "De web app is nu live op app.letsdog.nl." |
| B3 | `public/llms.txt:3` | "De web app draait op app.letsdog.nl." |
| B4 | `content/privacybeleid.md:30` | "de webapplicatie, waaronder app.letsdog.nl". (Dezelfde regel in `content/cookieverklaring.md:16` wordt door T-25 vervangen.) |
| B5 | `lib/cta-destination.ts:19` | `TRACKED_HOSTS` kent `mijn.letsdog.nl` niet. W4, **verplicht in deze PR** omdat W3 erin zit. |
| B6 | `app/contact/contact-content.tsx:134` en `app/over-ons/page.tsx:245` | `app.letsdog.nl/consult/`. Renderen nu niet (`CONSULT_AVAILABLE = false`), maar de vlag gaat rond 18 augustus weer aan. Staat als T-4 in de website-loop. Zet de URL nu alvast goed of laat T-4 het doen; niet vergeten. |

### C. Wat we beloven maar niet leveren

| # | Waar | Wat er niet klopt |
|---|---|---|
| C1 | `components/sections/pricing-data.ts:42` en `:61` | "Let's dog Community" staat als opsommingsteken in **beide** betaalde abonnementen. De community bestaat niet bij lancering: op het platform draagt `nav.community` de tag "Later" en is het een gedimd item, net als Shop en Persoonlijk consult (spec-fase 5, Circle.so). **BESLIST door Jur 2026-08-12: de community gaat eruit.** |
| C2 | `lib/structured-data.ts:87` | De `Product`-beschrijving in de JSON-LD noemt de community. Dit is wat Google leest en toont. |
| C3 | tien plekken in de marketingcopy | `app/layout.tsx:30` en `:38`, `app/page.tsx:14`, `app/manifest.ts:11`, `components/sections/final-cta.tsx:19`, `components/sections/pricing.tsx:33`, `components/sections/hope.tsx:28`, `app/over-ons/page.tsx:235`, `app/veelgestelde-vragen/faq-data.ts:15`, `public/llms.txt:3`. |
| C4 | `components/layout/footer.tsx:95` en `:110` | De footer linkt naar Google Play en de App Store, maar dat zijn de apps van de **oude** omgeving. De nieuwe codebase gaat pas in fase 3 naar de stores. **BESLIST door Jur 2026-08-12: de badges blijven staan, de links gaan eraf, en er komt "Binnenkort beschikbaar" bij.** |
| C5 | `faq-data.ts:19` | "Je kunt ook inloggen via de mobiele app als je video's in het veld wilt bekijken." |
| C6 | `faq-data.ts:73` | "Voor offline gebruik kun je sommige video's downloaden via de mobiele app (iOS/Android)." Het platform zegt zelf: "Nog niet. Offline gebruik is er bij de lancering niet." |

### D. Juridisch

De acht juridische pagina's in `content/*.md` zijn robuust: ze beschrijven de dienst in categorieën
("betaalprovider", "platformsoftware") en niet in merknamen, dus ze verouderen nauwelijks. Vier
dingen springen eruit.

| # | Waar | Wat er niet klopt |
|---|---|---|
| D1 | `content/privacybeleid.md:231` | "Gebruikers kunnen accountverwijdering rechtstreeks vanuit de app starten. De app moet hiervoor een zichtbare accountverwijderingsoptie bevatten." Het platform heeft die knop niet: in de hele Nederlandse tekstbundel staat geen enkele string voor het verwijderen van een account (wel voor een hond, wel voor een registratie). **BESLIST door Jur 2026-08-12: de knop wordt gebouwd op het platform.** Zolang dat niet live is, belooft deze paragraaf iets dat er niet is; zie U4 voor de tussentekst en sectie 5 voor de bouwtaak. |
| D2 | `content/algemene-voorwaarden.md:51` | "Betalingen verlopen via externe betaalproviders of via de webomgeving." Correct maar stil over de **doorlopende SEPA-machtiging** die bij iDEAL wordt afgegeven en waarmee later automatisch geïncasseerd wordt. Dat is precies wat er nu gebeurt en het is wat een klant vooraf hoort te weten bij automatische verlenging. |
| D3 | `content/privacybeleid.md` §7 en §9 | Sinds 2026-08-08 is er een verwerking bij die nergens beschreven staat: **server-side conversiemeting**. Het platform stuurt bij elke betaalde factuur gegevens naar Meta (Conversions API, dataset 958837033882897, live gemeten 2026-08-11) en naar Google (GA4 Measurement Protocol). Dat is een doorgifte aan twee Amerikaanse partijen buiten de browser om, dus de cookieverklaring dekt hem niet. |
| D4 | `content/privacybeleid.md:11,13,31,39` en §4, §12 | Het document is geschreven rond een iOS- en Android-app die nog niet bestaat, inclusief drie alinea's over Apple's App Tracking Transparency. Niet fout (vooruitkijkend geformuleerd), wel de verkeerde dienst als hoofdzaak. Lage prioriteit, opschonen bij de volgende juridische ronde. |
| D5 | `content/cookieverklaring.md:48-52` | TikTok Pixel, Hotjar, WooCommerce, Mollie, BuddyBoss, LearnDash, WordPress. Geen daarvan draait nog. Al gedekt door T-25. |

### E. Klein

| # | Waar | Wat |
|---|---|---|
| E1 | `lib/structured-data.ts:32` | `contactPoint.email` is `mail@letsdog.nl`, terwijl elke juridische pagina `support@letsdog.nl` gebruikt. Dit is wat Google publiceert. |
| E2 | `components/sections/puppyagenda/curriculum.ts`, `phases.tsx:13` | De site toont zes fases met eigen namen; het platform toont er negentien (Voorbereiding, Week 8 t/m Week 23, Puberteit, Algemeen Puppy). Gemeten op productie. **BESLIST door Jur 2026-08-12: blijft zoals het is.** Niets doen. |
| E3 | `components/sections/puppy-agenda-teaser.tsx:93` | "Meer dan 130 lessen". Gemeten op productie: 169 gepubliceerde items. Klopt en is voorzichtig. Niets doen, of ophogen. |
| E4 | diverse `lib/*.ts` comments | "Let's Dog" met hoofdletter D in code-commentaar. De merknaam is "Let's dog". Alleen commentaar. Meelifter. |

---

## 2. De uitvoering

Zeven eenheden, allemaal in één PR. De vervangende teksten zijn letterlijk over te nemen en
geschreven **zonder kastlijntje**, want dat is de huisregel voor klantzichtbare tekst.

### U1. Betaling: Mollie eruit, Stripe erin, en de cent kloppend maken

**Bestanden.** `app/veelgestelde-vragen/faq-data.ts`, `app/prijzen/page.tsx`, `public/llms.txt`.

**Let op.** `app/prijzen/page.tsx` heeft zijn **eigen** FAQ-lijst, los van `faq-data.ts`. Twee vragen
staan in allebei de bestanden met bijna, maar niet exact, dezelfde tekst. Werk ze allebei bij en houd
ze gelijk, anders leest een bezoeker twee verschillende antwoorden op dezelfde vraag.

> **Correctie bij de uitvoering (2026-08-12, gevonden in de code-review).** De reden die hierboven
> stond klopte niet: de lijst in `app/prijzen/page.tsx` voedt **geen** JSON-LD. Die pagina rendert
> alleen `productLd(tiers)`; `faqPageLd` wordt uitsluitend uit `app/veelgestelde-vragen/faq-data.ts`
> gebouwd (en uit de eigen lijst van /partners). De twee lijsten gelijk houden blijft nodig, maar om
> de gewone reden — anders spreekt de site zichzelf tegen — niet vanwege structured data.

**Betaalmethodenvraag** (beide bestanden):

> **Via welke betaalmethoden kan ik betalen?**
> Betalen gaat via Stripe. Je kunt kiezen uit iDEAL, creditcard en SEPA-incasso. Betaal je met
> iDEAL, dan geef je bij die betaling meteen een machtiging af waarmee we de verlenging later
> automatisch incasseren.

**Verificatievraag** (beide bestanden). Dit is de vraag die naar 0,01 gaat, en tegelijk beperkt
wordt tot het jaarabonnement:

> **Waarom zie ik bij het jaarabonnement eerst €0,01 op mijn afschrift?**
> Dat is een controle van je bank, geen betaling. Om de machtiging voor de automatische verlenging
> te kunnen afgeven, schrijft Stripe eenmalig 1 cent af en boekt die direct weer terug. Op je
> afschrift zie je dus 1 cent af en 1 cent terug. Daarna gebeurt er tijdens je proefperiode niets:
> pas na 7 dagen schrijven we het jaarbedrag af. Bij het maandabonnement gebeurt dit niet, daar
> betaal je meteen het maandbedrag.

**Gegevensvraag** (`faq-data.ts`):

> Je gegevens worden veilig opgeslagen en worden nooit verkocht. Je betaalgegevens gaan
> rechtstreeks naar onze betaalprovider Stripe en zijn bij ons nooit zichtbaar.

**Prijsvraag** (`faq-data.ts`), zodat de proef bij het juiste abonnement staat:

> **Wat kost het abonnement?**
> Twee smaken. Flexibel is €19,99 per maand, maandelijks opzegbaar en zonder proefperiode: je
> betaalt direct bij het afsluiten. Early Member is €59 voor het eerste jaar (onze launchprijs,
> daarna €119) en begint met 7 dagen gratis proberen. Zeg je binnen die 7 dagen op, dan betaal je
> niets.

**Opzegvragen** (beide bestanden): vervang "de accountinstellingen in de app" door "je account op
mijn.letsdog.nl, onder Profiel en dan Abonnement". De rest van die antwoorden klopt.

**Meta description** (`app/prijzen/page.tsx:18`): "Betalen via Mollie." wordt "Betalen via iDEAL,
creditcard of SEPA-incasso."

**`public/llms.txt`**: op de Prijzen-regel "Betaling via Mollie." naar "Betaling via Stripe: iDEAL,
creditcard of SEPA-incasso."

### U2. Alles wat naar app.letsdog.nl wijst, naar mijn.letsdog.nl

**Bestanden.** `components/layout/navbar.tsx` (regel 127 en 158), `app/veelgestelde-vragen/faq-data.ts:23`,
`public/llms.txt:3`, `content/privacybeleid.md:30`.

De twee inlogknoppen zijn de belangrijkste: zonder deze wijziging stuurt de site elke bestaande klant
terug naar de omgeving die hij net verlaten heeft.

**FAQ-antwoord** (`faq-data.ts:23`):

> De web app is live op mijn.letsdog.nl. Meld je aan en begin direct.

### U3. De checkoutlinks en de attributie (W3 plus W4)

**Bestanden.** `components/sections/pricing-data.ts`, `lib/cta-destination.ts` plus zijn test.

| Van | Naar |
|---|---|
| `https://app.letsdog.nl/checkout/?add-to-cart=2234&quantity=1` | `https://mijn.letsdog.nl/checkout?plan=monthly` |
| `https://app.letsdog.nl/checkout/?add-to-cart=2233&quantity=1` | `https://mijn.letsdog.nl/checkout?plan=yearly` |

De parameter heet `plan` en accepteert alleen `monthly` of `yearly`. **Stuur altijd een van die twee
mee.** `/plan-keuze` bestaat sinds vanochtend niet meer (T-543 is uitgevoerd in bundel A6; nagemeten:
die route geeft byte-identiek dezelfde SPA-shell als een willekeurig verzonnen pad, dus hij is
werkelijk weg) en de checkout draagt de plankeuze nu zelf. Wie al ingelogd is komt op de app-home in
plaats van de checkout, en dat is bedoeld gedrag.

**Gebruik `&code=` nog niet** in gepubliceerde campagne-URL's. De checkout negeert hem vandaag
stilzwijgend, en dan betaalt de klant de volle prijs.

Voeg in `lib/cta-destination.ts` `mijn.letsdog.nl` toe aan `TRACKED_HOSTS` met dezelfde padsplitsing
als `app.letsdog.nl` heeft (`/checkout*` wordt `"checkout"`, de rest `"app"`). Laat `app.letsdog.nl`
staan zolang die host bestaat. De waarden `"checkout"` en `"app"` zijn geregistreerde GA4-dimensies
en veranderen niet.

### U4. Wat we niet leveren, niet verkopen

**De community eruit** (beslissing van Jur, 2026-08-12):

- `components/sections/pricing-data.ts:42` en `:61`: haal "Let's dog Community" uit beide
  abonnementen. Zet er niets voor terug wat er niet is. Wil je de rij vullen, dan is "Nieuwe lessen
  elke week" of "Je eigen puppyagenda, week voor week" wél waar.
- `lib/structured-data.ts:87`: laat de communityzin vallen.
**De dertien vervangende teksten staan hieronder letterlijk en zijn op 2026-08-12 door Jur
goedgekeurd.** Neem ze over zoals ze er staan; er hoeft niets aan bedacht te worden.

| # | Plek | Nieuwe tekst |
|---|---|---|
| 1 | `pricing-data.ts:42` (Flexibel) | derde bullet wordt `Weekplan op de leeftijd van je pup` |
| 2 | `pricing-data.ts:61` (Early Member) | derde bullet wordt `Weekplan op de leeftijd van je pup` |
| 3 | `lib/structured-data.ts:87` | "Volledige puppycursus met videolessen, audiolessen, checklists en een puppyagenda die meeloopt met de leeftijd van je pup. Twee manieren om te starten." |
| 4 | `app/layout.tsx:30` | "Nieuwe pup in huis en even de kluts kwijt? Let's dog geeft je week voor week een plan, videolessen van gecertificeerde trainers en rust in wat je vandaag te doen staat." |
| 5 | `app/layout.tsx:38` (OG) | "Meer rust en vertrouwen, samen met je pup. Videolessen, audiolessen en een puppyagenda die meeloopt." |
| 6 | `app/page.tsx:14` | woordelijk gelijk aan 4. Houd ze gelijk. |
| 7 | `app/manifest.ts:11` | "Rust en vertrouwen met je pup: week voor week een plan, videolessen van gecertificeerde trainers en een agenda die meeloopt met zijn leeftijd." |
| 8 | `public/llms.txt:3` | "Let's dog is een Nederlands platform voor welzijnsgerichte puppytraining: een dagelijkse puppyagenda, videolessen van gecertificeerde hondengedragstherapeuten en audiolessen. De web app draait op mijn.letsdog.nl." |
| 9 | `hope.tsx:26-31` | hele kaart. Icoon `Users` wordt `Headphones`. Kop: "Luister onderweg, lees terug wanneer je wilt." Tekst: "Audiolessen voor tijdens het uitlaten, en een bibliotheek waarin je elke les terugvindt wanneer je hem nodig hebt." |
| 10 | `pricing.tsx:33` | "Krijg direct toegang tot de volledige puppycursus, praktische video's, audiolessen en checklists. Alles stap voor stap, zodat je weet wat je pup nodig heeft in elke fase." |
| 11 | `final-cta.tsx:19` | "Meld je aan en start direct. De puppyagenda en je eerste videoles staan voor je klaar." |
| 12 | `over-ons/page.tsx:233-236` | "Meld je aan en start direct met de puppyagenda en de videolessen." |
| 13 | `faq-data.ts:15` | "Let's dog is een web app voor puppy-eigenaren. Je vindt er een puppyagenda, videolessen van gecertificeerde trainers en audiolessen voor onderweg. Alles op één plek, stap voor stap opgebouwd." |

Twee dingen die je NIET aanraakt: de juridische pagina's in `content/` (die beschrijven het bereik
van de voorwaarden en zijn bewust vooruitkijkend), en de partnerpagina (daar gaat "community" over
het publiek van de partner).

**De app-badges** (beslissing van Jur, 2026-08-12): de twee badges blijven staan in de footer, de
`<a href>` gaat eraf, en er komt "Binnenkort beschikbaar" bij. Er staat al een component klaar voor
precies dit: `components/layout/app-store-coming-soon.tsx` is de popover die tot 2 juli in gebruik
was en bewust bewaard is ("Kept on purpose"). Die weer inhangen is de goedkoopste weg, en dan voor
allebei de badges in plaats van alleen de Apple-badge. Let bij het omzetten van `<a>` naar `<button>`
op de bestaande hoogtecompensatie: Apple staat op `h-11`, Google op `h-[4.09rem]`, en die verhouding
moet blijven (de reden staat in het commentaar erboven).

**De twee FAQ-antwoorden** (`faq-data.ts:19` en `:73`):

> **Heb ik een smartphone nodig?**
> Nee. Let's dog werkt in elke browser, op je telefoon, tablet of laptop. Je kunt de website op je
> beginscherm zetten, dan opent hij als een app. Een echte app voor iOS en Android komt later.

> **Werkt de app ook offline?**
> Nog niet. Je hebt een internetverbinding nodig. Offline lessen bekijken staat op de planning maar
> is er bij de start niet.

### U5. Het privacybeleid

**Bestand.** `content/privacybeleid.md`.

**D1, de verwijderknop.** De knop wordt gebouwd (zie sectie 5), maar staat er vandaag niet. Zolang
dat zo is belooft §14 iets dat het product niet doet, en dat is precies het soort zin waarop een
klacht bij de Autoriteit Persoonsgegevens standhoudt. Zet er de overbruggingstekst neer, ter
vervanging van de eerste twee alinea's van §14:

> Gebruikers kunnen hun account verwijderen vanuit hun eigen accountinstellingen, of verwijdering
> aanvragen via support@letsdog.nl. Bij een aanvraag per e-mail bevestigen wij de aanvraag,
> controleren wij de identiteit van de aanvrager en verwijderen wij daarna het account met de
> daaraan gekoppelde gegevens.

Die formulering is waar in beide toestanden en hoeft dus niet nog een keer om zodra de knop live is.

**D3, de server-side conversiemeting.** Voeg aan de opsomming in §7 toe:

> - advertentie- en analyseplatforms die wij informeren over een geslaagde aankoop, ook zonder
>   cookie: wij sturen daarvoor versleutelde gegevens vanaf onze eigen server naar Meta en Google,
>   uitsluitend om te meten welke advertentie tot een aankoop leidde.

En noem in §9 de landen concreet in plaats van alleen naar waarborgen te verwijzen.

**Werk de datumregel bij** (`lead:` in de frontmatter én de losse regel 9, allebei "17 juni 2026").

### U6. De algemene voorwaarden: de machtiging benoemen

**Bestand.** `content/algemene-voorwaarden.md`, §5. Voeg toe na de bestaande alinea over betalingen:

> Bij betaling met iDEAL geeft de gebruiker tegelijk een doorlopende SEPA-machtiging af. Daarmee
> incasseert Let's dog de verlenging automatisch van dezelfde rekening. De gebruiker ziet vooraf in
> de checkout welk bedrag wanneer wordt afgeschreven en kan de machtiging stopzetten door het
> abonnement op te zeggen.

Werk ook hier de datumregel bij.

### U8. De cookieverklaring en de footerlink die hij belooft

**Bestanden.** `content/cookieverklaring.md`, `components/layout/footer.tsx`.

**De tekst.** Vervang de hele inhoud van `content/cookieverklaring.md` door de tekst uit
`Docs_Dev_LD_Rebuild/cookieverklaring-2026-08-12-vervangende-tekst.md`, vanaf de regel "DE TEKST ZELF
(vanaf hier kopiëren)". Alles daarin is op 2026-08-12 in een echte browser nagemeten op beide hosts.
De frontmatter (`title`, `description`, `lead`) blijft de vorm houden die de andere zeven juridische
pagina's ook hebben.

**De footerlink.** De nieuwe tekst belooft twee routes om een keuze terug te draaien, en één daarvan
is een link "Cookie-instellingen" in de footer van letsdog.nl die **nog niet bestaat**. Gecontroleerd
op 2026-08-12: hij staat in geen van beide loop-registers, dus hij is nooit gebouwd én nooit
geregistreerd. Zonder hem belooft de verklaring iets dat er niet is, en dat is precies het soort zin
waar een toezichthouder op afgaat.

Vorm: een tekstlink in de bestaande footer-navigatiekolom, naast de andere juridische links, die
Cookiebots eigen voorkeurenvenster opnieuw opent (`Cookiebot.renew()`). Dat is één regel en het is de
route die Cookiebot zelf voorschrijft. Let op: `window.Cookiebot` bestaat pas nadat het script
geladen is, dus de link moet fail-loud zijn (niets doen plus een console-melding als het object er
niet is) en niet stil een dode klik opleveren.

De tweede route die de tekst noemt is het voorkeurenscherm op het platform, en dat bestaat al
(`/cookievoorkeuren` op mijn.letsdog.nl, gebouwd in T-456, sinds vanochtend ook bereikbaar zonder
sessie). Daar hoeft niets voor te gebeuren.

### U7. Klein

`lib/structured-data.ts:32`: kies één contactadres en gebruik dat overal; elke juridische pagina
zegt `support@letsdog.nl`. Merknaam in code-comments naar "Let's dog". Eventueel "Meer dan 130
lessen" ophogen (169 staat er echt).

---

## 3. Wat je niet aanraakt

- `link_location` en `link_destination` hernoemen. Geregistreerde GA4-dimensies.
- De eventnamen `view_item_list`, `begin_checkout` en `cta_clicked`.
- `app.letsdog.nl` uit `TRACKED_HOSTS` halen zolang die host bestaat.
- "Mollie" in `docs/plans/*.md` en `COPY-DECK.md`. Dat zijn historische documenten en die beschrijven
  wat er toen was. Wijzig alleen wat een bezoeker of crawler ziet: `app/`, `components/`, `content/`,
  `lib/` en `public/`.
- De zes marketingfases (E2). Beslist: blijft.

---

## 4. Verificatie

- De twee FAQ-bronnen voeden allebei JSON-LD. Controleer in de Rich Results Test dat de FAQ-markup
  gelijk is aan wat op het scherm staat, en dat geen `Product`-offer nog een functie noemt die niet
  geleverd wordt.
- Klik na deploy de twee prijskaartknoppen echt aan en kom uit op de checkout van
  `mijn.letsdog.nl`, niet op een inlogvenster van de server.
- Grep als sluitstuk over `app/ components/ content/ lib/ public/` op `Mollie`, `0,10`,
  `app.letsdog.nl` en `ommunity`. Alles wat overblijft is bewust.

---

## 5. Wat hierbuiten valt en op het platform gebeurt

**De accountverwijderknop.** Beslist door Jur op 2026-08-12: wordt gebouwd in de app, bij Abonnement
naast Opzeggen. Staat als eigen taak met hoge prioriteit in de LDplatform-loop. De website hoeft er
niets voor te doen behalve de overbruggingstekst uit U5.

**De consult-URL** (B6) zodra `CONSULT_AVAILABLE` weer aan gaat, rond 18 augustus. Website-loop T-4.

**W5 en W6** uit het GA4-plan: het cutoverdocument bijwerken, en het GA4-blok in `functions.php` op
de WordPress-omgeving uitzetten zodra de platformmeting bewezen loopt. Niet eerder, anders meet je
even helemaal niets.

**De checkout-terugval** (T-543) samen met het opheffen van `/plan-keuze`.

---

## 6. De meetketen over de cutover heen

Toegevoegd 2026-08-12 op Jurs vraag: loopt het meten door als de klant van de website naar het
platform gaat? Vier kanalen, en ze staan er verschillend voor.

**GA4: gebouwd, geconfigureerd, nooit aangekomen zien.** T-376 in de LDplatform-loop staat op VERIFY
bij Jur. Alles is er: de elf attributiekolommen, de conversietabel met RLS, `invoice.paid` op de
hoofd-endpoint sinds 08-08, en alle vier de Edge-secrets staan sinds 08-10. Wat ontbreekt is puur
bewijs: **er is nog nooit waargenomen dat een `purchase` bij Google aankomt.** De eerste echte
betaling na go-live is het moment om dat te controleren, in GA4 Realtime, niet een dag later.
Aan de websitekant is alles meegenomen in dit plan (W1 tot en met W4).

**Meta: bewezen.** T-434, gemeten 2026-08-11: de Conversions API antwoordde `{events_received: 1}`
op dataset 958837033882897. Dit kanaal hoeft alleen gevolgd te worden, niet gerepareerd.

**De twee overdrachtscookies: werken, en zijn vandaag nog uitgebreid.** `ld_consent` (toestemming,
nieuwste wint) en `ld_attribution` (campagne, eerste aanraking wint) worden door beide hosts
geschreven en gelezen. De consentketen is vanochtend nog afgerond en live geverifieerd
(LDplatform-bundel Y, PR #317 en #318). Hier is niets te doen; wel niet aanraken zonder de
contracten in de kennishub te lezen.

**PostHog: hier zit een gat, en het is niet klein.** Gemeten 2026-08-12: de website stuurt naar
project `phc_Uxz55z5X…`, het platform naar `phc_Bz2rBnfM…`. Dat zijn **twee verschillende
projecten**. Bovendien draait het platform de React-Native-SDK, die de cross-subdomain-cookie van
posthog-js sowieso niet leest, dus ook één project zou de bezoeker niet doorgeven. Gevolg: de vraag
"hoeveel van de mensen die de prijzenpagina zagen, rekenden af" is in PostHog niet te beantwoorden.
**Dit raakt de omzetmeting niet** (GA4 en Meta lopen server-side langs een andere weg), alleen het
productgedrag. Staat als T-542 in de LDplatform-loop, met de vraag of we dit accepteren of
samenvoegen. Voor deze PR is er één ding te doen: de openstaande regel in `docs/CUTOVER.md` over het
laten `identify`-en van `app.letsdog.nl` klopt niet meer en moet naar T-542 verwijzen in plaats van
naar een oplossing die er niet komt.
