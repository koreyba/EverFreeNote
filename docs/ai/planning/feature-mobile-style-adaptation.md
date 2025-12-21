---
phase: planning
title: Project Planning & Task Breakdown - Mobile Style Adaptation
description: Break down work into actionable tasks and estimate timeline for mobile style adaptation.
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Design tokens and base components alignment.
- [x] Milestone 2: Screen-by-screen UI overhaul.
- [ ] Milestone 3: Final polish and synchronization with web aesthetics.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Audit web colors and typography; convert OKLCH to Hex for `ui/mobile/tailwind.config.js`. *(Created lib/theme.ts, updated tailwind.config.js, global.css)*
- [x] Task 1.2: Integrate Inter font into the Expo project via `expo-font`. *(Added @expo-google-fonts/inter, expo-splash-screen, updated _layout.tsx)*
- [x] Task 1.3: Create atomic UI components in `ui/mobile/components/ui/` (Button, Input, Badge) following the shadcn/ui pattern. *(Created Button, Input, Badge with variants)*

### Phase 2: Screen Adaptation
- [x] Task 2.1: Update Login screen (`ui/mobile/app/(auth)/login.tsx`) to match web's login style. *(Replaced #4285F4 with emerald primary, uses Button component)*
- [x] Task 2.2: Update Notes List (`ui/mobile/app/(tabs)/index.tsx`) and `NoteCard` component. *(Created NoteCard.tsx, updated index.tsx with theme colors)*
- [x] Task 2.3: Update Note Editor (`ui/mobile/app/note/[id].tsx`) and Toolbar. *(Updated both with theme colors and Inter fonts)*
- [x] Task 2.4: Update Search screen (`ui/mobile/app/(tabs)/search.tsx`). *(Updated with theme colors, proper highlighting)*
- [x] Task 2.5: Implement CSS synchronization for TipTap Editor in `EditorWebView` (Style Bridge). *(Updated loading/error states with theme colors; WebView inherits web CSS)*

### Phase 3: Integration & Polish
- [ ] Task 3.1: Final visual review and bug fixing.
- [x] Task 3.2: Remove hardcoded styles and ensure all use Tailwind tokens. *(All screens now use lib/theme.ts colors)*

## Dependencies
**What needs to happen in what order?**

- Task 1.1 is the blocker for all subsequent tasks.

## Timeline & Estimates
**When will things be done?**

- Total estimated effort: 3-4 days.

## Risks & Mitigation
**What could go wrong?**

- **NativeWind Limitations**: Some complex web CSS might not translate perfectly to React Native.
  - *Mitigation*: Fallback to inline styles or simplified versions for mobile.
- **WebView Styling**: TipTap styles might feel detached from the native UI.
  - *Mitigation*: Use `injectedJavaScript` to apply matching styles dynamically.
- **Font Loading**: Inter font might not load fast enough on first start.
  - *Mitigation*: Use `expo-splash-screen` to wait for fonts to load before showing the UI.

## Resources Needed
**What do we need to succeed?**

- Access to web CSS files and components.
