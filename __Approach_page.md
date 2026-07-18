# __Approach_page: finalized copy for the portfolio "Approach" page

Public-facing copy, softened from `__UX_UI_Research.md` (which stays private). Reframed from "how I get hired" to "how I work." Written in first person, addressed to a prospective employer or collaborator.

Each section notes the `ux-factory` components to build it with (from `index.html`): `page-hero`, `section` + `section-label` (`.num`/`.line`), `section-split`, `headline`, `hl`, `grid grid-3`, `card` (`.card-body`/`.card-kicker`), `btn`, `max-prose`, `muted`. Build notes are in *italics*, and aren't page copy.

**Page meta**
- `<title>`: Approach · [Your Name]
- description: How I work as a design engineer: shaping vague work into time-boxed bets, designing around real behaviour, checking whether it worked, and shipping it as a proper design system.
- `data-page="approach"`

**Voice contract** — *build note, not page copy (private doc §10). Applies to every line on this page, and to anything the factory regenerates per company. The page educates only by overhearing: the subject of every sentence is the work, never the reader. The reader should experience clarity, not teaching.*
- *Phenomenon first, framework name last — the name lands at the end as a caption with its source ("an appetite — a time budget, not an estimate — Shape Up"), never as the opener.*
- *Gloss terms in a short appositive and keep moving; a definition that gets its own paragraph has enrolled the reader in a course.*
- *First-person testimony ("the rule I design by"), never second-person prescription ("you should").*
- *Pull, never push: reasoning opens on curiosity (hover, expand), is always skippable, and never gets its own section.*
- *Compare notes, never grade: at most ONE interactive reveal on the whole page, with no correct/incorrect state — show where I landed, next to wherever the reader did.*
- *Close every loop: every piece of reasoning ends on what the decision produced.*
- *Write to the most senior plausible reader; let everyone else overhear.*
- *Hard limit: no badges, callouts, or anything that announces teaching. If an element would be described as "an education feature," cut it back until the page just reads as unusually clear.*

---

## Hero
*Build: `page-hero` → `hero-eyebrow` (pill · stamp · meta), `h1.text-balance` with `.hl` on the last phrase, `hero-sub`, `hero-cta-row` with two `btn`s.*

- **Eyebrow stamp:** Approach · how I work
- **H1:** I don't hand off screens. I own the whole problem, from shaping the work to proving it <span class="hl">landed</span>.
- **Sub:** I'm a design engineer. I sit between design and front-end, close enough to each to make the call and then build it. The code is only part of what I bring. I also carry a way of working: I shape vague asks into time-boxed bets, design around how people actually behave, check whether the result worked, and ship it as a real design system. Those four things run as one loop.
- **CTA row:** `[ See the four layers ]` (primary, arrow) · `[ The loop ]` (secondary)

---

## 01 · The seat I work from
*Build: `section#seat` → `section-label` (01 · The seat) → `section-split` (headline left, `max-prose` right).*

- **Headline:** The interesting problems live <span class="hl">between</span> design and engineering.
- **Body:** Most teams split the work in two. Designers decide what a thing should be; engineers make it real. The interesting problems fall in the gap between them: the interaction that felt right in Figma and wrong in the browser, the component that drifts because everyone hard-codes its colour, the feature that ships and nobody checks whether it helped. I work in that gap. I know enough design to shape and scope what gets built, and enough code to put it into production. So there are fewer hand-offs, less gets lost in translation, and the person making the call is the one who has to live with it in both tools.

---

## 02 · Four layers, one method
*Build: intro line, then `grid grid-3` (or a 2×2) of four `card`s, one per layer. `card-kicker` = the layer's discipline, `h3` = the promise, `muted` body = definition plus one example.*

- **Intro:** Each layer answers a different question. I run them as one loop, on a fixed cadence.

**Layer 1: Shape it** · *how I decide and pace work* (from Shape Up)
> I turn a vague ask into a shaped bet before anyone writes a line of code. I set an appetite, which is a time budget rather than an estimate, and design the solution to fit it instead of fixing the scope and watching the date slip. I rough out the flow as connected steps before touching pixels, name the risks that could blow the budget, and say plainly what's out of scope. While it's being built I track progress by confidence rather than percentage: what's still being figured out versus what's just work left to do.

**Layer 2: Design for behaviour** · *how I make it work for real people* (from the Hook Model and BJ Fogg)
> A feature only matters if someone actually does the thing. I start from the real trigger, which is usually an emotion or a moment rather than a button, and I look for friction in the flow: every extra step, decision, or bit of confusion between the person and the payoff. Fogg's rule is the one I design by: make the behaviour easier before you try to make it more motivating. I also keep an ethics gate on this. If a pattern lifts a metric by making someone feel worse, I won't ship it.

**Layer 3: Prove it** · *how I know it worked* (evidence)
> Before I build, I write down what would tell me it worked: an early signal like first-week usage or activation, and the slower outcome behind it like retention or task completion. Once it ships I go back and check, then record what I learned so the next call starts from evidence rather than opinion. Most work never gets that second look. I make it a step.

**Layer 4: Ship it as a system** · *how I make it durable* (craft)
> I build interfaces as systems rather than one-off pages: semantic, accessible markup, motion that has a reason, and performance I can stand behind. When every component reads from a shared contract of design tokens, consistency is built into the structure. Colours and spacing can't drift, because there's nowhere for them to drift to, so it isn't something the team has to catch in review. This portfolio is built that way (see the case study below).

---

## 03 · One loop
*Build: `section#loop`, `section-label` (03 · The loop). Render the table below as a styled table, or as a horizontal stepper across the four stages. Keep the four columns.*

- **Headline:** Run together, the four layers make one <span class="hl">loop</span>.
- **Body:** Shaping opens the work and aims the behaviour and evidence layers at the right problem. The build turns it into system components. The measurement at the end feeds the next round of shaping.

| I'm doing this… | …with this behaviour lens | …measuring this | …and shipping this |
|---|---|---|---|
| Shaping the problem | The real trigger or job behind the ask | Prior insight | A rough flow, scoped to an appetite |
| Designing the solution | A friction check plus the payoff that makes it worth it | Usability signal | Elements cut to fit the budget |
| Committing to build | An ethics check on the pattern | The success metric, named up front | Go or no-go |
| Building | The small "investment" that makes it stick | Self-serve evidence during the build | Shipped, token-built components |
| Wrapping up | Did it become a habit, or did the task get easier? | The outcome, checked | Notes back into the system |

---

## 04 · What that gets a team
*Build: `section#value`, `section-label` (04 · What you get). A plain list, one value per line, or a `grid` of short rows.*

- **Headline:** What this looks like from the <span class="hl">other</span> side of the desk.

- You get production code, not just a Figma file: modern CSS, a tidy component layer, and interactions that still feel right in a browser.
- You get a design system that stays consistent, because brand and theming live in one place instead of being copied around and slowly diverging.
- Accessibility and performance are handled at the system level, so contrast, keyboard use, and focus are right by default, and features get checked against a real speed budget before they ship.
- You can hand me a half-formed idea and get back a scoped, time-boxed bet, with the risks named and a plan to hit the date.
- I say what success should look like before building and check it afterwards, so decisions rest on what happened rather than a hunch.
- I can translate between design and engineering, so both sides share one picture of what's being built and why.
- Decisions come with their reasoning attached — the problem, the call, and what it produced — written so a designer, an engineer, and a PM can each follow the why without a meeting.

---

## 05 · Case study: the system behind this site
*Build: `section#case`, `section-label` (05 · In practice). Use `section-split` for the intro, then a vertical set of labelled blocks (Problem / Shaping / Behaviour / Build / Outcome) — `decision-card`s, sequenced so each builds on the one before and each ends on what it produced; gloss key terms inline with a light source caption. Optional: a quiet, opt-in "commentary" step-through of the five calls; if it carries the page's one interactive reveal, use the ethics check — let the reader place the tool on the 2×2 before showing where I put it. Wire `built-because` on this section's own components, so the page demonstrates the pattern it describes. Link to the repo if public.*

- **Headline:** This portfolio re-skins itself from <span class="hl">one line</span> of CSS.
- **Intro:** `ux-factory` is the design system this site runs on, and the clearest example of how I work, because it's the method used on itself.

- **Problem & appetite.** Re-theming a portfolio for each company meant hand-editing CSS across every page. It was slow and easy to get inconsistent. I treated it as a systems problem worth one focused cycle rather than an open-ended refactor.
- **Shaping.** The actual job was less about colours than about proving I could build a system, and making each version feel tailored without tailoring it by hand every time. One rule kept the rest safe: components may only reference semantic tokens, never raw values. One thing stayed off the table: no build step and no framework, just plain HTML and CSS.
- **Design & ethics.** I ran the same friction check on my own re-theming workflow. The friction was memory and time: remembering which files to touch. So I collapsed re-theming down to a single edit. It genuinely saves the work it promises to, and I use it myself, which is the honest test of whether it was worth building.
- **Build.** Three stylesheets load in order: a token contract with neutral fallbacks, a swappable brand pack, and components that read only from tokens. The header and footer come from one config object instead of being hard-coded on every page. Accessibility defaults sit in the contract, so every component inherits them. An agent called Wright assembles each page from that contract, so a new page starts on-brand instead of being styled from scratch.
- **Outcome.** Re-theming the whole site went from scattered edits on every page to a single line in each page's `<head>`. On top of that I generated a machine-readable layer: structured data and an `llms.txt` file, so an AI agent can read the system, not only a browser. Consistency stopped being something I maintained by hand and became part of how the thing is built.

---

## 06 · Where the ideas come from
*Build: `section#sources`, `section-label` (06 · Sources). A compact grouped list; keep it curated, not exhaustive. Could be small `muted` columns.*

- **Headline:** I learn from the <span class="hl">primary</span> sources.
- **Process:** Shape Up (Ryan Singer / Basecamp), Bob Moesta on Jobs-to-be-Done.
- **Behaviour & ethics:** Nir Eyal, BJ Fogg's behaviour model, Growth.Design, Harry Brignull's Deceptive Patterns, Nielsen Norman Group.
- **UI craft & front-end:** Josh Comeau, Ahmad Shadeed, Rauno Freiberg's Web Interface Guidelines, Emil Kowalski on motion, web.dev.
- **Design systems & tokens:** the W3C Design Tokens spec, Style Dictionary, Nathan Curtis (EightShapes), the Component Gallery.

---

## 07 · How I think about the work
*Build: `section#practice`, `section-label` (07 · Principles). Five short principle blocks, `h3` plus one or two `muted` lines each.*

- **Headline:** A few things I hold to.
- **The combination is what matters.** Plenty of people know one of these disciplines well. The value is in running all four as a single way of working.
- **I commit to one approach.** There's more than one good way to run product work, so I pick the one that suits the team and stick with it, rather than blending methods into mush.
- **Engagement has an ethical line.** I design for behaviour, but only where a habit actually helps the person using the product. For tools people should open, use, and close, "come back more often" is the wrong target.
- **The work should explain itself.** Anywhere this site makes a call — a token, a pattern, a scope cut — the reasoning sits a click or a hover away: the problem, the call, what it produced, and where the idea comes from. It's roughly how decision records read on teams I work with. If you leave with something you can use, whether or not we ever talk, the page did its job.
- **I'm honest about my edges.** Right now I'm deepening [pick one honestly: production motion at scale, large accessibility audits, or framework internals], and I can tell you what I'm reading to get there. Knowing where you're weak is part of being good.

---

## Closing CTA
*Build: a final `page-hero`-style band or `section` with a `hero-cta-row`.*

- **Line:** If this is how you'd want someone on your team to work, I'd like to talk.
- **CTA:** `[ See selected work ]` · `[ Get in touch ]`

---

### Notes for you (not page copy)
- **§07 last bullet** has a placeholder. Fill the growth edge honestly, or cut the bullet if you'd rather not name one publicly.
- **Metrics:** the ux-factory outcome ("one line") is a true property of the architecture, so it's safe to state. If you add numbers elsewhere (§04 or §05), use real ones only.
- This maps onto the private `__UX_UI_Research.md`: page §01 to doc §1, §02 and §03 to doc §2, §04 to doc §3, §05 to doc §4, §06 to doc §6, §07 to doc §8. The interview toolkit (doc §5) and the Shape Up chapter map (doc §7) are left off the public page on purpose.
- **The teaching layer (doc §10) is distributed on purpose — never a section.** The voice contract at the top governs all copy; §04's last bullet, §05's commentary build note, and §07's "the work should explain itself" carry it. It only works subtle: if any of it would read as "an education feature," cut it back until the page just reads as unusually clear.
