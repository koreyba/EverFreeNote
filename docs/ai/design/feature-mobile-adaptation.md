---
phase: design
title: System Design & Architecture - Mobile Adaptation
description: Define the technical architecture, components, and data models for mobile adaptation
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- The core architecture remains the same (Next.js + Supabase).
- **Layout Changes**:
    - We will introduce a **Responsive Layout** wrapper.
    - **Desktop**: Sidebar (fixed left) + Main Content (right).
    - **Mobile**: Header (top) with Menu Button + Main Content (full width). Sidebar becomes a **Sheet/Drawer** overlay.

```mermaid
graph TD
    User[User Device]
    
    subgraph Layout
        Check{Is Mobile?}
        Check -->|Yes| MobileView
        Check -->|No| DesktopView
        
        subgraph DesktopView
            DSidebar[Fixed Sidebar]
            DContent[Main Content]
        end
        
        subgraph MobileView
            MHeader[Header with Menu Btn]
            MContent[Main Content]
            MDrawer[Sidebar Drawer (Hidden)]
            MHeader -->|Click Menu| MDrawer
        end
    end
```

## Data Models
**What data do we need to manage?**

- No changes to the database schema.
- **UI State**:
    - `isMobileMenuOpen`: Boolean state to control the visibility of the mobile sidebar.

## API Design
**How do components communicate?**

- No changes to API endpoints.

## Component Breakdown
**What are the major building blocks?**

1.  **`NotesShell` (Updated)**:
    - Handles the responsive layout logic.
    - Toggles visibility between `Sidebar` (List) and `EditorPane` based on selection state on mobile.

2.  **`Sidebar` (Modified)**:
    - Adapted to be full-width on mobile and fixed-width on desktop.
    - Contains the "Clear Tags" and "Clear Search" functionality.

3.  **`NoteView` & `NoteEditor`**:
    - Updated headers to show "Reading" / "Editing" status instead of duplicating titles.
    - Added "Back" button for mobile navigation.

## Design Decisions
**Why did we choose this approach?**

- **CSS-based Switching**: Instead of a separate MobileHeader and Drawer, we used Tailwind's utility classes (`hidden md:flex`, `w-full`) to switch views. This kept the DOM lighter and reused the existing Sidebar component effectively.
- **`shadcn/ui` Sheet**: Originally planned, but found that a simple full-screen toggle was more effective for the "Master-Detail" pattern on mobile.
- **Responsive Prefixes**: Tailwind's `md:` prefix allows us to keep a single codebase for both mobile and desktop without duplicating logic.

## Non-Functional Requirements
**How should the system perform?**

- **Performance**: The mobile menu should open smoothly (animation).
- **Accessibility**: The mobile menu button must have an `aria-label`. The Sheet must trap focus when open.

## Mobile web navigation — 2026-10-28

```mermaid
stateDiagram-v2
    List --> Note: Open note
    Note --> List: Notes / Back from list
    Note --> Search: Search or Back to results
    List --> Search: Search
    Search --> List: Notes
    List --> Tags: Tags
    Tags --> Search: Select tag
    Settings --> List: Notes
    Settings --> Search: Search
    List --> DeleteAction: Swipe left
    DeleteAction --> DeleteConfirmation: Delete
    DeleteConfirmation --> List: Cancel or confirm
    Note --> FindInNote: Find
    FindInNote --> Note: Close
```

The controller retains the workspace tab while hiding its pane. The mobile tab switcher uses a neutral heading on the list or search screen, and shows the active note title only when its pane is visible. Mobile navigation waits for the editor flush and aborts if it fails. Explicit navigation from Settings clears its return snapshot; Back still restores that snapshot. The mobile tag browser clears an unrelated prior search before opening the tag.

The swipe action is separate from vertical scrolling and long-press selection, and it reuses single-note confirmation and deletion. Find-in-note scans title and text ranges, paints transient highlights without editing the document, and scrolls to the selected match. Browsers without custom highlights use a visual overlay; the editor title uses an outline when it is the selected match.
