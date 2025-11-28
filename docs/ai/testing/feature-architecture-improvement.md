---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- **Unit Tests**: Cover the new Services (`NoteService`, `AuthService`) and Adapters.
- **Integration Tests**: Verify the `useNoteAppController` hook integrates correctly with React Query.
- **E2E Tests**: Existing Cypress tests must pass without modification (Regression Testing).

## Unit Tests
**What individual components need testing?**

### Services
- [ ] `NoteService`: CRUD operations work with mocked Supabase client.
- [ ] `SanitizationService`: Strips `<script>` tags, preserves `<b>`.
- [ ] `BrowserAdapter`: Returns correct values in Node environment (graceful degradation).
- [ ] `SearchService`: FTS + ILIKE fallback выбирается корректно при ошибках RPC (Codex).

### Hooks
- [ ] `useNoteAppController`: State updates correctly on actions.

## Integration Tests
**How do we test component interactions?**

- [ ] Verify `SupabaseProvider` passes client to children.
- [ ] Verify `Sidebar` filters notes when `useNoteAppController` state changes.

## End-to-End Tests
**What user flows need validation?**

- [ ] Login flow (Google/Test User).
- [ ] Create, Edit, Delete Note.
- [ ] Search and Filter.
- [ ] Import ENEX (verify sanitization).

## Test Data
**What data do we use for testing?**

- Existing `scripts/generate-test-notes.ts` for performance testing.
- Standard test users (`test@example.com`).

## Manual Testing
**What requires human validation?**

- Check UI responsiveness after decomposition.
- Verify "Import" dialog works (it uses browser APIs).
- Verify Rich Text Editor toolbar actions.

## Performance Testing
**How do we validate performance?**

- Scroll performance in the note list.
- Search responsiveness (debounce check).
