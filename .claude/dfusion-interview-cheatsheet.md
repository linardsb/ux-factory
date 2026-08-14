# dFusion — Product Designer (UX/UI) · screening-call cheat sheet

**Role:** Product Designer (UX/UI) · £50–65k · remote (Tunbridge Wells HQ)
**Their product, de-yachted:** a listings marketplace — discovery, search, market intelligence, editorial — for superyacht brokers. Complex data, dashboards, live vessel info.

---

## Opening pitch (60–90 sec, memorise the shape not the words)

> "I'm a senior product designer who also ships production code — 5+ years on complex,
> data-heavy platforms: a live fleet-tracking transit platform, a two-sided taxi
> marketplace with dispatcher and admin surfaces, and an email-workflow SaaS.
> Right now I'm building a portfolio platform whose core is a design system that
> re-skins an entire product from one token file. The overlap with dFusion is
> unusually direct: listings, search, live asset data, dashboards — that's exactly
> what I've been designing."

---

## JD bullet → your evidence → the sentence to say

| They ask about | Your evidence | Say this |
|---|---|---|
| **Design systems** | ux-factory: DTCG token contract, one-line re-skin, generated component docs + handoff pack | "I build design systems as contracts — my current platform re-skins the whole site from one token file, and generates the engineer handoff docs from the same source the components render from." |
| **SaaS / dashboards / complex web apps** | VTV transit CMS, email-hub workspace, taxi dispatcher portal | "Three shipped platforms: transit operations, email production, taxi dispatch — all dashboard-and-workflow-heavy SaaS." |
| **Simplifying large datasets** | VTV: multi-feed live vehicle tracking, ETAs, journey planning on maps | "I designed live-map views of a moving city bus fleet — positions, ETAs, delays — for dispatchers who need answers at a glance. **Tracking vessels is the same UX problem as tracking buses.**" |
| **Complex workflows → intuitive UX** | email-hub: design → HTML email → QA gate → multi-ESP export in one workspace | "I turned a five-tool email production process into one workspace with a visual QA gate — the messy workflow became a pipeline the user can see." |
| **Marketplace (nice-to-have)** | Sakta Cab: rider / driver / dispatcher / admin — four surfaces, one state machine | "I designed a two-sided marketplace end to end — both sides of the market plus the ops tools behind it." |
| **Search interfaces (nice-to-have)** | VTV journey planning; email-hub hybrid search; ⌘K command palette | "Journey-planning search over live transit data, plus hybrid keyword+semantic search in the email platform." |
| **Data visualization (nice-to-have)** | Live maps, KPI/metric tiles, the measured system-dependency graph | "Dashboards and live maps mostly — and every number rendered on my portfolio is generated from measurement, never typed in." |
| **Accessibility & responsive** | WCAG contrast negotiation built into the token engine; specific SCs (2.1.1, 2.5.7, 2.5.8) implemented + tested cross-engine | "Accessibility is in my token engine — contrast pairs are negotiated and verified at build time. I test Chromium, Firefox and WebKit, not just Chrome." |
| **Working with engineers / Agile** | You ship the code too; generated specs + handoff docs | "I speak both languages — my handoff packs are generated artifacts engineers consume directly, and nothing I design is unbuildable because I build." |

---

## Objections — answer first, briefly

- **"Twig?"** → "I haven't shipped Twig specifically — but my whole current platform is hand-written vanilla JS and CSS with template-based rendering, no framework. Twig is syntax; I'd be productive in it inside a week."
- **"You look quite engineering-heavy — is this a design role for you?"** → "Design is the job; code is how I make sure the design survives contact with production. Every project I named, I did the research, flows, wireframes and hi-fi UI first." *(Lead stories with the user problem, end with the shipped UI. Mention code last. Park the AI-agent depth unless they raise AI.)*
- **"Salary expectations?"** → "Top of your advertised band — £62–65k — flexible on the full package." *(Decided beforehand: this is below your £70–80k bar; remote + direct product influence is the trade. Don't name a number above £65k on a screening call.)*
- **"Any yachting experience?"** → "No — and that's my pattern: I learned transit ops, email infrastructure and dispatch logistics from zero and shipped in each. Unfamiliar complex domains are the thing I do."

---

## Links to have ready (verify BEFORE the call)

1. **ux-factory live site** — ⚠️ no canonical domain yet; confirm the Cloudflare Pages URL works (project `factory-ux`) or deploy first. Home is built as a 90-second recruiter gate; **/build** lets them drop *their* tokens and see their brand render.
2. github.com/linardsb/ux-factory — say "half-built in public, the repo is part of the exhibit."
3. 1–2 screenshots each: VTV live map/CMS · taxi dispatcher — have them in a folder ready to send.

---

## Your questions (pick two)

- "Is the design work weighted toward the broker-facing tools or the consumer discovery/search side?" *(shows you understood the product split; tells you what to sharpen for round two)*
- "Is there an existing design system, or would I be establishing one?" *(either answer is a lane you own)*
- "What does the design–engineering handoff look like today?"
- "What's the next step and timeline after this call?"

---

## Don'ts

- Don't lead with AI/agents/security to an account manager — outcomes and visuals only.
- Don't say "half done" about your portfolio unprompted — "building in public, core system is live" instead.
- Don't go above £65k on this call.
