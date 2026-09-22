---
phase: implementation
title: Mobile editor layout implementation
description: Shared web and Android-shell editor geometry, navigation and formatting
---

# Mobile editor layout implementation

## Development Setup
Branch feature-mobile-editor-layout starts from freshly fetched origin/main f3d3d1a6972. The sibling worktree follows the repository restriction on nested worktrees. Installed root and ui/shell lockfiles with npm ci.

## Code Structure
- MobileWorkspace owns navigation visibility and reserves its visible height in NotesShell and SettingsPage. Direction anchors are independent for each scroller; horizontal, menu and popup scrolling are ignored. Scroll bounce and layout-induced bottom clamping do not reopen the bar.
- useMobileViewport tracks visible height/panning and keyboard occlusion. It ignores pinch zoom, falls back to CSS dynamic viewport height and removes listeners on unmount/desktop transition.
- NoteEditor keeps the mobile header and footer outside the scroll surface; the scroller has its own stacking context. RichTextEditor portals one toolbar instance into that footer on mobile.
- EditorMenuBar groups paragraph/headings, independent inline formats, lists and alignment on mobile. Font family uses a compact Aa trigger; primary groups precede history and secondary tools. The row is 52px high with 44px touch targets and horizontal scrolling. Desktop keeps its inline sticky toolbar.
- EditorToolbarMenu restores focus to the editor after commands and to its trigger after dismissal. No list toggles only the current list type and preserves unrelated headings.

## Implementation Notes
Tiptap 3 does not rerender useEditor on every transaction by default. EditorMenuBar now subscribes to formatting attributes through useEditorState so group labels, checked states and command decisions track the caret. Typing that leaves formatting unchanged does not rerender the entire note.

The baseline reproduced end-of-note occlusion (803.44px paragraph bottom versus 780px navigation top), tags intercepting Save, and wrapping toolbar controls at different vertical positions. A separate failing viewport check reproduced the toolbar at y=780 while the visible keyboard viewport ended at y=504.

useToolbarDrag adds mouse dragging while retaining native touch panning. Movement beyond 8px suppresses the compatibility click; compound triggers open on click rather than pointerdown, retaining keyboard activation.

MobileWorkspace shares transient editor expansion state with NoteEditor. Mobile note tabs, header and metadata become display:none; navigation is hidden and inert. The same editor remains mounted. A fixed 44px expand/collapse button stays outside the horizontally scrolling tools; Escape collapses. Real note switches and editor unmount reset expansion; the existing autosave-session resolver distinguishes first-save ID assignment and preserves expansion.

## Integration Points
The shared web bundle is also the Capacitor shell UI. No note schema, persistence, autosave, backend or native packaging changes. Mobile note-tab menus opt out of navigation scroll detection.

## Testing Infrastructure
The mobile Cypress spec now loads the real application CSS; its HTML host includes the anchor required by Next's style loader. Jest supplies the missing matchMedia browser API. Simulated VisualViewport is restored after every test.

## Implementation Review
All four requested behaviors map to the requirements and design. Review found and corrected two menu issues: No list clearing a heading, and stale active-list state after successive commands. No outstanding code-review blocker. Validation and platform limits are recorded in the testing document.
