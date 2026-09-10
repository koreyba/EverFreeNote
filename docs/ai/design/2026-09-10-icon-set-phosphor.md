---
phase: design
title: Icon set — Lucide to Phosphor
description: Why the web app moved from lucide-react to @phosphor-icons/react, and the rules that keep the swap from breaking tests again
---

# Icon set — Lucide to Phosphor

## Decision

The web app renders all icons from `@phosphor-icons/react` at the default
`regular` weight. `lucide-react` is removed.

## Context

The note action bar and the formatting toolbar read as unpolished on phones.
Two causes, only one of which was the icon set:

- **Presentation.** Sizes were inconsistent across the app (14px in the note
  header, 16px in the toolbar, 20px on the back control), and Lucide's 2px
  stroke is heavy at 14px.
- **The glyphs themselves.** Compared side by side at the sizes the app really
  uses, Phosphor regular reads softer and more even in a dense toolbar.

Both weights of Phosphor and the current Lucide rendering were compared on a
generated sheet covering all 39 icons the notes UI renders, in situ in a mock
action bar. Phosphor regular was chosen.

## Scope

The swap is app-wide, including the vendored `components/ui/*` primitives.
Mixing two icon families is worse than either one: the Select caret and the
Checkbox tick sit directly beside note-toolbar icons, so a partial swap would
be visible.

77 distinct icon names were remapped. Local identifiers were preserved with
import aliases (`TextB as Bold`), so JSX bodies are untouched and the diff
stays reviewable.

## Consequences

- **Bundle.** `@phosphor-icons/react` is a barrel of ~1500 icons and the app is
  a static export (`output: 'export'`). `experimental.optimizePackageImports`
  in `next.config.js` lists the package so only the icons used are emitted;
  verified against the production build — unreferenced icons are absent from
  `out/_next/static/chunks`.
- **Weights.** Phosphor icons are fill-based paths, not strokes, so
  `strokeWidth` no longer applies. Use the `weight` prop (`regular` default,
  `fill` for a solid dot such as the unsaved-tab marker).
- **Test selectors.** Lucide emitted per-icon CSS classes (`.lucide-tag`,
  `.lucide-chevron-left`) and several Cypress specs selected on them. Those
  classes do not exist in Phosphor, so every such test broke at once.

## Rule that follows from this

Tests target `data-cy` (controls) or `data-testid` (containers) — never an
icon library's generated classes, and never visible button text that a
breakpoint can hide. See `cypress/README.md`. Stable hooks were added to the
note action bar, the workspace tab strip, the mobile tab menu, the sidebar
sign-out, the theme toggle, and the tag input while making this change.
