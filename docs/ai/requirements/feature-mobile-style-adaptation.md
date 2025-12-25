---
phase: requirements
title: Requirements & Problem Understanding - Mobile Style Adaptation
description: Clarify the problem space, gather requirements, and define success criteria for matching mobile styles with web.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- The current mobile application has a different visual style compared to the web version, leading to a fragmented user experience.
- Interactive elements (buttons, cards, inputs) do not follow a unified design system.
- Lack of a single source of truth for styles in the mobile app makes it difficult to maintain and update the design consistently.

### Current State Analysis (Audited)

**Web Version** (source of truth):
- Uses Tailwind CSS v4 with OKLCH color system
- Primary color: `oklch(60% 0.18 145)` (Emerald green)
- Font: Inter (Google Fonts)
- CSS variables defined in `@theme` block in `app/globals.css`
- Full dark mode support

**Mobile Version** (current issues):
- Uses NativeWind v4.2.1 with Tailwind v3.4.19
- `tailwind.config.js` is empty (no theme customization)
- Colors are hardcoded in components:
  - Primary buttons: `#4285F4` (Google Blue - NOT emerald!)
  - Text: `#333`, `#666`, `#999`
  - Borders: `#eee`
  - Background: `#fff`
- No design tokens or theme file
- No dark mode support
- Font: System default (Inter not configured)

## Goals & Objectives
**What do we want to achieve?**

- **Primary goals**:
  - Align mobile app aesthetics (colors, typography, spacing, components) with the web version.
  - Implement a centralized design system for the mobile app using Tailwind CSS (NativeWind).
  - Adopt the "Emerald & Dark Gray" color palette from the web.
  - Replace all hardcoded hex colors (`#4285F4`, `#333`, etc.) with theme tokens.
- **Secondary goals**:
  - Improve UI/UX consistency across all primary screens (Login, Note List, Note Editor, Search).
  - Ensure reusability of style tokens and components.
  - Add dark mode support (matching web).
- **Non-goals**:
  - Changing the core functionality of the mobile app.
  - Implementing full feature parity where mobile-specific constraints exist.

## User Stories & Use Cases
**How will users interact with the solution?**

- **As a user**, I want the mobile app to look and feel like the web version so that I have a consistent brand experience.
- **As a user**, I want buttons and inputs to be visually distinct and follow the same color scheme as the web.
- **As a developer**, I want to use a unified theme file or set of constants to style components, avoiding style duplication.

## Success Criteria
**How will we know when we're done?**

- **Acceptance criteria**:
  - Mobile app uses the same color palette as the web:
    - Primary: Emerald `oklch(60% 0.18 145)` → HEX `#16a34a` (or closest NativeWind-compatible equivalent)
    - Secondary: `oklch(97% 0.01 145)` → HEX `#f0fdf4`
    - Background: `oklch(100% 0 0)` → `#ffffff`
    - Foreground: `oklch(20% 0.01 256)` → `#1f2937`
  - Typography matches the web (Inter font family, line-height body: 1.75, heading: 1.25).
  - Key components (Button, NoteCard, Input, Header) are visually identical (or adapted for mobile) to their web counterparts.
  - Search highlighting matches web styles (`mark` styling).
  - Accessibility: All new color combinations must meet WCAG AA contrast ratios.
  - No hardcoded hex codes for colors in the components; all colors come from the Tailwind theme.
  - Dark mode toggle available (optional for MVP, but architecture should support it).

## Constraints & Assumptions
**What limitations do we need to work within?**

- **Technical constraints**:
  - NativeWind v4 uses Tailwind v3 syntax (not v4 `@theme` blocks)
  - OKLCH colors need conversion to HEX/RGB for React Native
  - Some CSS properties aren't supported in React Native (e.g., `color-mix()`)
- **Assumptions**:
  - The web design system (`app/globals.css`) is the "source of truth"
  - We will create a `lib/theme.ts` file with color constants converted from OKLCH

## Implementation Approach

### Phase 1: Theme Foundation
1. Create `lib/theme.ts` with converted color values from web
2. Update `tailwind.config.js` with semantic color names
3. Update `app/global.css` with CSS variables (if NativeWind supports)

### Phase 2: Component Migration
Files to update (replace hardcoded colors with theme tokens):
- `app/(tabs)/index.tsx` - Notes list, FAB button
- `app/(tabs)/search.tsx` - Search results
- `app/note/[id].tsx` - Note editor screen
- `components/EditorToolbar.tsx` - Toolbar buttons
- `components/EditorWebView.tsx` - Loading/error states

### Phase 3: Typography
1. Configure Inter font in Expo
2. Apply consistent font sizes and line-heights

## Questions & Open Items
**Resolved:**
- ✅ Dark mode: Yes, architecture should support it (web has full dark mode)
- ✅ TipTap editor styles: WebView uses web CSS, so should inherit web styles automatically

**Open:**
- Mobile-specific pressed/active states - use React Native's `Pressable` style callbacks
- Performance impact of loading Inter font on mobile
