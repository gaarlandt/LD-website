# PRODUCT.md — Let's Dog Marketing Website

## Product Purpose
Marketing website for **Let's Dog**, a Dutch puppy training platform. The site exists to help a specific audience — overwhelmed new puppy owners in the Netherlands — feel calm enough to start, then convert them into the app (`app.letsdog.nl`) or into the breed-selector funnel (`keuzehulp.letsdog.nl`).

The product behind the marketing is a structured first-year curriculum: daily plan, video lessons, audio lessons for walks, and a community of fellow new owners. Built by Elien — a real, certified Dutch dog trainer (NVGH, Raad van Beheer) — not by a SaaS company.

## Register
**brand** — this site is marketing. Design *is* the product. Visitors should feel the brand inside thirty seconds and decide whether this is "their kind of trainer".

## Users (in priority order)
1. **Anxious-new-owner Anna** (primary). Wednesday 21:43. Her seven-week-old pup just chewed something. She's tired, she's been told ten contradictory things by ten different people on Instagram, and she opens her phone hoping someone will just *tell her what to do next*. Wants: calm, certainty, a single sane path forward.
2. **Researching-pre-owner Pieter** (secondary). Considering a puppy. Reading everything. Wants: proof this is serious, not "puppy influencer" fluff. Cares about welfare credentials, the breed selector, real trainers.
3. **Refund-curious skeptic** (edge). Already tried YouTube. Already tried a local trainer. Wants: to know this is different *before* paying. Cares about specifics (concrete features, real testimonials, refund clarity).

## Tone & Voice
- Warm authority, never cute. A trainer who has seen a thousand puppies, not a brand mascot.
- Dutch, second-person ("je", not "u"), but never folksy. No "hé!", no emoji.
- Short sentences. Land on a period. The reader is tired; respect that.
- Specific over abstract: "je pup bijt om 21:43" beats "puppies sometimes nip in the evening".
- No marketing intensifiers: no "revolutionary", "ultimate", "game-changing", no "krachtig", no "uniek".
- Welzijnsgericht ("welfare-driven") is the philosophical anchor. R+, no aversives, no shouting at dogs.

## Brand Identity
- **Trainer-led, not platform-led.** Elien is on the site. She has a name and a face. The credentials (NVGH, Raad van Beheer) are real.
- **Calm authority.** Sage green canvas, warm beige paper. Not a tech product.
- **Editorial over template.** Treat copy and image like a magazine spread, not a SaaS landing page kit.
- **Welzijnsgericht.** Every visual choice (no aggressive imagery, no excited stock photos of dogs leaping) reinforces the welfare positioning.

## Anti-References
What this site must *not* feel like.
- **Generic SaaS landing pages.** Three-up icon-card grids. Hero with a screenshot mockup floating on a gradient. Big-number-and-tiny-label social proof bars.
- **Influencer dog brands.** Glittery, screamy, "5 secrets every dog owner MUST know!!!". Excessive emoji. Cute typography.
- **Cold corporate veterinary chains.** Sterile photography. Stock images of golden retrievers tilted at a 45-degree angle. Plump rounded buttons with too much drop shadow.
- **AI-generated copy tells.** Em dashes everywhere. "Problem → Hope → Solution" narrative arcs. "Echte X. Echte Y." parallelisms. Bullet points that all start with the same word. Restated headings in the first sentence of every section. Risk-reduction triplet bullets under every CTA ("Veilig · Geen verborgen kosten · Opzegbaar").
- **Glassmorphism overuse.** `bg-white/60 backdrop-blur` cards as decoration on every section.

## Strategic Principles
- **Conversion comes from specificity, not from polish.** Real names, real moments, real prices. Generic "trusted by hundreds" lines convert worse than "Marieke, met haar Beagle Bo, week 3".
- **One decision per page.** Don't ladder users through 5 CTAs. Homepage → app or breed selector. Pricing → pick a tier. Done.
- **Welfare framing is a moat.** Cheap competitors lean on dominance/old-school training. Lead with welzijnsgericht because that's what the audience can't get from a YouTube random.
- **Mobile-first is literal.** Anna is on her phone in bed. Test every change at 375px first.
- **Don't break analytics.** GA4 + Cookiebot + cta-tracker wiring is correct as-is and shared across all `letsdog.nl` subdomains. Visual changes must not delete the analytics components or change CTA destination URLs.

## Out of Scope (for the impeccable polish pass)
- Backend / app product itself (lives at `app.letsdog.nl`)
- Breed selector content (lives at `keuzehulp.letsdog.nl`, embedded via iframe on `/hondenkeuze`)
- Legal copy (markdown-driven, edited via `content/*.md`, not in scope)
- Pages other than homepage and `/prijzen` for this specific test branch
