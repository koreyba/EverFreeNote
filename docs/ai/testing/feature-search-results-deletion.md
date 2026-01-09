---
phase: testing
title: Testing - Search Results Note Deletion
description: Test coverage for note deletion from search results on mobile
---

# Testing - Search Results Note Deletion

## Test Summary

**Feature:** Delete notes from search results via swipe-to-delete
**Test File:** [searchScreen.test.tsx](../../../ui/mobile/tests/integration/searchScreen.test.tsx)
**Total Tests Added:** 13
**Coverage Status:** Complete

## Test Categories

### 1. Delete from Search Results (4 tests)
- Renders delete buttons for each search result
- Deletes note when swipe delete is triggered
- Removes deleted note from search results (optimistic update)
- Preserves search query after deletion

### 2. Delete Error Handling (2 tests)
- Shows alert when deletion fails in search results
- Restores note in search results when deletion fails (rollback)

### 3. Navigation from Search Results (2 tests)
- Navigates to note editor when search result is pressed
- Does not navigate when delete button is pressed

### 4. Empty State After Deletion (1 test)
- Shows empty state when all search results are deleted

### 5. Delete with Tag Filter (1 test)
- Preserves tag filter after deletion

### 6. Accessibility (1 test)
- Has correct accessibility labels for delete buttons

### 7. Multiple Deletions (1 test)
- Handles multiple sequential deletions in search results

### 8. Swipe Context Integration (1 test)
- Renders SwipeableNoteCard for each search result

## Bug Fix During Implementation

During testing, discovered that `useDeleteNote` hook was not updating search cache:

**Problem:** Optimistic updates only affected `['notes']` queries, not `['search']` queries.

**Fix:** Updated `useDeleteNote` in [useNotes.ts](../../../ui/mobile/hooks/useNotes.ts) to:
- Cancel and snapshot both `['notes']` and `['search']` queries
- Optimistically update both query caches
- Rollback both caches on error
- Invalidate both caches on settled

## Running Tests

```bash
# Run all mobile tests
cd ui/mobile && npm test

# Run only search screen tests
cd ui/mobile && npm test -- --testPathPattern="searchScreen"
```

## Test Results

```
Test Suites: 21 passed, 21 total
Tests:       264 passed, 264 total
```

## Files Changed

1. `ui/mobile/app/(tabs)/search.tsx` - Added delete functionality
2. `ui/mobile/hooks/useNotes.ts` - Fixed optimistic updates for search cache
3. `ui/mobile/tests/integration/searchScreen.test.tsx` - New test file (13 tests)
