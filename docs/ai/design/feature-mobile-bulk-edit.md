---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture — mobile-bulk-edit

## Architecture Overview

Selection mode — это чисто UI-слой поверх существующей архитектуры. Никаких изменений в backend, Supabase клиенте, или сервисах не требуется.

```mermaid
graph TD
    LongPress[Long Press on NoteCard] --> ActivateSelection[useBulkSelection.activate(id)]
    ActivateSelection --> SelectionState[useBulkSelection state\nselectedIds: Set, isActive: bool]
    SelectionState --> NoteCard[NoteCard — shows checkbox\nonPress = toggle(id)]
    SelectionState --> BulkActionBar[BulkActionBar\nSelect All N / Delete]
    SelectionState --> HeaderTransform[Stack.Screen header\nN selected + Cancel в headerLeft]

    BulkActionBar -->|Delete pressed| ConfirmAlert[Alert.alert confirmation]
    ConfirmAlert -->|confirmed| useBulkDeleteNotes
    useBulkDeleteNotes -->|Promise.allSettled parallel| useDeleteNote[existing useDeleteNote\nper-note optimistic delete]
    useDeleteNote --> ReactQueryCache[React Query cache\n notes + search]
    useDeleteNote --> OfflineQueue[Offline queue\nif no network]
    useBulkDeleteNotes -->|rejected results > 0| Toast[react-native-toast-message\nCould not delete N notes]
    useBulkDeleteNotes -->|always| Deactivate[useBulkSelection.deactivate]
```

**Ключевые принципы:**
- Стейт selection mode — локальный для каждого экрана (не глобальный)
- Bulk delete = **параллельный** вызов существующего `useDeleteNote` через `Promise.allSettled`
- Никаких новых backend endpoints
- SwipeableNoteCard в selection mode отключает жест свайпа полностью
- NoteCard — "тупой" компонент: родитель переключает поведение `onPress` через props

## Data Models

**Selection state (локальный, in-memory):**
```typescript
interface BulkSelectionState {
  isActive: boolean
  selectedIds: Set<string>
}
```

Не персистируется — сбрасывается при уходе с экрана или смене запроса поиска.

**Входные данные для Select All:**
Список `Note[]` из уже загруженных страниц. Берётся из `data.pages.flatMap(p => p.notes)`.

## API Design

**Нет новых backend endpoints.** Bulk delete использует существующий `useDeleteNote` параллельно:

```typescript
// useBulkDeleteNotes
async function bulkDelete(ids: string[]): Promise<void> {
  const results = await Promise.allSettled(
    ids.map(id => deleteNote(id))
  )
  const failedCount = results.filter(r => r.status === 'rejected').length
  if (failedCount > 0) {
    Toast.show({ type: 'error', text1: `Could not delete ${failedCount} note${failedCount > 1 ? 's' : ''}` })
  }
}
```

**`useBulkSelection` public API:**
```typescript
{
  isActive: boolean
  selectedIds: Set<string>
  activate: (id: string) => void    // long press: включить режим + выбрать первую заметку
  toggle: (id: string) => void      // tap в selection mode: переключить выбор
  selectAll: (ids: string[]) => void
  clear: () => void
  deactivate: () => void            // выход из selection mode
}
```

## Component Breakdown

### Новые компоненты:

**`ui/mobile/hooks/useBulkSelection.ts`**
- Управляет стейтом selection mode
- API: см. раздел API Design выше
- `activate(id)` — включает режим и добавляет первый id (вызывается при long press)
- `deactivate` — выключает режим и очищает selectedIds

**`ui/mobile/hooks/useBulkDeleteNotes.ts`**
- Принимает `ids: string[]`, вызывает `useDeleteNote` для каждого параллельно
- Возвращает `{ bulkDelete, isPending }`
- `Promise.allSettled` — все удаления выполняются независимо
- При наличии ошибок → показать toast через `react-native-toast-message`
- `isPending` устанавливается в true на время выполнения, сбрасывается в finally

**`ui/mobile/components/BulkActionBar.tsx`**
- Фиксированная панель, `position: absolute`, bottom = высота tab bar
- Props: `selectedCount: number`, `totalCount: number`, `onSelectAll: () => void`, `onDeselectAll: () => void`, `onDelete: () => void`, `isPending: boolean`
- Кнопка 1: "Select All (N)" где N = totalCount, если выбраны не все; "Deselect All" если все выбраны
- Центр: "N selected"
- Кнопка 2: "Delete" (красная, disabled если selectedCount === 0 или isPending)
- `paddingBottom: insets.bottom` для safe area
- Slide-up анимация при появлении (Reanimated)

### Изменяемые компоненты:

**`ui/mobile/components/NoteCard.tsx`**
- Новые props: `isSelectionMode?: boolean`, `isSelected?: boolean`
- В selection mode: чекбокс слева от контента (анимированный slide-in)
- Выбранная карточка: лёгкий accent background
- `onPress` и `onLongPress` передаются родителем и не меняются внутри компонента — NoteCard просто вызывает их

**`ui/mobile/components/SwipeableNoteCard.tsx`**
- Новый prop: `isSelectionMode?: boolean`
- Когда `isSelectionMode=true`: не рендерить `ReanimatedSwipeable`, рендерить `NoteCard` напрямую — жест свайпа полностью отсутствует

**`ui/mobile/app/(tabs)/index.tsx`** — главный экран списка
- Подключить `useBulkSelection` и `useBulkDeleteNotes`
- В `renderNote`: передавать `onPress={isActive ? () => toggle(note.id) : () => openNote(note)}` и `onLongPress={isActive ? undefined : () => activate(note.id)}`
- `extraData={useMemo(() => ({ isActive, selectedIds }), [isActive, selectedIds])}` в FlashList
- `BulkActionBar` в layout (absolute, над tab bar)
- `Stack.Screen options` динамически трансформируют header при `isActive`
- `BackHandler` для Android при `isActive` (перехват back button)

**`ui/mobile/app/(tabs)/search.tsx`** — экран поиска
- Аналогично index.tsx
- Дополнительно: `useEffect(() => { deactivate() }, [debouncedQuery])` — сброс при смене запроса

## Design Decisions

**1. Локальный стейт вместо глобального (Context/Zustand)**
- Selection mode имеет смысл только в рамках одного экрана
- Глобальный стейт усложнил бы синхронизацию между index и search
- При уходе с экрана стейт автоматически сбрасывается (component unmount)

**2. Bulk delete = параллельный `Promise.allSettled` (не новый endpoint)**
- `useDeleteNote` уже имеет optimistic updates + offline queue + rollback
- Создавать отдельный batch endpoint — избыточно, требовало бы изменений в сервисах и Supabase клиенте
- `Promise.allSettled` не блокирует на первой ошибке; все успешные удаляются, провалившиеся rollback-ятся автоматически через `useDeleteNote`

**3. "Select All (N)" = только загруженные notes**
- Пагинация cursor-based; выбирать невидимые заметки семантически некорректно
- Счётчик N в лейбле явно коммуницирует scope пользователю

**4. Bottom action bar вместо top**
- Thumb-friendly: нижняя зона экрана удобна при однорукой эксплуатации
- Не конфликтует с pull-to-refresh (который вверху)

**5. "Cancel" в `headerLeft` — стандарт iOS**
- iOS Human Interface Guidelines: деструктивные или отменяющие действия — в `headerLeft`
- Обязательно для iOS tabs (нет swipe-back); Android дополнительно поддерживает BackHandler

**6. Swipe полностью отключён в selection mode**
- Swipe и tap-to-select — взаимоисключающие жесты
- SwipeableNoteCard не рендерит `ReanimatedSwipeable` совсем (не просто блокирует жест) — это надёжнее и проще

**7. NoteCard — dumb component, родитель управляет `onPress`**
- NoteCard просто вызывает переданные callbacks, не зная о логике selection
- Родительский экран переключает `onPress` между "navigate" и "toggle(id)" в зависимости от `isActive`
- Это следует Single Responsibility Principle и упрощает тестирование NoteCard в изоляции

**8. Toast через `react-native-toast-message` (новая зависимость)**
- `Alert.alert` — блокирующий, плохой UX для non-critical ошибки вроде partial delete failure
- `ToastAndroid` — только Android
- `react-native-toast-message` — лёгкий, кроссплатформенный, non-blocking

**9. Tab bar height для BulkActionBar**
- Expo Router использует bottom tabs из `@react-navigation/bottom-tabs`
- Стандартная высота tab bar: 49px (iOS) / 56px (Android) — но безопаснее использовать `onLayout` на tab bar контейнере или передавать `bottomInset` prop в BulkActionBar
- Альтернатива: использовать константу `TAB_BAR_HEIGHT = 49` + `insets.bottom` как достаточно надёжное приближение

## Non-Functional Requirements

- **Performance:** `extraData` в FlashList обязателен — без него карточки не перерендерятся при изменении `selectedIds`. Использовать `useMemo` чтобы объект `extraData` был стабильным.
- **Animation:** появление BulkActionBar — slide up из bottom edge (Reanimated `useSharedValue` + `withTiming`)
- **Haptic feedback:** `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` в `activate()` (expo-haptics уже в проекте)
- **Accessibility:** `accessibilityLabel` и `accessibilityRole="checkbox"` на чекбоксах NoteCard; `accessibilityLabel` и `accessibilityRole="button"` на кнопках BulkActionBar; `accessibilityState={{ disabled: true }}` на Delete когда disabled
