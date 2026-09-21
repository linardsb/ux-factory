# #421 report

**Branch** `docs/house-skill-refusals-states-421` off `main` @ `4550925`. Three files, all inside
`.claude/skills/portfolio-design/`; +20 −2.

## The grep before adding (observed)

| rule the ticket says is already present | found |
|---|---|
| 65–75ch measure | `CRAFT.md:9` — not duplicated |
| -0.04em tracking floor | `CRAFT.md:8` — not duplicated |
| em-dash ban | `CHECKLIST.md:35` — not duplicated |
| `::selection` theming | **absent** — not added; the ticket's scope does not list it |
| scrollbar theming | **absent** — not added, same reason |
| tabular numerals | **absent** — not added, same reason |

The ticket's premise that all six were present is wrong for three; the scope lists what to add, so
the three absences are recorded here and left for the owner to ticket if wanted.

## The manual eyebrow check

`index.html`: 3 `.card-kicker` over 4 `<section>`; `approach.html`: 4 over 5. Read in the markup,
not looked at in a browser: every kicker is inside a `.card`, none is a section eyebrow, so
taste-skill's ceiling (⌈sections/3⌉) is measuring the wrong unit here. **Decision: no page edit**, the
rule is not adopted, and the *Rejected* note in CHECKLIST.md is the record.

## Gates

`node tooling/build-checks.mjs` — ✅ all 36 groups pass, unchanged by construction (no tooling file
touched). No shipped page changed, so no baseline moves.
