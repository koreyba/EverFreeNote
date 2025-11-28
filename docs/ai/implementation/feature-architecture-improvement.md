---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Ensure `npm run db:start` is running.
- Run `npm run dev` to verify current state.

## Code Structure
**How is the code organized?**

```
app/
  page.tsx (Orchestrator)
components/
  features/
    auth/
      AuthShell.tsx
    notes/
      NoteEditor.tsx
      NoteView.tsx
      Sidebar.tsx
lib/
  services/
    notes.ts
    auth.ts
    search.ts
  adapters/
    browser.ts
  providers/
    SupabaseProvider.tsx
hooks/
  useNoteAppController.ts
```

## Implementation Notes
**Key technical details to remember:**

### Core Features
- **SupabaseProvider**: Use `createBrowserClient` from `@supabase/ssr` (or existing client setup) but ensure it's a singleton context.
- **Controller**: Should return `isLoading`, `user`, `notes`, `selectedNote`, `actions`.
- **Sanitizer**: Configure DOMPurify to allow only safe tags (bold, italic, lists) but strip scripts/iframes.
- **Комментарий (Codex):** Провайдер должен использовать существующий `lib/supabase/client` или передавать готовый клиент, чтобы избежать лишних экземпляров и ошибок env при импорте.

### Patterns & Best Practices
- **Dependency Injection**: Services should receive the Supabase client or obtain it from the context, not create new instances.
- **Container/Presenter**: `page.tsx` is the Container, extracted components are Presenters.

## Integration Points
**How do pieces connect?**

- `page.tsx` wraps everything in `SupabaseProvider`.
- `useNoteAppController` consumes `useNotesQuery` (which uses `NoteService`).

## Error Handling
**How do we handle failures?**

- Services should throw typed errors.
- Controller should catch errors and show Toasts (`sonner`).

## Performance Considerations
**How do we keep it fast?**

- Ensure `VirtualNoteList` doesn't re-render unnecessarily.
- Memoize the `actions` object in the controller.

## Security Notes
**What security measures are in place?**

- **XSS**: Strict sanitization on all HTML output.
