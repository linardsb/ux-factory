# 01 — knowledge loaded for spike C (real run 2026-08-27)

Call A keys: blueprint/core, blueprint/components, design-systems/core, blueprint/layout, blueprint/text, blueprint/paint (returned inline; the substance is restated in README §knowledge; raw text of call A was not persisted by the tool as a file).

Call B keys: reference/design-systems, reference/components, reference/export, blueprint/directives, blueprint/vectors, design-systems/authoring — verbatim below.

# Design Systems

Brilliant projects carry a design system: a named set of tokens (colors, spacing, radius, typography, shadows, stroke widths, opacity, font settings) that elements reference instead of hardcoding values. Change a token and every element bound to it updates. Switch a brand or a mode and the whole canvas re-resolves.

This file is the product reference: what the feature does, where the controls live, and how a user operates it by hand. The token authoring grammar (the `.ds` DSL) is not covered here. For authoring or editing a design system's tokens, see the `design-systems/*` knowledge files. For referencing tokens in blueprint markup, see the `blueprint/*` knowledge files.

## Core Concepts

- **Tokens** are named design values. An element stores a token *reference* (e.g. `color.primary`), never the resolved value. The renderer resolves the reference at paint time, so editing the system or switching modes ripples through every binding.
- **Brands** are named variants of the system (e.g. `corporate-blue`, `fintech-warm`) that override the project baseline. The baseline is always called `default`.
- **Modes** are axes the system declares (commonly `theme` with `light`/`dark`, `density` with `comfortable`/`compact`, `accessibility` with `standard`/`high-contrast`/`large-text`). The first value of each axis is the default. Switching a mode re-resolves mode-aware tokens.
- **Composite tokens** bundle multiple values: typography tokens (`typography.h1`, `typography.body.md`) carry font size + weight + line height + family; shadow tokens (`shadow.md`) carry one or more shadow layers.

## Where the System Lives

A project's design system is stored as files in a `Styles/` folder at the repo root (`Styles/default.ds` is the baseline, plus optional brand files like `Styles/corporate-blue.ds`). The user does not need to touch these to *use* tokens; they only matter when authoring or editing the system. Sub-folders can carry their own `Styles/default.ds` that overrides the parent for canvases in that folder.

To open the source file for editing, run the **Open Design System File** command (command palette). It opens the nearest `.ds` file in the built-in code editor.

## The Design System Inspector Section

The **right toolbar** has a **Design system** section pinned at its top (always visible when a canvas is loaded). It reports and controls the active brand and modes for the current scope.

Layout: the brand dropdown and the first mode axis sit on the first row; remaining axes wrap two per row. To the right of the row are two icon buttons. When there is anything to reset at the current scope, **Reset design system** (counter-clockwise arrow icon) appears first, followed by **Create Design System Viewer** (paint-palette icon) as the trailing button.

### Scope

The section's subtitle tells you what scope you are editing:

- **Nothing selected** ("this canvas"): the dropdowns set a **canvas-level** override stored on the canvas. It applies only to the current canvas; other canvases in the same folder are unaffected. When no canvas override exists, the canvas inherits the folder's default brand/modes.
- **One element selected** ("1 selected"): the dropdowns set the brand/modes **on that element**. The element's subtree re-resolves against it. Inherited values are shown dimmed with an "Inherited from..." tooltip.
- **Multiple selected**: shows the shared value if all agree, or a "Mixed" placeholder otherwise.

A dimmed field with an "Inherited from..." tooltip means the value is not pinned at this scope: it comes from a parent frame, the canvas, the folder default, or the system default. Picking a value pins it; picking **Inherit** clears the pin and lets the cascade resolve from above.

### Switching brand

The brand dropdown lists **Inherit** (clears the scope's override), **default** (pins to the project baseline), then each brand file found in `Styles/`. Hovering an option previews it live on the canvas without committing; clicking commits. The change is undoable (Cmd+Z).

If the project depends on any **libraries**, their design systems appear in the same dropdown named by the library's handle: `@acme/design-kit` is that library's default look, `@acme/design-kit/marketing` one of its named brands. A library brand always resolves against the library's own tokens, so a library update re-themes everywhere it is used. See `reference/libraries`.

### Switching modes

Each axis the active system declares gets its own dropdown (theme, density, accessibility, or any custom axis the system author defined). Options are **Inherit** plus that axis's declared values. Hover previews, click commits, Cmd+Z undoes. There is no default keyboard shortcut for switching modes, and no command-palette entry: the inspector axis dropdowns are the only way to change a mode.

#### Pinned-brand modes on a selection

When you select elements that carry a design system pinned on the element itself (typically from a Figma import: a brand plus per-node mode overrides that never became the folder's active brand), that brand can declare mode axes the folder does not. Those axes now appear as an extra block below the normal axis rows, labeled with the brand's name and "pinned modes", with one dropdown per axis. Each shows the selection's current pinned value (or "Mixed" when the selected elements differ), and picking a value writes it as the pin on the selected elements while keeping their pinned brand. This is the only place those pinned modes are visible and switchable by hand; it appears only with an element selection, not when editing the whole canvas.

### Reset and Viewer buttons

- **Reset design system**: clears every brand/mode override at the current scope (canvas-level if nothing is selected, or on each selected element). It only appears when there is something to reset, and disappears after the click. Undoable.
- **Create Design System Viewer**: inserts an 800x600 viewer element on the canvas that visualizes the active system's color seeds, scales, and typography composites. Useful as a living swatch sheet.

## Binding Tokens to Properties

Most numeric and color properties in the inspector accept a token binding. When a property is bound, its field shows the token name instead of a raw value. Manually typing a value into a bound field clears the binding for that property.

To bind a numeric or font field (radius, opacity, gap/padding, stroke width, font size/weight/line height/family), open the field's dropdown (the chevron next to the value): the menu lists the matching token type alongside the plain preset values, and picking a token replaces the literal with the token name. Bound fields are marked with a purple chevron and diamond indicator (mirroring the color picker's "Design tokens" swatches for color fields).

Where you bind in the UI:

| Property | Where in the inspector | Token type |
|----------|------------------------|------------|
| Fill / stroke color | Color picker, "Design tokens" section in the lower part of the picker | Color tokens |
| Fill / stroke opacity | Color picker token section | Opacity (visibility) tokens |
| Corner radius (per corner) | Right toolbar, radius fields | Radius tokens |
| Element opacity | Right toolbar, opacity field | Opacity tokens |
| Font size, weight, line height | Right toolbar, typography fields | Font tokens |
| Font family | Right toolbar, font picker | Font family token |
| Auto layout gap and padding | Right toolbar, auto layout fields | Spacing tokens |
| Stroke width | Right toolbar, stroke fields | Stroke width tokens |

The color picker's **Design tokens** section (in the lower part of the picker, above the canvas colors and recent colors) shows the system's color tokens as swatches, grouped. The swatches resolve through the canvas's active modes, so themed colors reflect the current theme. Token-bound colors work in every color slot: solid fills, gradient stops, shader colors, effect colors (drop shadow, outer glow, inner shadow, inner glow), image-filter colors (duotone, halftone), layout grid colors, and per-range text colors.

Composite tokens are applied via commands, not inline fields:

- **Apply Typography Token**: applies a `typography.*` composite to the selected text element(s).
- **Apply Shadow Token**: applies a `shadow.*` composite to the selected element(s).

## Unbinding Tokens

The **Unbind Tokens** command takes the current selection (and its descendants), replaces every token binding with the literal value it currently renders as, and drops the per-element design-system assignment. The result looks identical but no longer tracks the design system. Use it to "freeze" a subtree. Undoable.

## Importing a Design System from Figma

Bringing a Figma file into Brilliant with the Brilliant Figma plugin (copy in Figma with the plugin, then paste into Brilliant with Cmd+V) carries the file's design system across as a real Brilliant system, not as flattened literal values. For the import mechanics (connecting Figma, plugin vs URL), see `reference/canvases`. What you get on the design-system side:

- **Every variable keeps its Figma name.** A variable named `brand/500` arrives as a token named `brand.500`; nothing is renamed away, so a search for the name you already know still finds it.
- **Each multi-mode collection becomes its own mode axis.** A collection with modes like Day and Night becomes an axis you can switch in the inspector, independently of every other collection. A collection whose modes are Light and Dark instead drives Brilliant's built-in theme toggle, so the light/dark switch just works on it. Single-mode collections come in as plain tokens.
- **Brilliant's role names are added on top, as aliases.** Where a Figma token clearly plays a standard role (a primary brand color, a surface, body text, an h1 type style), Brilliant adds its own role name (`color.primary`, `color.surface`, `typography.h1`, and friends) pointing at your token. Both names resolve, and because the role points at your token, switching brands or editing that token re-themes through the role.
- **Per-node mode overrides become per-element pins.** A node pinned to a specific collection mode in Figma (a dark strip inside a light page) imports pinned to that mode and stays that way across brand switches.
- **Gradient style stop colors become tokens.** A shared gradient paint style brings each of its stop colors across as its own color token, rebound to the matching gradient stops on the elements that used the style.

The import boundaries (what stays literal or on the element rather than becoming a token) are listed under Cannot below, and each such loss is named in the import warnings so nothing drops silently.

## What Brilliant Can and Cannot Do

Can:
- Resolve color, spacing, radius, typography, shadow, stroke-width, opacity, and font tokens at paint time, so one source edit updates every binding.
- Define multiple brands and switch between them at canvas or element scope with live hover preview.
- Define multiple mode axes (theme, density, accessibility, plus arbitrary custom axes) and switch each independently.
- Bind tokens in every color slot and in numeric properties (radius, opacity, gap, padding, stroke width, font size/weight/line height/family).
- Apply composite typography and shadow tokens via commands.
- Visualize the system with the Design System Viewer element.
- Import a Figma file's design system (via the Brilliant Figma plugin) as a real Brilliant system: variables keep their names, each multi-mode collection becomes a mode axis, a light/dark collection drives the theme toggle, standard roles are added as aliases, per-node mode overrides become per-element pins, and gradient-style stop colors become tokens (see "Importing a Design System from Figma" above).
- Generate, on save, a `Styles/.gen/<name>.gen.yaml` artifact of fully resolved values for external tools (Style Dictionary, Tokens Studio, custom build scripts). These `.gen` files are git-ignored and must never be hand-edited.
- Survive a `.ds` file with a syntax error: the design keeps rendering against the last version of that file that parsed, and a notification names the file and the first error (it stays until dismissed, and clears itself when the file parses again). While a file is broken, brand and mode switches on it are declined rather than rewriting the file over your unfinished edit. A deleted `.ds` is not an error, it simply stops contributing.

Cannot:
- There is **no standalone variables / token editor panel**. Token authoring (new tokens, renames, deletes, scale tweaks, mode overrides) is done by editing the `.ds` source, not through inspector buttons. There are no in-app rename or delete buttons for tokens.
- There is **no default keyboard shortcut** for switching brand or mode; use the inspector dropdowns.
- There is **no export to CSS variables or Tailwind config** from the UI; external tools consume the `.gen.yaml` artifact.

Figma import boundaries (each announced in the import warnings, never silent):
- **Gradient geometry is not themable.** A gradient paint style brings its stop *colors* across as tokens, but the gradient's geometry (angle, stop positions) imports as fixed values, not tokens.
- **Image paint styles stay literal.** A photo/image paint style has nothing single-valued to tokenize, so it imports as a literal image fill.
- **Some text-style details stay on the element, not the token.** Italic, text case, text decoration, a pixel line-height unit, and a percent letter-spacing unit are kept on the imported elements but are not carried into the typography tokens (Brilliant's typography tokens do not express them). The expressible parts of the type style still become a token.
- **T-shirt role names are aliases only.** When a large numeric scale imports, Brilliant may add t-shirt role names (`spacing.md` and friends) as aliases, but element bindings stay on your faithfully-named tokens: a numeric binding is never redirected onto a role alias.
- **Your role names are never overwritten.** If a Figma variable already owns a standard role name, Brilliant keeps your token and adds no competing alias; a dark-theme sibling of that variable stays its own separate token rather than folding onto the role.

## Design System Commands

Most are in the command palette under the design-system group. The two exceptions are **Set Design System** and **Set Design System Mode**: these do not appear in the palette and are driven only by the inspector dropdowns. Brand/mode/reset operations are undoable via the per-canvas undo stack (Cmd+Z).

| Command (display name) | Purpose |
|---|---|
| Set Design System | Brand setter for the current scope (not in the palette; driven only by the inspector brand dropdown) |
| Set Design System Mode | Per-axis mode setter (not in the palette; driven only by the inspector axis dropdowns) |
| Apply Typography Token | Apply a `typography.*` composite to selected text element(s) |
| Apply Shadow Token | Apply a `shadow.*` composite to selected element(s) |
| Unbind Tokens | Replace all token bindings on the selection with literal values and drop the binding |
| Create Design System Viewer | Insert an 800x600 viewer element visualizing the active system |
| Open Design System File | Open the nearest `.ds` source in the code editor |
| Regenerate Design System | Rebuild all `.gen.yaml` files from their `.ds` sources |
| Reset Design System | Rewrite the design system source with Brilliant's built-in seed template, replacing the current tokens (undoable) |

Note: the **Reset Design System** command rewrites the *source file* with Brilliant's built-in seed template (the same defaults a fresh project starts with), replacing every authored token; Cmd+Z restores what was there before. The **Reset design system** button in the inspector is a different action: it clears brand/mode overrides at the inspected scope without touching the source.

## Related Knowledge

- Authoring or editing the system's tokens (the `.ds` DSL, brands, modes, composites): `design-systems/core`, `design-systems/authoring`, `design-systems/authoring-modes`.
- Referencing tokens in blueprint markup: `blueprint/core` and the other `blueprint/*` files.
- Colors, fills, strokes, opacity, corner radius in the UI: `reference/styling`.
- Effects (shadows, glows, blurs): `reference/effects`.
- Components and instances: `reference/components`.
- Library design systems and library instances (which default to the library's own tokens): `reference/libraries`.
- Importing from Figma (connecting Figma, plugin vs URL, what else comes across): `reference/canvases`.

---

# Components

Components let you create reusable design elements. A **master component** defines the source of truth, and **instances** are linked copies that stay in sync with the master while allowing per-instance overrides.

## Concepts

| Term | Description |
|------|-------------|
| **Master component** | The original frame that defines the component. Changes to the master propagate to all instances. |
| **Instance** | A linked copy of a master. Inherits all properties from the master unless overridden. |
| **Override** | A property change on an instance that differs from the master. Overrides are preserved during sync. |
| **Slot** | A child inside a component whose subtree is fully owned by each instance (sync skips it). Slots can only be designated through blueprint authoring; there is no by-hand UI to mark an element as a slot. |
| **Component set** | A component that holds multiple **variants** organized by named **properties**. Figma-style "variants." An instance of a set shows whichever variant matches its current configuration. |
| **Property** | A named axis of a set (e.g. "State", "Size"), each with a list of possible **values** (e.g. on/off, sm/lg). |
| **Variant** | One member frame of a set, tagged with a value for each property (e.g. State=on, Size=lg). Each property-value combination maps to one variant. |
| **Configuration** | The set of chosen values (one per property) carried by an instance. The configuration selects which variant the instance displays. |

## Creating a Component

1. Select one or more elements on the canvas
2. Press **Cmd+Alt+K** (or use the **Create Component** command via command palette, or right-click and choose **Component → Create Component**)
3. The selection becomes a master component

There is no separate Components panel or page in the left toolbar, and components are created from selection on the regular canvas: masters and instances are normal frames distinguished by their diamond icon and purple label. The right inspector does, however, show a contextual **Component** section when a component, set, variant, or instance is selected (see [Component Sets, Variants & Properties](#component-sets-variants--properties)).

**What happens:**
- The frame becomes the master (the source of truth for its instances)
- Every element inside it is linked to the matching child in future instances
- The frame label and selection chrome turn purple
- In the layers panel, a filled diamond icon marks the master

**Validation:** Selection is rejected if any selected element is a non-instance descendant of a component instance (you cannot wrap a child of someone else's instance into a new component). Existing component masters and component instance roots CAN be wrapped into a new outer component.

**Auto-wrapping behavior:**
- One non-frame element selected, or multiple elements selected: a wrapping frame is created at the combined bounds, the selection is reparented into it, and the frame is converted to a component master. The frame's name defaults to a unique `Component`/`Component 2`/etc.
- One plain frame selected: in-place conversion (no extra wrapper). The frame is marked as the master and its existing children become master children.
- The wrap path runs per-parent: selecting elements across multiple parents creates one component per parent group.

## Creating an Instance

1. Select a master component
2. Use the **Create Instance** command (via command palette, or right-click and choose **Component → Create Instance**)
3. A linked copy appears offset 50px down and to the right of the master

**What happens:**
- A full copy of the master's contents is created
- The copy is linked back to the master (root to master, each child to its matching master child)
- The instance is automatically selected

You can also create instances at a specific position programmatically.

**Duplicate and copy-paste behavior:** Duplicating a component master (Cmd+D) creates an **instance**, not a second independent master. The same applies to copy-pasting a master -- the pasted result is an instance linked to the original master. Duplicating or pasting a component instance creates another instance linked to the same master.

## Component Sets, Variants & Properties

A **component set** is the Figma-style "variants" feature. Instead of one master, a set groups several **variants** of the same component (e.g. a button's default / hover / pressed looks) and organizes them along named **properties** (axes). Each property has a list of values, and every property-value combination maps to one variant. An **instance** of a set carries a **configuration** (one value per property) and displays the matching variant. To switch an instance's look, you flip its property dropdowns rather than swapping in a different element.

### Creating a set

1. Select two or more frames on the canvas (each becomes one variant)
2. Right-click and choose **Create Component Set** (also available in the command palette)
3. The frames are combined into a new set, one variant each

You can also grow a single component into a set later with **Add Variant** (see below).

### The Component inspector section

When a set, variant, or instance is selected, a **Component** section appears in the right inspector. It has three modes depending on what you have selected:

**Set selected.** The section header shows two buttons:
- **+ Add Property** -- adds a new property (axis). Name it in the row that appears; suggestions are Size, State, Type, and Variant.
- **+ Add Variant** -- adds another variant frame to the set.

Below the header, each property shows a row with its editable name and a **−** button to remove that property.

**Variant selected.** One dropdown per property lets you set THAT variant's value -- its coordinate within the set (e.g. State = on, Size = lg). If two variants end up with the same combination of values, a **"⚠ Multiple variants share the same property values"** warning appears so you can disambiguate them.

**Instance selected.** One dropdown per property lets you PICK the configuration -- i.e. flip the instance to a different variant (e.g. set State to on). The instance immediately re-renders as the matching variant. If the instance contains nested instances, their dropdowns are surfaced too, indented beneath the parent's.

### Using a set

1. Create an instance of the set (Create Instance, or duplicate / copy-paste an existing instance)
2. Select the instance
3. In the Component section, flip the property dropdowns to choose its variant

This is the "flip a switch to a state" workflow: one instance, reconfigured by picking values, with no need to detach or swap elements.

## Visual Indicators

### Canvas

| Visual | Meaning |
|--------|---------|
| Purple frame label | Element is a component master or instance root (labels of plain frames inside a component stay gray) |
| Purple selection chrome | Element is part of a component (master or instance) |
| `◆` prefix on the frame label | Component master only. Instances get the purple label color but NO diamond prefix on canvas; the master/instance distinction is shown in the layers panel icon, not the canvas label. |

### Layers Panel

| Icon | Meaning |
|------|---------|
| Filled diamond | Master component |
| Diamond outline | Component instance |
| Switch (filled / outline) | A **boolean slot**: the on/off wrapper a Figma boolean property imports as (a two-state component instance around a shown/hidden child). Filled = on, outline = off. It reads as a toggle rather than a duplicate layer; hovering names it a switch. |

## Overrides

When you change a property on an instance or one of its children, that change is automatically tracked as an **override**. From then on, edits to the master no longer touch that property on this instance: your override wins and is preserved through future syncs. Override tracking is automatic; there is nothing to mark or confirm.

### What syncs, what doesn't

When you edit a master, those edits flow down to every instance **except where you've overridden**. Almost everything participates: fills, strokes, text content and styling, rotation, flips, shape geometry, corner radii, frame/layout properties, sizing mode, effects, opacity, circle arc/ring settings, aspect-ratio lock, and element-level design-system bindings.

A few things stay independent and do NOT flow from master to instances:
- **Blend mode** -- set it per instance if you need it to differ. (Changing blend mode on an instance is also not treated as an override.)
- **Shadow token reference, crop, and element-level opacity token** -- managed per element.
- **The instance's name** and a few root-only details -- renaming the master frame does not rename instances, though renaming a master's *child* does propagate to the matching child in each instance.

## Syncing

When you edit a master component, all instances update automatically:

- Non-overridden properties are copied from the master onto each instance child
- Overridden properties are left untouched on the instance
- Children you add to the master appear in every instance
- Children you remove from the master are removed from every instance
- Child ordering (z-order) is kept in step with the master

**Slot content** is the exception: a child designated as a slot is owned by the instance, so syncing never overwrites it.

### What You Cannot Do on an Instance

The structure of an instance is owned by its master, and Brilliant prevents instances from drifting structurally:

- You cannot drag elements into an instance to add new children -- the drop is rejected
- You cannot drag elements out of an instance to reparent them elsewhere
- Adding, removing, or reordering children must be done on the master, and it propagates to every instance
- The one exception is **slot content**: anything nested inside a slot is a normal drop target, because the instance owns it

If you need an instance to fully diverge from its master, **detach** it first.

## Resetting Overrides

To restore an instance to match its master:

1. Select a component instance
2. Use the **Reset Component Instance Overrides** command (via command palette, or right-click and choose **Component → Reset Overrides**)

**What happens:**
- All overrides on the instance are cleared
- The instance re-syncs from the master, pulling fresh values for every property
- The entire instance, including its children, is refreshed to match the master

## Detaching an Instance

To break the link between an instance and its master:

1. Select a component instance
2. Press **Cmd+Alt+B** (or use the **Detach Instance** command via command palette, or right-click and choose **Component → Detach Instance**)

**What happens:**
- The link to the master is removed from the frame and all its contents
- The frame becomes a regular frame with no component links
- Future changes to the master will not affect this frame
- The frame's content is preserved as-is

## Ungrouping a Component

When you ungroup a component frame, the component links are automatically cleaned up first:

- **Ungrouping a master component** detaches all instances of that master (making them regular frames), then removes the component status from the master, then ungroups the frame normally.
- **Ungrouping a component instance** detaches the instance first (breaking the link to the master), then ungroups the frame normally.

## Navigating to the Master

When you have an instance selected:

1. Use the **Go to Master Component** command (via command palette, or right-click and choose **Component → Go to Master**)
2. The master component is selected and the camera moves to center it

If the master lives on a different canvas, Brilliant switches to that canvas first, then selects and centers the master. The camera stays put when the master is already comfortably in view (so it won't jump when the master sits right next to the instance), and it never zooms in past 100% just to fill the screen with a small master (a large master zooms out enough to fit).

## Cross-Canvas Components

A master component can live on a different canvas than its instance. This lets you keep masters on a dedicated "components" canvas and use instances throughout the rest of your project. (A master can also live in a different **project** entirely: a library your project depends on at a pinned version. Library instances behave like any other instance, with a few extra states of their own; see [libraries.md](./libraries.md).)

How it works:

- An instance remembers which canvas its master lives on
- When you open the instance's canvas, Brilliant finds the master and syncs the instance to the latest master values
- Editing a master updates instances on every canvas you currently have open; instances on canvases you haven't opened pick up the latest values the next time you open them
- **Go to Master Component** works across canvases: it switches to the master's canvas when needed, then selects and centers the master. **Push Overrides to Master** only works when the master is on the canvas you're currently viewing, so switch to the master's canvas first to push to it.
- Pasting a master into a different canvas creates an instance that points back to the original master (the master is not duplicated)

**Caveats:**
- Deleting a master does not immediately detach instances on canvases you don't have open. Those instances are cleaned up the next time you open their canvas.
- If a canvas full of cross-canvas instances is the first thing you open in a session, those instances may not find their master yet. To be safe, open the master's canvas first, then the canvas that uses it.

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Create Component | **Cmd+Alt+K** |
| Detach Instance | **Cmd+Alt+B** |
| Create Component Set | Command palette / right-click (no default keybinding) |
| Create Instance | Command palette only (no default keybinding) |
| Reset Component Instance Overrides | Command palette only (no default keybinding) |
| Go to Master Component | Command palette only (no default keybinding) |
| Push Overrides to Master | Command palette only (no default keybinding) |

**Push Overrides to Master**: When you've made overrides on an instance that should become the new default, use this command (via command palette, or right-click and choose **Component → Push Overrides to Master**) to apply the instance's overrides back to the master component. All other instances will then sync to the updated master values. This command only works when the master is on the same canvas as the instance.

## What's Not Supported

Brilliant components are a master/instance system with property overrides, slots, component sets (variants), and cross-canvas references. The following Figma-style concepts are NOT currently in Brilliant:

- **Swap Instance.** There is no swap-instance UI or command. To switch an instance to a different master, detach it and create a fresh instance of the other master. (Within a component set, you don't swap -- you flip the instance's property dropdowns to pick a variant.)
- **Components panel / page.** There is no left-toolbar Components panel and no separate "Components" canvas type. Masters live as regular frames on a canvas; you can keep them on a dedicated canvas by convention and reference them across canvases. (A contextual Component section does appear in the right inspector when a component, set, variant, or instance is selected.)
- **Per-property override badges.** There is no chip or label that flags which individual property is overridden on an instance. The Component section shows property dropdowns for sets and instances, but it does not mark which properties you've overridden; the visible component chrome is the purple frame label and the diamond icon (filled = master, outline = instance).
- **Component descriptions or metadata** (no description field, no documentation popovers)
- **A separate component file format.** Masters live on canvases inside a project. Sharing components ACROSS projects is done by publishing the whole project as a **library** and depending on it at a released version; see [libraries.md](./libraries.md).
- **Component diff view** (no side-by-side master vs instance comparison UI)
- **Nested overrides exposed as instance properties** (overriding a nested instance child works, but there is no "exposed property" surface on the parent instance)

## Tips

- **Edit the master to update all instances.** Change colors, text, or layout on the master and all linked instances update automatically (respecting overrides).
- **Override strategically.** Only override what needs to differ per instance (e.g., text content, fill color). This keeps instances in sync for structural changes.
- **Use Reset Overrides to start fresh.** If an instance has drifted too far from the master, reset and re-apply only the overrides you need.
- **Detach before diverging completely.** If an instance needs to become fully independent, detach it first to avoid unexpected syncs.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Instance not updating when master changes | Property was overridden on the instance | Reset overrides, then re-apply only needed changes |
| Blend mode change on master not reaching instances | Blend mode stays independent per instance by design | Set blend mode on each instance individually, or detach if you need it managed separately |
| Cannot create component | No element selected, or the element is part of someone else's instance | Select elements outside any component instance, or select the instance root itself (it CAN be wrapped). Non-frames are auto-wrapped. |
| Cross-canvas instance lost its component link after reopening | The instance's canvas was opened before its master's canvas in this session | Open the master's canvas first, then the canvas that uses it |
| Push Overrides to Master does nothing | Master is on a different canvas than the instance | Switch to the master's canvas before invoking the command (Go to Master switches canvases for you) |
| Instance child not syncing | Child is a slot | Slots are owned by the instance; edit them directly |
| Cannot drop element into component instance | Instances can't take new children | Drop into a slot, or detach the instance first |

## Authoring Components via Blueprint

Components, instances, sets, variants, slots, and per-instance overrides can also be authored programmatically (the AI's blueprint path) rather than by hand on the canvas. The hand-driven flows above and the blueprint flows produce the same data: a master created in blueprint can be instanced and overridden by hand, and vice versa. For the blueprint authoring syntax (the component, instance, variant, slot, and override keywords and cross-canvas referencing), see the blueprint knowledge files. Do not author that syntax from this reference.

> **See also:** [frames.md](./frames.md) for parent types, auto layout, and nesting
> **See also:** [editing.md](./editing.md) for selection and navigation within component hierarchies
> **See also:** [libraries.md](./libraries.md) for consuming components from other projects (libraries), and the Assets view

---

# Export & Import

Brilliant exports the current selection (never the whole canvas automatically) to many formats, and copies elements to the clipboard in several representations. It imports SVG files, Sketch files, Figma designs (via URL), images, and pastes from the clipboard.

Selecting a frame includes all of its children in the export. To export everything on a canvas, select all (`Cmd+A`) first.

## Where export lives in the UI

There are three by-hand entry points:

1. **Export panel (right toolbar)**: the main hub. Appears at the bottom of the right toolbar when one or more elements are selected. Choose format, resolution, fit, background, video options, PDF page mode, and run multiple export configs in one click. This is the only place plain video (MP4/MOV) and PDF multi-page are available.
2. **Commands / shortcuts**: `Cmd+E` exports PNG with a save dialog. All other format commands are reached through the command palette.
3. **Right-click context menu**: `Export as` submenu (quick file export), `Copy as` submenu (clipboard), and `Send to` submenu (Figma).

`Cmd+E` (PNG) is the only export keyboard shortcut. Every other format is reached via the command palette, the right-click submenus, or the Export panel.

## Export formats

| Format | Type | Notes |
|--------|------|-------|
| **PNG** | Raster | Transparency supported. Default for `Cmd+E` |
| **JPEG** | Raster | No alpha. Transparent background auto-substitutes the canvas color. Quality 90 in the UI |
| **WebP** | Raster | Transparency supported. Native libwebp on macOS and Windows; Linux falls back to PNG bytes. UI exports lossy q=90 (see "WebP quality" below) |
| **SVG** | Vector | Fonts travel with the file: the faces your text uses embed as `@font-face` (self-contained, works offline and in `<img>`); a face that cannot embed falls to a Google Fonts `@import` and is named in the export warnings. Native filters for drop shadow, outer glow, layer blur. Shader fills, inner shadow/glow, background blur, color-adjust, and image-filter fills are embedded as rasterized PNG. Angular (sweep) gradients are approximated as linear |
| **PDF** | Vector | Embedded fonts (Google Fonts cache + system, Helvetica fallback; a Helvetica substitution names the family in the export warnings, never silent). Any element with an enabled effect is rasterized whole. Supports single-page or multi-page |
| **HTML** | Markup | HTML + inline CSS. Three variants: snippet, full document (with Google Fonts link), and flex (auto-layout frames become `display:flex`). Shader fills on rectangles, full circles, and frames export as LIVE animated WebGL `<canvas>` elements (one appended `<script>` carries the runtime + shader sources; `reactiveGrid` stays mouse-interactive). Shader fills on vectors, text, or strokes are embedded as rasterized PNG. Command palette / Copy as only |
| **React (JSX)** | Markup | Same DOM as HTML, JSX style objects, camelCase attrs. Pasteable into a `.tsx` file. Shader fills are embedded as rasterized PNG (a bare JSX snippet has no script slot). Command palette / Copy as only |
| **MP4** | Video | No alpha. macOS: H.264 or HEVC (VideoToolbox). Windows: H.264 only (Media Foundation). Not available on Linux. Export panel only |
| **MOV** | Video | HEVC (with alpha) or ProRes 4444. macOS only (Windows has no QuickTime writer; Linux has no video export), supports transparent background. Export panel only |
| **Replay** | Video | Animated reveal: elements fade in one after another with a shimmer pass. Defaults to MP4 (macOS and Windows); MOV is selectable on macOS (required for a transparent background). Has a command and a context-menu entry |

MP4 export runs on macOS (VideoToolbox, H.264/HEVC) and Windows (Media Foundation, H.264 only). MOV and its alpha-capable codecs are macOS only. Linux has no video export. Replay follows the same rules as its chosen container (MP4 on macOS and Windows; MOV on macOS).

### WebP quality

The Export panel and the `Copy as WebP` command both produce lossy WebP at quality 90. For UI mockups (cards, panels, gradients, rounded corners), lossy q=90 leaves visible gray banding on rounded edges and color ramps. For pixel-clean UI mockups, prefer **PNG**. Lossless WebP is not exposed in the by-hand UI in this build (it is only reachable programmatically via the MCP `export` tool with `webpLossless: true`).

### Text ranges: hyperlinks and gradients

**Text stays text everywhere possible.** Non-gradient text ranges export as real text in every lane.

- **A gradient on a text range** now carries in every format.
  - **PNG/JPEG/WebP** read back the live canvas exactly as on screen.
  - **SVG** and **PDF** outline just the gradient-filled glyphs to vector paths filled with the gradient (Figma's own move), keeping every other character as real text.
  - **HTML/React** paint the span with `background-clip:text` (a real, selectable text span; exact and resolution-independent).
  There is no longer a silent fall to the base text color: if a lane cannot carry a range gradient (e.g. a web SVG export with no glyph geometry, or an exotic font in PDF) it still emits the gradient the best way it can and says so loudly in the export result (enumerated, never silent).
- **A hyperlink on a text range** exports as a real anchor in **HTML** (`<a href>`) and **SVG** (`<a xlink:href>`). **PDF** and the raster formats (**PNG/JPEG/WebP**) do not carry a clickable link (the PDF exporter draws glyphs, not link annotations), so linked text exports as ordinary styled text (a named, reported boundary).

So gradient-filled text now survives every export lane; HTML and SVG additionally keep the links.

## Export commands

| Command | Shortcut |
|---------|----------|
| Export to PNG | **Cmd+E** |
| Export to JPEG | command palette |
| Export to WebP | command palette |
| Export to SVG | command palette |
| Export to PDF | command palette |
| Export to HTML | command palette |
| Export to React (JSX) | command palette |
| Export to Replay | command palette / context menu (both render at 2x scale) |
| Send to Figma | command palette / `Send to → Figma` (only enabled when the Brilliant Figma plugin is paired; otherwise falls back to clipboard) |

Plain MP4/MOV have no command or shortcut. They are reachable only from the Export panel. Replay is the one video format with a command because it has a sensible one-click default.

### File export flow (by hand)

1. Select elements on the canvas. Selecting a frame includes its children.
2. Run the export command (`Cmd+E`, command palette, or right-click `Export as`), or configure and click `Export` in the Export panel.
3. A save dialog opens with a timestamped default filename.
4. Choose location and save.

## Export panel options (right toolbar)

The Export panel appears when elements are selected.

| Option | Values | Default |
|--------|--------|---------|
| **Format** | PNG, JPEG, WebP, SVG, PDF, HTML, React (JSX), MP4, MOV, Replay. Choosing HTML reveals a **Variant** dropdown (`Page`, `Snippet`, `Flexbox`) | PNG |
| **Resolution** | `Original (1x/2x/3x/4x)`, `720p`, `1080p`, `1440p`, `4K`, `8K`, `Portrait Post · IG, FB` (1080x1350), `Square Post · IG, X` (1080x1080), `Story / Reel · IG, TikTok` (1080x1920), `iPhone 16 Pro` (1206x2622), `MacBook Pro 14"` (3024x1964), `Custom`. Hidden for vector formats (SVG, PDF) | `Original (1x)` |
| **Width / Height** | Target pixel size for raster/video. Set one to scale proportionally, or both with a fit mode for exact size | none |
| **Fit mode** | `Fit` (letterbox), `Fill` (crop), `Stretch` (non-uniform), `Repeat` (1:1 tiled). Only used when both width and height are set | `Fit` |
| **Background** | `Transparent`, `Canvas` (canvas background color) | `Transparent` |

Notes:
- JPEG and MP4 have no alpha: a Transparent request falls back to Canvas. PNG and MOV (HEVC-with-alpha or ProRes 4444) keep alpha.
- The UI ships JPEG at quality 90 with no slider, and WebP as lossy q=90 with no lossless toggle.
- For SVG and PDF the Resolution row is hidden (vector output is resolution-independent).

### Batch export (multiple configs)

The `+` button in the Export panel header (`Add export config`) appends another export row. Each row has its own format, resolution, fit mode, and background. The `Export` button runs every row from a single click. Use this to ship, for example, PNG @1x, PNG @2x, and SVG together.

## Video export (MP4 / MOV)

Video export renders animated shader fills frame by frame into a hardware-accelerated file (macOS via VideoToolbox, Windows via Media Foundation; not on Linux). It is available **only from the Export panel** (no command, no shortcut, no context menu). Replay is the exception.

Flow: select elements, choose MP4 or MOV in the format dropdown, configure the inline video options, click `Export`, then save. A progress bar shows "Frame X / Y" and can be cancelled.

| Option | Values | UI default |
|--------|--------|------------|
| **Duration** | 0.5 to 60s (draggable + preset dropdown) | 10s |
| **FPS** | 15, 24, 30, 60 | 60 |
| **Quality** | Low, Medium, High | Medium |
| **Resolution** | Same presets as image export | Original (1x) |

Codecs are constrained by format: MP4 offers H.264 and HEVC (no alpha); MOV offers HEVC (alpha) and ProRes 4444 (alpha, largest files). The codec dropdown adjusts automatically when you switch format. Only MOV with HEVC-with-alpha or ProRes 4444 supports a transparent background; MP4 always renders opaque (falls back to canvas color). On Windows only H.264/MP4 is available: no HEVC, no MOV, no alpha (the codec dropdown is fixed at H.264).

Video currently animates shader fills only (metaballs, liquid metal, holographic, etc.). Static elements look identical in every frame. There is no keyframe-timeline animation.

### Replay export

Replay is a one-click animated reveal of the current selection: each element fades in one after another with a shimmer pass. It defaults to MP4, but you can switch the container to MOV (required if you want a transparent background). Run it from the command palette (`Export to Replay`) or the right-click `Export as → Replay` (both render at 2x scale for crisp retina output), or the Export panel (which follows the panel resolution, default 1x).

| Option | Values | Default |
|--------|--------|---------|
| **Container** | MP4, MOV | MP4 |
| **Codec** | H.264, HEVC, ProRes 4444 (filtered by container) | H.264 |
| **Quality** | Low, Medium, High | Medium |
| **Pacing (ms per element)** | 10, 25, 50, 75, 100, 150, 200, 250, 300, 400 (presets) or a custom value | 150ms |
| **Intro text** | Optional short text card shown before the reveal | none |
| **Resolution** | Same presets as image/video export | Original (1x) |
| **Background** | Transparent (MOV + HEVC/ProRes only) or Canvas | Transparent |

Total duration is derived automatically from pacing times element count (there is no separate duration field).

## PDF multi-page

PDF is the one format with a multi-page mode (Export panel only). Use the inline **Pages** dropdown next to the PDF format pill to switch single-page vs multi-page.

- **Single-page (default):** the whole selection on one page sized to its bounding box.
- **Multi-page:** one page per top-level frame in the selection. If the selection has frames, loose top-level elements are ignored; if there are zero frames, each loose top-level element becomes a page.
- **Page order:** defaults to canvas reading order (top to bottom, left to right). The settings panel (gear button) shows the page list; drag rows to reorder.
- **Per-page include toggle:** the settings panel has a checkbox per page to exclude individual frames without deselecting them.

Multi-page is a per-config-row setting, so a single batch click can ship a single-page and a multi-page PDF together.

## Separate files (multi-selection, PNG/JPEG/WebP/SVG)

When you select **two or more frames** (or other top-level elements) and export a raster format (PNG/JPEG/WebP) or SVG, Brilliant exports **one file per selected element by default** rather than merging them into a single image, the same behavior as Figma.

- A **Files** dropdown appears (Separate files / Single file) whenever a raster or SVG export has 2+ export targets. For SVG it sits inline next to the format pill; for raster it's the first row inside the settings panel (gear button). It defaults to **Separate files**.
- Pick **Single file** to go back to the old behavior: the whole selection rendered into one merged image.
- **Desktop:** exporting separate files asks for one destination **folder** (a single pick for the whole batch); each element is written into it. Files with the same name get `-2`, `-3`, … suffixes.
- **Web:** the files are bundled into a single **zip** download.
- Nesting: a selected element inside another selected frame is exported as part of that frame, not as its own file. Only "selection roots" (selected elements with no selected ancestor) become files.
- SVG and PDF are separate concerns: PDF uses its multi-page mode; raster/SVG use this separate-files mode.

## Copy to clipboard (Copy as)

Copy the selection to the clipboard in several representations. Useful for pasting into code editors, docs, other design tools, or chat. Reach these from the command palette or the right-click `Copy as` submenu.

| Command | What it copies |
|---------|----------------|
| Copy as PNG | PNG image at screen resolution (device pixel ratio) |
| Copy as WebP | WebP image, lossy q=90 (macOS and Windows; Linux falls back to PNG). Narrow app support, prefer PNG |
| Copy as SVG | SVG markup text |
| Copy as HTML | HTML/CSS snippet (auto-layout frames absolute-positioned) |
| Copy as HTML (document) | Self-contained HTML document with Google Fonts link for detected web fonts |
| Copy as HTML (flex) | HTML where auto-layout frames emit `display:flex` + gap + padding |
| Copy as React | React JSX snippet (camelCase style object and SVG attrs) |
| Copy as CSS | CSS properties (size, position, colors, border, radius, rotation, text) |
| Copy as Blueprint | Brilliant's native element format, lossless with full hierarchy; pasteable back into Brilliant or shared with AI tools |

The right-click `Copy as` submenu contains: PNG, PNG @2x, PNG @4x, WebP, SVG, HTML, React, CSS, Blueprint. The @2x / @4x entries multiply the PNG scale for higher-resolution clipboard output.

Clipboard notes:
- **PNG** copies at device pixel ratio so what you see on screen matches what you paste (WYSIWYG). @2x / @4x multiply that.
- **WebP** is written under the `org.webmproject.webp` UTI on macOS, or as a `.webp` file to the clipboard on Windows (Linux falls back to PNG). Most apps prefer PNG when both are offered, so use `Copy as PNG` for general pasting. Always lossy q=90 on this path.
- **CSS** emits the first solid fill and first solid stroke only; corner radius only for frames (not rectangle elements); only `linear-gradient` (any gradient fill, including radial, is emitted as a linear-gradient, so radial gradients render incorrectly rather than being omitted); no opacity, effects, or image fills.

## MCP export tool (for AI agents)

AI agents can export programmatically via the MCP `export` tool. It handles raster (PNG, JPEG, WebP), vector (SVG, PDF), HTML/React markup, and video (MP4, MOV: use `duration`, up to 30s, and `fps`). Only **Replay** is UI/command only (it needs an interactive recording session, so the tool returns a clear error). For UI mockups exported as WebP, pass `webpLossless: true` to avoid q=90 banding. The full parameter schema is delivered with the tool itself.

## When rendering has stopped

Every export renders through the canvas engine, so if the engine stops for the session (the canvas shows the "Something went wrong rendering the canvas" panel), exports refuse instead of producing files. You get a clear message naming the state, and the fix is the panel's own **Restart rendering** button. Once the canvas is back, export again. This applies to every format, to Copy as PNG/WebP, to video and replay, and to the MCP `export` tool, which answers with the same reason. Retrying the export without restarting rendering will keep refusing, by design: it prevents empty or half-drawn files that look like real output.

On some machines rendering can't start at all because the computer's graphics hardware isn't supported or its graphics driver is out of date. The canvas then shows a distinct panel ("Brilliant can't render on this graphics hardware") rather than the transient one, and **Restart rendering** won't bring it back until the driver is updated (or the file is opened on a machine with a supported GPU). Exports refuse the same way in that state, so there's nothing productive to retry until the underlying graphics issue is resolved. The panel's **Report** button copies a diagnostic signature (the failure detail, the graphics backend, and the OS) to share in a support conversation.

## Other application formats

| Format | Import | Export | Notes |
|--------|--------|--------|-------|
| **.sketch** (Sketch) | Yes | Yes | Import via "Import Sketch File" (command palette), with page selection in the right toolbar. Export via "Save as Sketch File" (command palette) |
| **.fig / Figma** | Via Figma URL (API) or the plugin (paste) | Via "Send to Figma" (live plugin) | "Import from Figma" opens the import section in the right toolbar to paste a Figma URL (OAuth). Does not import `.fig` files directly. "Send to Figma" pushes the selection to the paired Brilliant Figma plugin. See "Send to Figma fidelity" below |

### Send to Figma fidelity

Sending the selection to the paired Brilliant Figma plugin round-trips most of a design as native, editable Figma objects, not a flat image:

- Design-system tokens become Figma variable collections (per brand and mode) with colors, spacing, and numerics bound onto the nodes; typography and shadow tokens become Figma text and effect styles.
- Components and instances rebuild as Figma components, with instance overrides reapplied (fills, strokes, effects, opacity, corner radii, and text).
- Auto layout (including wrap and its cross-axis gap), per-side borders, dashes, masks, boolean shapes, tiled and cropped images, text case, strikethrough, vertical alignment, and liquid glass all map to their Figma equivalents.
- Hidden elements ship as hidden. Variant names with reserved characters are sanitized automatically.

Fills that Figma can't express (shader fills and image-filter fills) are pre-rasterized to an image so they still look right, and are no longer editable as parameters on the Figma side.

Known gap: component boolean, text, and instance-swap properties do not transfer in either direction. Variant properties transfer fully; the other property kinds arrive as their current baked state.
| **.ai** (Illustrator) | No | No | Bridge through SVG: export from Illustrator as SVG, then import |
| **.psd** (Photoshop) | No | No | Export Photoshop layers as PNG, then import as images |

## Import

### Images

| Action | How |
|--------|-----|
| Import file | **Cmd+Shift+O** or command palette "Import" (images, SVG, and `.bl` design files) |
| Paste from clipboard | **Cmd+V** with an image on the clipboard |
| Drag and drop | Drag image files onto the canvas |
| Import from Figma | Command palette "Import from Figma" (opens the import section in the right toolbar; paste a Figma URL) |

Supported image formats: PNG, JPEG, GIF, BMP, WebP. On macOS also TIFF, HEIC, HEIF, AVIF (converted natively). Imported images become rectangle elements with an image fill, placed at the canvas center.

### SVG

| Action | How |
|--------|-----|
| Import SVG file | **Cmd+Shift+O** (select a `.svg` file) or command palette "Import SVG" |
| Paste SVG markup | **Cmd+V** with SVG text on the clipboard |

SVG import creates native Brilliant elements: rectangles become rectangles, circles/ellipses become circles, paths become vectors, groups become frame parents with children, text becomes text. Fills, strokes, and transforms are preserved. Imported elements are centered and selected. Icons and simple illustrations import cleanly; complex SVGs may need cleanup.

### Sketch

Command palette "Import Sketch File" opens the Sketch import section in the right toolbar where you browse for a `.sketch` file. After parsing, a page selection UI lets you pick which pages to import. Each chosen page becomes a separate canvas with its elements converted to native Brilliant elements.

### Design files (`.bl`)

**Cmd+Shift+O** and selecting a `.bl` file (or legacy `.design`) imports it. Native design files are copied (with their referenced images) into an `Imports/` folder in the current workspace, registered as a new canvas, and switched to. Legacy compressed-JSON Save As files are decompressed and imported the same way. Both require an open workspace.

### Paste behavior

**Cmd+V** detects clipboard content and handles, in order: Brilliant elements (full hierarchy, same or cross-canvas), image data (becomes a rectangle with image fill), SVG markup, Figma JSON (from the Brilliant Figma plugin), Brilliant YAML, Brilliant Blueprint, HTML (converted to native elements), and finally plain text (becomes a text element).

## Tips

- `Cmd+E` runs PNG export with a save dialog (the only export shortcut).
- `Copy as PNG` copies at device pixel ratio for WYSIWYG paste; use `Copy as → PNG @2x / @4x` for higher resolution.
- Copied images contain the design only — never selection handles, guides, labels, or presence cursors. If a copy can't produce the image (e.g. the renderer is momentarily unavailable), a warning says the system clipboard was not updated — whatever you paste then is your previous clipboard content, not this copy.
- For pixel-clean UI mockups, prefer PNG over WebP: the by-hand UI exports lossy q=90 WebP, which bands on rounded corners and gradients.
- `Copy as SVG` is good for pasting vector art into web projects or other design tools.
- The `+` button in the Export panel batches multiple configs (PNG @1x, PNG @2x, SVG) into one click.
- Right-click `Export as → Replay` runs at 2x by default for crisp retina output.

## Related

- [canvases.md](./canvases.md): Canvas management and file operations
- [styling.md](./styling.md): Fills, strokes, and visual properties
- [crop.md](./crop.md): Image crop mode
- [effects.md](./effects.md): Shadows, glows, blurs, and color-adjust
- [shaders.md](./shaders.md): Animated shader fills (the only thing video export animates)

---

# Blueprint Directives

Directives edit elements that already exist. They mix freely with create
and modify lines in one call; target by 16-char `id` or session `#ref`.

A `#pricing` card from an earlier call, revised in one pass. `--` lines
are notes; an inline `// label` snapshots an undo checkpoint after its
line runs (before any indented children).

```
before(#pricing) fr s(360,480) f[(radial($primary.soft,$color.surface))] rd($radius.xl) "Glow"
-- before() on the NEW element places it earlier in z-order, behind #pricing

al(h,pad($spacing.sm)) after(#logo) parent(#nav) "Search"
-- after(#sibling) places the element right AFTER that sibling (the mirror
-- of before()). after() the LAST child appends to the end. The element id
-- must LEAD the line: `#icon after(#label)`, never `after(#label) #icon`.

#icon after(#label)
-- on an existing element, after() reorders it to sit just after #label
-- (reparenting into #label's parent if needed). before() mirrors it:
-- `#icon before(#label)` reorders #icon to sit just BEFORE #label, likewise
-- reparenting into #label's parent when they differ. Both work on existing
-- elements and on new ones.

#popular parent(#pricing)
-- parent() reparents an existing element; its on-screen position holds
al(v,g($spacing.sm)) s(fill,hug) parent(#pricing) "New row"
-- on a CREATE, parent() puts the new element inside #pricing instead of as a sibling

ungroup(#legacy_header)
-- ungroup() dissolves a frame/group, lifting its children into the parent

replace(#cta) al(h,x(c),y(c),g($spacing.sm),pad($spacing.sm,$spacing.lg)) s(fill,hug) f[($color.primary)] rd($radius.md) "Buy"
-- replace() deletes #cta, inserts the new element at its exact position

delete(#placeholder)  // structure revised
-- delete() removes an element and its children

clone(#pricing) p(400,0) ds(, theme(dark)) "Pricing Dark" #pricing_dark
  #plan_name t("Pro")  // dark variant added
-- clone() deep-copies; clone-line props override its root, indented
-- child lines (leading #ref) retarget descendants. The // on that last
-- child checkpoints the finished clone.
```

A `// label` snapshots the session undo stack. Later, in any call this
session, jump between snapshots:

```
undo("structure revised")    -- rewind: drops #pricing_dark, back to the checkpoint
redo("dark variant added")   -- changed your mind: replay forward, it returns
```

Labels are interchangeable: `undo("dark variant added")`,
`undo(dark_variant_added)`, `undo(#dark_variant_added)`.

---

# Blueprint Vectors

Assumes: `blueprint/core`, `blueprint/paint`

## Syntax

`v(nodes[(id,x,y,type),...],edges[(id,nodeA,nodeB,haX,haY,hbX,hbY),...],closed)`

**Node types:** `st` (straight, default) · `mi` (mirrored/smooth) · `as` (asymmetric) · `di` (disconnected)

**Auto-smooth curves:** Mark nodes as `mi`, system computes tangent-based handles at 30% of edge length. No manual handle coordinates needed. Edges without explicit handles default to `(0,0,0,0)` and are auto-computed for `mi` nodes.

**Auto edges:** If edges are omitted entirely, they're generated sequentially (node 0→1→2→...).

## Stroke-only curve

```
v(nodes[(0,0,40,mi),(1,60,16,mi),(2,120,12,mi)]) s(120,48) st[($teal.mid,w($stroke.width.soft))]
```

## Area fill (closed path)

Close with straight bottom nodes + outside stroke + clip frame to hide closing edges:
```
al(v,g($spacing.none),pad($spacing.xs,$spacing.none,$spacing.none,$spacing.none)) s(hug,hug) clip "ClipFrame"
  v(nodes[(0,0,40,mi),(1,60,16,mi),(2,120,12,mi),(3,120,48),(4,0,48)],edges[(0,0,1),(1,1,2),(2,2,3),(3,3,4),(4,4,0)],closed) s(120,48) f[($teal.faint)] st[($teal.mid,w($stroke.width.soft),pos(o))]
```

Outside stroke `pos(o)` pushes boundary strokes beyond the bbox. Clip frame crops them. Top padding >= stroke width. ONE vector with both fill and stroke.

## Coordinates

`(0,0)` = top-left (highest value), `(W,H)` = bottom-right (lowest). Every node MUST have 3 to 5 values: `(index,x,y)`, `(index,x,y,type)`, or `(index,x,y,type,cap)` (the 5th stroke-cap slot is covered under Full-fidelity networks below).

## Full-fidelity networks

With explicit edges, arbitrary topology is preserved exactly, shared
nodes, T-junctions, dangling stroke edges. A node takes an optional 5th
slot for its stroke cap: `(0,0,40,mi,ar)` (`r`/`n`/`sq`/`ar`/`c`).
Regions (faces) can be declared explicitly inside `v()`:
`regions[(0+1+2+),(3+4-5+,hole)]`: each entry walks its boundary edges
(`edgeId` + `+`/`-` direction), `hole` subtracts. Assign a region's fill
with a `vr(rN) f[...]` continuation line (rN = 1-based position in the
regions list). Reading a canvas returns vectors in this same form.

---

# Design System: Authoring & Modifying

`ds_file("name")` authors or extends a brand: a top-level statement,
body is indentation-based DSL. It inherits the project `default` (the
catalog shown in your init context), so declare ONLY what differs, a
real brand is usually a few lines. Output merges into
`<canvas-folder>/Styles/<name>.ds` and runs before element rows, so
later rows can `ds(name)` it. Kebab-case; name the visual direction
(`fintech-warm`), not the task.

```
ds_file("fintech-warm")
  modes { theme: [light, dark] }          // axes; first value = default

  // PRIMITIVE (mode-independent): color(seed) → 11-stop OKLCH ramp .50…950,
  // number([list]|seed,count,ramp) → numeric scale. SEMANTIC wraps one in a
  // role vocab; mode behavior auto-applies per generator (see authoring-modes):
  primary:         boldness(color(#1976D2))            // 9 roles hint…intense
  spacing:         tshirt(number([4,8,16,24,32]), min: { none: 0 })  // xs…Nxl + named stop
  font.lineHeight: looseness(number([1,1.25,1.5]))     // 6 steps none…loose
  font.family:     "Noto Serif"                        // multi-word names need quotes; single-word fonts (Manrope, Inter) can stay bare

  // Color roles need boldness(color(...)), a bare hex is one frozen value,
  // no light/dark flip, no hover/container steps. Outside-catalog hue gets
  // its own primitive first:
  success:       boldness(color(#1AAB7A))
  color.success: success.firm // correct, mode aware dynamic resolution
  // WRONG: color.success: #bare-hex // incorrect, non-mode aware static resolution

  // Per-mode branch on an alias; $default is the fallback. Combo key
  // (`theme.dark, density.compact:`) fires only when ALL modes active:
  color.surface { $default: neutral.hint, dark: neutral.intense }

  // CUSTOM axes: `modes {}` declares any axis you like, not just the three
  // built-ins (theme, density, accessibility). A branch key on a built-in
  // axis is the bare value (`dark`); a branch key on a CUSTOM axis is
  // axis-qualified (`<axis>.<value>`), so a custom `dark` never collides
  // with theme's `dark`:
  modes { scheme: [normal, bright] }
  color.accent { $default: brand.mid, scheme.bright: brand.strong }
  // A custom-axis alias can point at a token themed on ANOTHER axis; it stays
  // mode-aware across both, resolving for every combination.
  // Selecting an axis value per frame/element is `ds(, <axis>(value))`
  // (`ds(, scheme(bright))`), the same for custom axes as for theme; see
  // design-systems/core.

  typography.h1: { fontSize: font.size.3xl, fontWeight: font.weight.bold }  // composite record
  shadow.md: [ drop(y: 2, blur: 4, color: rgba(0,0,0,0.1)) ]                // composite list

  // $type sets a token's type explicitly (string, boolean, number, …), winning
  // over the name-prefix guess. Use it for a value no prefix classifies, so it
  // isn't mis-read as a color and dropped. Mode-aware like any token:
  copy.cta { $type: string, $default: "Get started" }

  unset { color.primary, *.dark }   // drop inherited entries; *.key hits all semantics
```

After `ds_file()`, the brand becomes the session default and unstamped
frames auto-stamp it. `inherits: none` makes a brand standalone (rare);
`root: true` stops the parent-folder cascade. Comments are preserved
into `.ds` and carry to future sessions, use them for design intent.

Unsure which design system to work against, or whether you may edit one?
Do not guess: propose it with `execute_commands` `suggest_setting_change`
(see `blueprint/commands`) and let the user accept or decline.


---

