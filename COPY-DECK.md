# Copy deck — Let's dog website

All the visible text on **4 pages**: Homepage, Prijzen, Puppycursus, Over ons.
(FAQ page, Contact, Rassenkeuze, legal pages, nav & footer are **not** here — out of scope for this round.)

## How to edit

- Each block has a **bold label** (where it appears — *don't edit the label*) and below it the **current text** (edit this freely).
- Just rewrite the words. Ignore the code, line breaks, HTML entities (`&apos;`, `&ldquo;`), and which words are coloured — I re-apply all of that automatically.
- Notes in _italics_ (e.g. _"shown in lime"_) are FYI only — they tell you which part is accented/coloured.
- Leave anything you **don't** want changed exactly as-is. I only touch lines that actually changed.
- `· source:` lines tell me which file a section lives in. Leave them alone.
- When you're done: **save this file and tell me "apply the copy deck."** I'll map every change back to the source and verify it in the preview.

> ⚠️ **Prices** (€19,99 / €59 / €99) and the lines derived from them (per-month, "Bespaar 75%", "€239,88 per jaar") are shown for reference but are **calculated** — changing a headline price auto-updates the rest. Tell me in plain words if you want a price changed; don't hand-edit the derived lines.

---

# 1. Homepage (`/`)

### 1.0 · Search & social listing (SEO)
_· source: `app/page.tsx`_

**Page title (browser tab + Google)**
Let's dog — online puppycursus

**Meta description (Google snippet)**
Nieuwe pup in huis en even de kluts kwijt? Let's dog geeft je week voor week een plan, videolessen van gecertificeerde trainers en een community die je begrijpt.

### 1.1 · Hero (green banner, top)
_· source: `components/sections/hero.tsx`_

**Eyebrow (small label above heading)**
Online puppycursus

**Heading**
Train en leer samen. Duidelijke video’s, direct resultaat, op jullie eigen tempo.
_("samen met je pup." shown in lime green, on its own line)_

**Body**
Een puppy in huis. Geweldig, maar zonder de juiste begeleiding en training, gooit hij zo het hele huishouden overhoop. In onze online puppycursus leer je alle basiscommando’s en krijg je antwoord op al jouw puppyvragen. 

**Button**
Start de cursus vandaag

**Trust line (under the button)**
Al meer dan 500 puppy's op weg geholpen
_("500 puppy's" shown bold)_

### 1.2 · Problem ("Herkenbaar?")
_· source: `components/sections/problem.tsx`_

**Eyebrow**
Herkenbaar?

**Heading**
Een pup is superschattig. Maar kan ook overweldigend zijn.
_(breaks to a second line at "En soms…")_

**Sub-heading**
Heel herkenbaar. Door goede begeleiding, wordt het echt weer overzichtelijk en komt er rust.

**Card 1 — title**
De een zegt dit, de ander dat.

**Card 1 — text**
Iedereen geeft een ander advies en ook online krijg je tien verschillende antwoorden op jouw vragen. Welk advies is betrouwbaar en werkt echt?

**Card 2 — title**
Je pup bijt alleen maar, blaft enorm of slaapt slecht?

**Card 2 — text**
Je doet zo je best, maar je krijgt het gedrag niet onder controle. Je bent moe en twijfelt aan jezelf en vraagt je af of het wel goed gaat komen.

**Card 3 — title**
Je weet niet of je het goed doet.

**Card 3 — text**
Je twijfelt bij elke stap. Is dit gedrag wel oke? Wat kan ik het beste doen?

### 1.3 · Hope ("Wat je krijgt")
_· source: `components/sections/hope.tsx`_

**Eyebrow**
Wat je krijgt

**Heading**
Zo ziet je leven eruit met Let's dog.

**Body**
Geen tegenstrijdige adviezen meer. Gerichte adviezen en training, die je rust, duidelijkheid en vertrouwen geeft. Stap voor stap

**Benefit 1 — title**
Jij weet elke dag wat je doet.

**Benefit 1 — text**
Rust en houvast, in plaats van twijfel. De training en aanpak die stap voor stap met je pup meegroeit.

**Benefit 2 — title**
Duidelijke uitleg van gecertificeerde trainers.

**Benefit 2 — text**
Let’s dog kijkt naar de oorzaken van gedrag en leert je hoe je ermsamen de video’s ee om moet gaan. Geen quickfixes, maar echte resultaten.

**Benefit 3 — title**
Leer met het hele gezin.

**Benefit 3 — text**
Bekijk samen de video’s zodat iedereen op dezelfde wijze traint en opvoedt.

**Benefit 4 — title**
Een community waar je echt wat aan hebt.

**Benefit 4 — text**
Praat met andere puppy-eigenaren, trainers en gedragstherapeuten. Geen oordeel, wel erkenning en steun.

### 1.4 · Puppyagenda teaser
_· source: `components/sections/puppy-agenda-teaser.tsx`_

**Eyebrow**
De puppycursus

**Heading**
Van geboorte tot en met puberteit.

**Pill**
Meer dan 130 lessen

**Button**
Bekijk de cursus

**Phase 1 — title / text / lesson count**
Vóór de komst
De voorbereidingsfase. Je pup is nog bij de fokker. Je maakt je huis klaar en weet precies wat je nodig hebt.
15 lessen

**Phase 2 — title / text / lesson count**
De eerste week thuis
Je pup komt thuis. Een rustig dagschema, de eerste nachten en de start van zindelijkheids- en benchtraining.
8 lessen

**Phase 3 — title / text / lesson count**
Wennen & socialiseren
De eerste socialisatiefase. Je pup ontdekt de wereld, leert de basiscommando's en went stap voor stap aan zijn nieuwe omgeving.
10 lessen

**Phase 4 — title / text / lesson count**
Ontdekken & groeien
De ontdekkingsfase. De wereld wordt spannender, tegelijkertijd wordt jouw pup ook zelfstandiger en durft verder van jou weg te gaan.
20 lessen

_Legend labels (checklist · video · audio · gezondheid) are fixed lesson-type tags — leave unless you want them renamed._

### 1.5 · Trust — stats, reviews, certifications
_· source: `components/sections/trust.tsx`_

**Stat 1**
500+ — Puppy's op weg geholpen

**Stat 2**
80+ — Videolessen beschikbaar

**Stat 3**
_(medal icon)_ — Gecertificeerde trainers

**Stat 4**
100% — Welzijnsgericht

**Reviews — eyebrow**
Wat eigenaren zeggen

**Reviews — heading**
Echte eigenaren. Echte resultaten.

**Review 1 (Silke, Huizen)**
Super fijne puppycursus bij Elien en Let's dog. Ze is enthousiast, betrokken en kijkt echt naar wat jij en je hond nodig hebben. We voelen ons gesteund en onze puppy leert zichtbaar veel. Echt een aanrader!

**Review 2 (Saskia, Naarden)**
Elien is een fantastische hondengedragscoach die ons met veel kennis en geduld heeft begeleid. Dankzij Let's dog en haar advies maakten we de juiste keuze bij het uitzoeken van het ras, de fokker en de hond. Haar begeleiding in de opvoeding van ons lieve Guus was onmisbaar en heeft ons enorm geholpen om met ons gezin Guus op te voeden.

**Review 3 (Machteld, Amsterdam)**
De puppycursus was, zoals anderen hier ook aangeven, echt helemaal top. Kenny is uitgegroeid tot een vrolijke, lieve en gehoorzame hond, die dankzij Eliens begeleiding en puppycursus zijn weg goed heeft weten te vinden in het leven in Amsterdam.

**Certifications — eyebrow**
Certificeringen

**Certifications — heading**
Erkend. Wetenschappelijk. Betrouwbaar.

**Cert 1 — title / subtitle**
NVGH
Lid van Nederlandse Vereniging van Gedragstherapeuten voor Honden

**Cert 2 — title / subtitle**
Raad van Beheer
Lid van Raad van Beheer - kwaliteitskeurmerk voor instructeurs.

### 1.6 · Pricing section header (homepage only)
_· source: `components/sections/pricing.tsx` — the pricing CARD itself is shared, see §5_

**Eyebrow**
Lidmaatschap

**Heading**
Kies hoe je wilt starten met Let's dog

**Body**
Krijg direct toegang tot de volledige puppycursus, praktische video's, checklists en de Let's dog-community. Alles stap voor stap, zodat je weet wat je pup nodig heeft in elke fase.

**Trust bar (3 items)**
Veilig betalen via Mollie
Geen verborgen kosten

### 1.7 · Final CTA
_· source: `components/sections/final-cta.tsx`_

**Eyebrow**
Begin vandaag nog

**Heading**
Hoe eerder je begint,
hoe makkelijker het gaat.

**Body**
Meld je aan en start direct. De puppyagenda, je eerste videoles en de community staan voor je klaar.

**Button**
Start de cursus vandaag

**Reassurance row (3 items)**
Gecertificeerde trainers
Welzijnsgericht
Week voor week

### 1.8 · Rassenkeuze strip (bottom, blue card)
_· source: `components/sections/rassenkeuze-strip.tsx`_

**Heading**
Nog geen pup? Of twijfel je over het ras?

**Body**
Doe de gratis rassenkeuze hulp, 10 vragen, wetenschappelijk onderbouwd.

**Button**
Doe de gratis test

---

# 2. Prijzen (`/prijzen`)

_The interactive pricing card also appears here — its copy is in §5 (Shared)._

### 2.0 · Search & social listing (SEO)
_· source: `app/prijzen/page.tsx`_

**Page title**
Prijzen — Let's dog

**Meta description**
Twee manieren om te starten met Let's dog: Flexibel maandelijks of Early Member jaar. Vanaf €4,92 per maand. Betalen via Mollie.

### 2.1 · Hero
_· source: `app/prijzen/page.tsx`_

**Heading**
Eén juiste aanpak. Twee manieren om te starten.
_("Twee manieren" shown in peach)_

**Body**
Geen tegenstrijdige tips meer. Kies het tempo dat bij jullie leven past, proberen kan altijd, opzeggen ook.

**Pill 1**
Welzijnsgericht

**Pill 2**
Wekelijkse agenda

### 2.2 · Pricing FAQ
_· source: `app/prijzen/page.tsx`_

**Section heading**
Vragen over prijzen

**Q1**
Hoe lang geldt de Early Member-prijs?

**A1**
Zolang we lanceren, er is nog geen vaste einddatum. Wie nu instapt, betaalt €59 voor het eerste jaar. Wanneer we de prijs verhogen naar €99/jaar, communiceren we dat ruim van tevoren.

**Q2**
Via welke betaalmethoden kan ik betalen?

**A2**
Betaling verloopt via Mollie. Je kunt betalen met iDEAL en creditcard.

**Q3**
Wat als het toch niet bij jullie past?

**A3**
Je kunt je abonnement op elk moment opzeggen via de accountinstellingen in de app, geen omweg, geen ingewikkelde procedure. Bij een jaarabonnement geldt bovendien 7 dagen geld-terug-garantie: zeg je binnen 7 dagen op, dan krijg je het volledige bedrag automatisch terug. Het maandabonnement is niet restitueerbaar, maar je kunt elke maand opzeggen.

**Q4**
Krijg ik mijn geld terug als ik snel opzeg?

**A4**
Bij een jaarabonnement (Early Member): ja, binnen 7 dagen. Je zegt op via de accountinstellingen en wij storten het volledige bedrag automatisch binnen 14 dagen terug. Bij het maandabonnement (Flexibel) is geen restitutie mogelijk, je kunt wel elke maand opzeggen zodat de volgende maand niet wordt afgeschreven.

---

# 3. Puppycursus (`/puppyagenda`)

_(Reached via the nav item labelled "Puppycursus"; the URL is `/puppyagenda`.)_

### 3.0 · Search & social listing (SEO)
_· source: `app/puppyagenda/page.tsx`_

**Page title**
Puppycursus — Let's dog

**Meta description**
Alles wat je moet doen, lezen en bekijken — week voor week klaargezet. Video, leesstof en audio, afgevinkt zodra je klaar bent.

### 3.1 · Hero
_· source: `components/sections/puppyagenda/hero.tsx`_

**Heading**
Alles wat je moet doen, per week klaargezet.
_("per week" shown in green)_

**Body**
Open de app en je weet meteen wat te doen in welke week. Zodat je jouw trainingsvideo’s, lees- en audiodocumenten, daarna kunt afvinken.

**Badge on the app screenshot**
Je bent in week 8

### 3.2 · "Zo werkt het" — 3 steps
_· source: `components/sections/puppyagenda/steps.tsx`_

**Eyebrow**
Zo werkt het

**Step 1 — title / text**
Kies je startpunt
De puppyagenda groeit mee met de leeftijd van jouw pup.

**Step 2 — title / text**
Werk je week af
Korte video’s, leesstof en audio documenten. Vink af wat je al hebt gedaan.

**Step 3 — title / text**
Voortgang
Elke afgeronde les telt mee. Begeleiding voor elke fase

### 3.3 · "Altijd overzicht" — progress
_· source: `components/sections/puppyagenda/progress.tsx`_

**Eyebrow**
Altijd overzicht

**Heading**
Zie precies waar je staat

**Body**
Een rustig dashboard met je week, je XP en je totale voortgang. En elke les heeft een kleur, zodat je in één oogopslag ziet wat het is.

_Legend labels (Video · Lezen · Audio · Gezondheid) are fixed lesson-type tags — leave unless you want them renamed._

### 3.4 · "De vier fases" — interactive explorer
_· source: `components/sections/puppyagenda/phases.tsx` + `phase-explorer.tsx` + `curriculum.ts`_

**Eyebrow**
De eerste 4 fases

**Heading**
Van voorbereiding tot ontdekkingsfase

**In-explorer callout — title / text**
Zo ziet je week eruit
In de app staan de lessen klaar als afvinkbare kaarten. Rood is video, groen is lezen, blauw is audio.

**Lesson-list label**
Lessen in deze fase

#### Phase 01
**Title**
Vóór de komst

**Weeks / Age**
Bij de fokker
Pup 0–8 weken

**Blurb**
De voorbereidingsfase, terwijl je pup nog bij de fokker is. Je maakt je huis klaar en weet precies wat je nodig hebt.

**Lessons**
- Wat heb je nodig? De complete aanschaflijst
- Hoe maak je je huis puppyproof?
- Halsband of tuigje, wat kies je?
- Giftige stoffen voor honden
- Videoles: de eerste nacht voorbereiden

#### Phase 02
**Title**
De eerste week thuis

**Weeks / Age**
Week 1
Pup 8-9 weken

**Blurb**
Je pup komt thuis. Een rustig dagschema, de eerste nachten en de start van zindelijkheids- en benchtraining.

**Lessons**
- Ophalen pup & meeneemlijst
- Dag 1 in huis en het dagschema
- Audiomeditatie: de eerste nachten
- Videoles: zindelijkheids- & benchtraining
- Vaccineren & ontwormen
- Puppybijten en bijtremming aanleren

#### Phase 03
**Title**
Wennen & socialiseren

**Weeks / Age**
Week 2 t/m 4
Pup 8–12 weken

**Blurb**
De eerste socialisatiefase. Je pup ontdekt zijn nieuwe wereld en leert o.a. de basiscommando’s en stap voor stap eventjes alleen te zijn.

**Lessons**
- Algemene trainingstips
- Socialisatie: wat, wanneer en hoe
- Basiscommando's: touch, zit, kijk, los
- Opspringen voorkomen
- Alleen zijn stapsgewijs aanleren
- Wennen aan autorijden & losloopregels

#### Phase 04
**Title**
Ontdekken & groeien

**Weeks / Age**
Week 5 t/m 12
Pup 12–16 weken

**Blurb**
Je pup start met tandenwisselen. Hij wordt een stuk zelfstandiger. Durft verder weg van jou te gaan. Maar kan ook ineens angstig reageren op prikkels.

**Lessons**
- Doortrainen: vasthouden wat je hebt opgebouwd
- Tanden wisselen
- Wandelen & losloopregels
- Blaffen bij pups
- De angstfase: waarom je pup nu schrikt
- Zelfstandigheid opbouwen

### 3.5 · Closing CTA (green band)
_· source: `components/sections/puppyagenda/closing-cta.tsx`_

**Heading**
Begin vandaag met je puppyagenda

**Body**
Week voor week weet je precies wat je met je pup doet. Kies het abonnement dat bij je past en begin direct.

**Button**
Bekijk de abonnementen

---

# 4. Over ons (`/over-ons`)

### 4.0 · Search & social listing (SEO)
_· source: `app/over-ons/page.tsx`_

**Page title**
Over ons — Let's dog

**Meta description**
Leer Elien kennen — gecertificeerde hondengedragstherapeut en oprichtster van Let's dog. Welzijnsgericht, wetenschappelijk onderbouwd.

### 4.1 · Hero
_· source: `app/over-ons/page.tsx`_

**Heading**
Expertise én empathie. Niet één van de twee.
_("Niet één van de twee." shown in peach)_

**Body**
Let's dog is opgericht door Elien, gecertificeerd hondengedragstherapeut. Na honderden eigenaren te hebben begeleid bouwde ze een methode die aansluit bij hoe honden écht leren, zonder dwang, op basis van vertrouwen.

**Badge 1**
Lid van de NVGH

**Badge 2**
Lid van de Raad van Beheer

**Badge on photo**
Elien · oprichtster

### 4.2 · Mijn verhaal
_· source: `app/over-ons/page.tsx`_

**Eyebrow**
Mijn verhaal

**Heading**
Ik heb gezien wat er mis kan gaan. Dat hoeft niet.
_("Dat hoeft niet." shown in muted grey)_

**Paragraph 1**
Al vele hondeneigenaren heb ik geholpen om probleemgedrag van hun hond in goede banen te leiden. Een ding zag ik steeds terug; met de juiste training en begeleiding op het juiste moment had veel gedrag voorkomen kunnen worden.Mijn drijfveer is dan ook het overbrengen van kennis, vaardigheden en inzicht aan eigenaren, om potentieel probleemgedrag te voorkomen.


**Paragraph 2**
Weten hoe je jouw jonge hond traint en wat hij nodig heeft op welk moment voorkomt teleurstellingen en helpt jouw hond uit te groeien tot een stabiele, betrouwbare, goed luisterende volwassen hond.

**Paragraph 3**
Let’s dog is gebouwd op wat ik in de praktijk heb geleerd. Het geeft structuur, duidelijkheid en is een methode die aansluit bij hoe honden echt leren, zonder dwang, op basis van vertrouwen.

**Pull-quote**
Je pup leert niet sneller als jij harder je best doet. Hij leert sneller als jij begrijpt wat hij nodig heeft.

### 4.3 · Onze methode
_· source: `app/over-ons/page.tsx`_

**Eyebrow**
Onze methode

**Heading**
Waar Let's dog op gebouwd is

**Sub-heading**
Drie principes die bij alles wat we maken het uitgangspunt zijn.

**Card 1 — title / text**
Geen fysieke correcties, nooit
We werken uitsluitend met positieve bekrachtiging. Straf en dwang zijn geen onderdeel van onze aanpak.

**Card 2 — title / text**
Wetenschappelijk onderbouwd
Onze aanpak is gebaseerd op de laatste wetenschappelijke inzichten en technieken.

**Card 3 — title / text**
Toegankelijk voor elk ras
De methode werkt voor elke hond, ongeacht ras of grootte.

### 4.4 · Certificeringen
_· source: `app/over-ons/page.tsx`_

**Eyebrow**
Certificeringen

**Heading**
Erkend. Wetenschappelijk. Betrouwbaar.

**Body**
Let's dog is opgezet door een erkend professional en aangesloten bij de toonaangevende Nederlandse instanties.

**Cert 1 — title / text**
NVGH-lid
Lid van Nederlandse Vereniging van Gedragstherapeuten voor Honden.

**Cert 2 — title / text**
Raad van Beheer
Lid van Raad van Beheer - kwaliteitskeurmerk voor instructeurs.

### 4.5 · Closing CTA
_· source: `app/over-ons/page.tsx`_

**Heading**
Klaar om te beginnen?

**Body**
Meld je aan en start direct met de puppyagenda, videolessen en de community.

**Button 1**
Start vandaag

**Button 2**
Plan een consult

---

# 5. Shared — Pricing card (appears on Homepage §1.6 **and** Prijzen §2.1)
_· source: `components/sections/pricing-toggle-card.tsx` + `pricing-data.ts`_

> Editing anything here changes **both** the homepage and the Prijzen page.

**Period toggle labels**
Maandelijks
Jaarlijks

**Savings badge** _(auto-calculated from the prices)_
Bespaar 75%

### Plan: Flexibel (monthly)
**Plan name**
Flexibel

**Corner badge**
Flexibel

**Description**
Maandelijks opzegbaar, geen jaarcontract, geen verplichting.

**Price** _(reference — see ⚠️ at top)_
€19,99 /maand

**Sub-line** _(auto-calculated)_
= €239,88 per jaar

**Features**
- Volledige puppycursus
- Alle video's & checklists
- Let's dog Community

**Button**
Start Maandelijks

**Footer note**
Geen geld-terug-garantie · opzegbaar per maand

**"Switch to yearly" nudge** _(price auto-calculated)_
Je betaalt €180,88 meer per jaar, kies Jaarlijks

### Plan: Early Member (yearly)
**Plan name**
Early Member

**Corner badge**
Best deal

**Top badge**
Meest gekozen

**Description**
Volledige toegang, Early Member prijs zolang we lanceren.

**Price** _(reference — see ⚠️ at top; €99 struck-through old price + €59 first year)_
€59 /eerste jaar

**Sub-line** _(auto-calculated)_
Dat is maar €4,92 per maand · Daarna €99/jaar

**Features**
- Volledige puppycursus
- Alle video's & checklists
- Let's dog Community
- Early Member status

**Button**
Claim Early Member Prijs

**Footer note**
7 dagen geld-terug-garantie · eerste jaar €59

---

## Not in this deck
Nav bar, footer, FAQ page, Contact, Rassenkeuze, and the legal pages. Image alt-texts and aria-labels (accessibility) are also left out to keep this focused on what visitors read. Say the word if you want any of those pulled in too.
