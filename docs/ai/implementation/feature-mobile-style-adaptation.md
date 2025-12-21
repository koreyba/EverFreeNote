---
phase: implementation
title: Implementation Guide - Mobile Style Adaptation
description: Technical implementation notes, patterns, and code guidelines for mobile style adaptation.
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Ensure `nativewind` is correctly configured in `ui/mobile`.
- Verify `tailwind.config.js` is active.

## Code Structure
**How is the code organized?**

- `ui/mobile/components/ui/`: Atomic UI components.
- `ui/mobile/tailwind.config.js`: Design tokens (Theme).

## Implementation Notes
**Key technical details to remember:**

### Core Features
- **Design Tokens**: Every color used should be defined in `tailwind.config.js`. Avoid `bg-[#ffffff]` in components if `bg-background` can be used.
- **Component Standardization**: All buttons should use the `Button` component, not `Pressable` with ad-hoc styles.

### Patterns & Best Practices
- **Consistency**: Use the same spacing scale (p-2, p-4, etc.) as the web where possible.
- **Platform-Specifics**: Use React Native's `Platform` module if minor tweaks are needed for iOS vs Android.

## Integration Points
**How do pieces connect?**

- NativeWind connects Tailwind classes to React Native styles.

## Error Handling
**How do we handle failures?**

- N/A for styles, but verify that layout doesn't break on small screens.

## Performance Considerations
**How do we keep it fast?**

- Minimize the use of complex styling logic inside the `render` function.

## Security Notes
**What security measures are in place?**

- N/A for styling.
