---
phase: implementation
title: Implementation Guide - Mobile Adaptation
description: Technical implementation notes, patterns, and code guidelines for mobile adaptation
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Ensure `npx shadcn-ui@latest add sheet` has been run (or check `components/ui/sheet.tsx`).

## Code Structure
**How is the code organized?**

- `components/features/mobile/MobileHeader.tsx`: New component for the top bar.
- `app/page.tsx`: Main entry point where the layout logic resides.
- `components/features/notes/Sidebar.tsx`: Existing component, will be reused inside the Sheet.

## Implementation Notes
**Key technical details to remember:**

### Responsive Layout Strategy
- Use `hidden md:flex` for the desktop sidebar container.
- Use `flex md:hidden` for the mobile header.
- The `Sidebar` component itself should be responsive-agnostic (fill parent height/width).

### Sheet Integration
```tsx
<Sheet>
  <SheetTrigger>
    <MenuIcon />
  </SheetTrigger>
  <SheetContent side="left" className="p-0 w-80">
    <Sidebar ... />
  </SheetContent>
</Sheet>
```

## Integration Points
**How do pieces connect?**

- The `Sidebar` receives props from `useNoteAppController`. These props need to be passed down correctly in both the Desktop (direct) and Mobile (Sheet) instances.

## Error Handling
**How do we handle failures?**

- Standard React error boundaries apply.

## Performance Considerations
**How do we keep it fast?**

- Ensure the Sheet doesn't cause layout thrashing when opening.
