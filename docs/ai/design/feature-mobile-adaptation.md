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

1.  **`MobileHeader` (New)**:
    - Visible only on mobile (`block md:hidden`).
    - Contains the "Menu" button (Hamburger icon) and the App Title/Logo.
    - Triggers the Sidebar Sheet.

2.  **`Sidebar` (Modified)**:
    - Currently, it's a fixed `div`.
    - We need to wrap it or adapt it to be used inside a `SheetContent` for mobile.
    - It should accept props to close the sheet upon selection (optional but good UX).

3.  **`MainLayout` / `Page`**:
    - Needs to adjust grid/flex layout.
    - Instead of hardcoded `w-80` for sidebar, use responsive classes.

4.  **`NoteList` & `NoteEditor`**:
    - Ensure they use `w-full` and responsive padding.

## Design Decisions
**Why did we choose this approach?**

- **`shadcn/ui` Sheet**: We already use `shadcn/ui`. The `Sheet` component is the standard way to implement mobile drawers in this ecosystem.
- **Responsive Prefixes**: Tailwind's `md:` prefix allows us to keep a single codebase for both mobile and desktop without duplicating logic.

## Non-Functional Requirements
**How should the system perform?**

- **Performance**: The mobile menu should open smoothly (animation).
- **Accessibility**: The mobile menu button must have an `aria-label`. The Sheet must trap focus when open.
