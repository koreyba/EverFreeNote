---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding — mobile-bulk-edit

## Problem Statement
**What problem are we solving?**

- Пользователи не могут массово удалять заметки в мобильном приложении — приходится удалять по одной через свайп
- Затронуты все пользователи мобильного приложения, у которых накапливается большое количество заметок (например, после импорта ENEX или при очистке старых записей)
- Текущий воркэраунд: удалять поочерёдно свайпом вправо или заходить в каждую заметку и нажимать кнопку удаления

## Goals & Objectives
**What do we want to achieve?**

**Primary goals:**
- Дать пользователю возможность выбирать несколько заметок и удалять их за одно действие
- Поддержать selection mode на обоих экранах со списком заметок: главный список (index) и поиск (search)

**Secondary goals:**
- Selection mode должен быть интуитивным и следовать нативным паттернам iOS/Android (long press)
- Action bar должен быть доступен большим пальцем (bottom placement)

**Non-goals:**
- Массовое редактирование тегов или содержимого заметок (только удаление)
- Поддержка выбора заметок между разными экранами (локальный стейт на каждом экране)
- Пагинационное "select all across all pages" — выбираются только загруженные заметки

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile user, I want to long-press a note to enter selection mode so that I can select multiple notes without extra navigation
- As a mobile user, I want to see checkboxes on all notes in selection mode so that I can quickly tap to select/deselect them
- As a mobile user, I want a bottom action bar with a "Select All (N)" toggle and "Delete" button so that I can manage my selection without reaching to the top of the screen
- As a mobile user, I want to see how many notes I've selected so that I know exactly what will be deleted
- As a mobile user, I want a confirmation dialog before bulk delete so that I don't accidentally lose data
- As a mobile user (iOS), I want to exit selection mode via a "Cancel" button in the header so that there's always a clear way out on tabs where swipe-back is unavailable
- As a mobile user (Android), I want to exit selection mode with the hardware back button so that the native navigation pattern is respected
- As a mobile user searching for notes, I want selection mode to reset when I change my search query so that the state stays consistent with what's visible on screen

**Key workflows:**

1. Long press on any note card → haptic feedback + note gets selected + selection mode activates + checkboxes appear on all cards + header transforms (shows "N selected" + Cancel) + bottom action bar appears
2. Tap other notes to toggle selection (onPress = toggle, not navigate)
3. Tap "Select All (N)" → all currently loaded notes become selected; button label switches to "Deselect All"
4. Tap "Deselect All" → all notes deselected; button label switches back to "Select All (N)"
5. Tap "Delete" → confirmation alert "Delete N notes? [Cancel] [Delete]" → on confirm → bulk delete with optimistic updates → selection mode auto-exits
6. Выйти из selection mode:
   - Tap "Cancel" в header (обязательно для iOS — tab screens не имеют swipe-back)
   - Android: hardware back button выходит из selection mode (не уходит с экрана)
   - Авто-выход после успешного bulk delete

**Edge cases:**
- 0 notes selected: "Delete" button is disabled (dimmed)
- After bulk delete, list becomes empty → show normal empty state, selection mode exits
- Network offline during bulk delete: notes optimistically removed from UI, deletions enqueued for sync
- Partial failure (e.g. 4 of 5 deleted, 1 errored): successful deletes stay removed, failed note rolls back to list, toast shows "Could not delete 1 note"
- Search query changes while in selection mode → selection mode is reset, all checkboxes cleared

## Success Criteria
**How will we know when we're done?**

- Selection mode activates on long press with haptic feedback, with no perceptible UI delay after the gesture completes
- Checkboxes render on all visible cards without layout shift
- "Select All (N)" label shows the exact count of currently loaded notes
- Bulk delete confirmation alert shows the exact number of selected notes
- After successful delete: selected notes disappear from list, selection mode exits automatically
- Partial failure: failed note reappears in list, toast is shown; successful deletes remain removed
- Offline: notes are optimistically removed from UI and queued for sync
- No regressions: single-note swipe-to-delete still works when not in selection mode
- Android back button exits selection mode without navigating away from the screen
- Search page: typing a new query resets selection mode

## Constraints & Assumptions
**What limitations do we need to work within?**

**Technical constraints:**
- Mobile app is React Native (Expo) with FlashList for note rendering
- No existing bulk delete hook — needs to be created
- SwipeableNoteCard gesture conflicts with selection tap — swipe must be fully disabled in selection mode
- Selection state is local to each screen (index and search), not global
- "Select All (N)" selects only the notes currently loaded in memory (loaded pages of pagination); the count N is the number of loaded notes
- Tab screens in Expo Router have no swipe-back on iOS — Cancel button in header is mandatory
- Android hardware back button must be intercepted via `BackHandler` to exit selection mode instead of navigating

**Business constraints:**
- No new backend endpoints needed — bulk delete = loop of existing single-delete operations with offline queue support

**Assumptions:**
- Default page size is 50 notes per batch (as per `useNotes` pageSize default)
- Selection mode is purely a UI layer — no server-side selection concept
- Haptic feedback (`expo-haptics`) on long press is required — this is a standard native mobile pattern
- Partial bulk delete failure shows a toast (not a modal alert) — keeps UX lightweight
- Stack.Screen options can be updated dynamically to transform the header during selection mode

## Questions & Open Items
**What do we still need to clarify?**

All questions resolved:
- ~~Где размещать action bar?~~ → Снизу (thumb-friendly), над tab bar
- ~~Что происходит на экране поиска при смене запроса?~~ → Сбросить selection mode
- ~~Подтверждение удаления?~~ → Простой алерт Yes/No с числом заметок
- ~~Select All / Deselect All как одна кнопка или две?~~ → Одна toggle-кнопка "Select All (N)" ↔ "Deselect All"
- ~~Нужна ли haptic feedback?~~ → Да, обязательно (нативный стандарт)
- ~~Как обрабатывать частичный провал?~~ → Toast "Could not delete N notes"; успешные остаются удалёнными
- ~~Как выходить из selection mode?~~ → Cancel в header (iOS), Back button (Android), авто-выход после delete
