---
phase: testing
title: Testing Strategy
description: Define testing approach and verify the modern editor redesign features across devices.
---

# Testing Strategy

## Test Coverage Goals
- **Unit Tests**: Ensure all existing unit tests in `ui/web/tests/unit` continue to pass.
- **Component Tests**: Check component rendering and interaction on mobile vs desktop.
- **Manual Checklist**: Create a robust QA checklist for visual validation in Light & Dark modes on different viewports.

## Unit & Component Tests
- Ensure that the following tests pass with the new layout:
  - `richTextEditor.test.tsx` (Tiptap instance and formatting)
  - `Sidebar.tsx` tests (if any, checking search trigger, settings button)
  - `NoteCard.tsx` tests (rendering and selection)
  - `NoteView.tsx` and `NoteEditor.tsx` (handling edit, delete, and copy buttons)

## Manual Verification Checklist
Verify the following features in **both Light and Dark modes**:

### 1. Main Window & Sidebar (Desktop vs Mobile)
- [ ] Sidebar logo and name are aligned.
- [ ] Sync status pill displays correctly (Synchronized / Syncing / Offline) and looks clean.
- [ ] Search trigger button has clean hover state. Clicking it successfully opens the Search results panel.
- [ ] Note count indicator is centered or appropriately aligned.
- [ ] "New Note" button stands out and has micro-animations (e.g. scale on hover, ripple effect).
- [ ] User profile bar is neat, email is truncated if long, settings/logout buttons have clear tooltip/labels.

### 2. Note List & Cards
- [ ] NoteCard displays Title, description snippet, tags, and date cleanly.
- [ ] Selected note card stands out via a subtle background highlight and/or border accent.
- [ ] Hovering over a card shows visual feedback.
- [ ] Virtual scrolling works smoothly without layout shifts.

### 3. Note Reader (NoteView)
- [ ] Header shows title status and actions (Edit, Copy, Delete, More).
- [ ] Content is centered in a `max-w-3xl` or `max-w-4xl` wrapper on desktop for comfortable reading.
- [ ] Typography (headers, lists, body text) looks modern with correct line heights.
- [ ] Tag elements are displayed horizontally and can be scrolled if many exist.

### 4. Note Editor (NoteEditor)
- [ ] Title input has no harsh borders, but has a subtle highlight when focused.
- [ ] Tiptap editor toolbar is clean and responsive.
- [ ] Editor workspace is comfortable and expands to fill the viewport height properly.
- [ ] Autosave/Saving status indicator is visible and behaves correctly.

### 5. Mobile Responsiveness
- [ ] Mobile view displays the sidebar only by default.
- [ ] Selecting a note opens it full-screen and hides the sidebar.
- [ ] Back button in the note view/editor header successfully returns to the note list.
- [ ] Touch targets are at least 44x44px.

## Test Reporting
- Execute verification commands:
  - `npm run test:unit:web`
  - `npm run type-check`
  - `npm run eslint`
