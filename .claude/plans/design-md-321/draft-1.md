# DESIGN.md — composition conventions for the compose agent
Version: 1

This file is not the per-company build constitution that agent-layer/build.mjs copies to a deploy's site root; that document governs one company's own build, and this one governs how any screen in this system is put together. It was drafted by an agent from the vocabulary, the state rules and the copy rules listed in its drafting brief, not from the product the vocabulary happens to demonstrate.

## Layout

A screen is one `stack` with `stack.direction=column`, holding every part in reading order from top to bottom. Nothing sits outside it and nothing sits beside it on the page.

`screen-header` is the first child, always, exactly one per screen. It carries the title; a screen that is not the root of its own area also sets `screen-header.showBack`.

The screen's one committing action is `primary-button`, placed last in the stack's reading order, full width. There is no action-bar part: the vocabulary expresses an action bar as this one placement, never as separate chrome. A screen carries at most one `primary-button`; an action that only assists sits beside it as `ghost-button`, never as a second `primary-button`.

`nav-tabs`, when the screen belongs to a sectioned surface, sits directly under `screen-header` and above everything else. It depicts which sections exist; it does not switch between them.

## States

Every screen carries five states: ideal, empty, error, partial and loading. A state sets props on parts already in the screen or hides them; it cannot add a part. So the base screen must already contain every part any of its states will show, whether or not that part is visible in the ideal state.

A state that asks the person to decide something is drawn with `modal-dialog`: include it, hidden, in the base screen, and let the state reveal it with its own `modal-dialog.title`, `modal-dialog.body` and `modal-dialog.confirmLabel`. `modal-dialog` is already inline, with no scrim and no focus trap, so revealing it is a prop change on a part that was always there, not a special layout move.

A state that only reports a condition — nothing to show yet, loading failed, loading is still running, only some of the data has arrived — never asks for a decision, so it stays inline: hide the rows that are not ready, show a `text` line that was hidden, change a tone. Reach for `modal-dialog` only when the state is a question with two ways through it, never to report a fact.

## Copy

Empty copy states plainly what is not there yet and gives the next step as one sentence or as a `ghost-button` label. It never apologises and never states the absence twice.

Error copy gives the reason before the action: one `text` line says what went wrong, in the system's own words, and a second line or a button says what happens next. The two are never collapsed into one sentence that states only that something failed.

Every string follows this system's copy rules regardless of screen kind: a button label is an imperative verb phrase, a link or button names where it goes, and every string is sentence case.

## Boundaries

A screen never carries a photograph or an illustration. The vocabulary's one picture-shaped part is `icon`, a single glyph standing in for an idea, never a scene.

A screen never sets a colour, a size or a spacing value outside what a part's own enum names. `text.role` is the only size decision text makes; `stack.gap` and `stack.pad` are the only spacing decisions a layout makes, and both are steps of the one spacing scale, never a pixel number.

A screen composes only names this vocabulary lists, in the shapes their own props allow. A screen that needs a part the vocabulary does not have is a reason to grow the vocabulary, never licence to invent one in place.

## Screen templates

### list

Use this for browsing many records of the same kind, where the honest answer the screen gives is which ones.

```parts
screen-header
nav-tabs?
text?
list+
primary-button?
```

### detail

Use this for reading everything about one record, grouped into titled sections.

```parts
screen-header
text?
card+
ghost-button?
primary-button?
```

### form

Use this for collecting or changing structured input that one action commits.

```parts
screen-header
text?
text-field*
select-field*
choice*
primary-button
```

### empty

Use this when the screen's whole purpose is to say that nothing is here yet and to invite the first one.

```parts
screen-header
text
text?
ghost-button
```

### error

Use this when the screen's whole purpose is to report that something failed and to offer a way forward.

```parts
screen-header
text
text
ghost-button?
primary-button
```

### confirm

Use this when the screen's whole purpose is to ask one decision before anything proceeds.

```parts
screen-header
card?
modal-dialog
```

Pick one of these templates for every screen. Do not invent a layout outside them.