---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown — mobile-bulk-edit

## Milestones

- [x] Milestone 1: Selection state infrastructure (хуки)
- [x] Milestone 2: UI компоненты (NoteCard checkbox, BulkActionBar)
- [x] Milestone 3: Интеграция в index и search экраны
- [x] Milestone 4: Bulk delete с подтверждением
- [x] Milestone 5: Полировка (анимации, haptics, accessibility)

## Task Breakdown

### Phase 1: Хуки

- [x] **1.1** Создать `ui/mobile/hooks/useBulkSelection.ts`
  - State: `isActive: boolean`, `selectedIds: Set<string>`
  - Methods: `activate(id)`, `toggle(id)`, `selectAll(ids)`, `clear()`, `deactivate()`
  - `activate(id)` устанавливает `isActive=true` и добавляет `id` в `selectedIds`
  - `deactivate()` сбрасывает всё

- [x] **1.2** Создать `ui/mobile/hooks/useBulkDeleteNotes.ts`
  - Принимает `onComplete?: () => void` (вызывается всегда, после partial failure тоже)
  - Внутри использует `useDeleteNote()` (из существующих хуков)
  - Возвращает `bulkDelete(ids: string[]): Promise<void>` и `isPending: boolean`
  - `Promise.allSettled` для параллельного удаления без блокировки на ошибках
  - При наличии rejected результатов — показать toast "Could not delete N notes"

### Phase 2: UI компоненты

- [x] **2.1** Обновить `NoteCard` — добавить selection mode props
  - Новые props: `isSelectionMode?: boolean`, `isSelected?: boolean`
  - Когда `isSelectionMode=true`: показать чекбокс слева (View с border/filled circle)
  - NoteCard остаётся "тупым" компонентом: просто вызывает переданный `onPress`/`onLongPress` без собственной логики
  - Визуальный стиль выбранной карточки: лёгкий accent background

- [x] **2.2** Обновить `SwipeableNoteCard` — отключить swipe в selection mode
  - Новый prop: `isSelectionMode?: boolean`
  - Когда `isSelectionMode=true`: не рендерить `ReanimatedSwipeable`, рендерить `NoteCard` напрямую
  - Long press пробрасывается в NoteCard

- [x] **2.3** Создать `ui/mobile/components/BulkActionBar.tsx`
  - Props: `selectedCount: number`, `totalCount: number`, `onSelectAll: () => void`, `onDeselectAll: () => void`, `onDelete: () => void`, `isPending: boolean`
  - Layout: горизонтальная панель с `position: absolute`, bottom над tab bar
  - Кнопка 1: "Select All (N)" (N = totalCount) если выбраны не все; "Deselect All" если выбраны все
  - Центр: текст "N selected"
  - Кнопка 2: "Delete" (красная), disabled и полупрозрачная если `selectedCount === 0` или `isPending`
  - `paddingBottom: insets.bottom` (safe area)
  - Slide-up анимация при появлении

### Phase 3: Интеграция в index экран

- [x] **3.1** Подключить `useBulkSelection` в `app/(tabs)/index.tsx`
  - Добавить хук в тело компонента
  - Прокидывать `isSelectionMode`, `isSelected`, `onLongPress`, `onPress` в `SwipeableNoteCard`
  - Добавить `extraData={{ isActive, selectedIds }}` в FlashList (для корректного ре-рендера)

- [x] **3.2** Трансформация header в index при selection mode
  - `navigation.setOptions()` динамически: если `isActive` → title = "N selected", headerLeft = Cancel
  - Cancel: `deactivate()`

- [x] **3.3** Добавить `BulkActionBar` в layout index
  - Рендерить только если `isActive`
  - Позиционирование через `useBottomTabBarHeight()` + `useSafeAreaInsets()`
  - Передавать `onDelete` → alert → `bulkDelete([...selectedIds])` → `deactivate()`

### Phase 4: Интеграция в search экран

- [x] **4.1** Подключить `useBulkSelection` в `app/(tabs)/search.tsx`
  - Аналогично index
  - `useEffect(() => { if (isActive) deactivate() }, [query])` — сброс при смене запроса

- [x] **4.2** Трансформация header и BulkActionBar аналогично index

### Phase 5: Полировка

- [x] **5.1** Haptic feedback при long press — `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
- [x] **5.0** BackHandler для Android в index.tsx и search.tsx — перехват hardware back button
- [x] **5.2** Slide-up анимация BulkActionBar (Reanimated `useSharedValue` + `withSpring`)
- [x] **5.3** Анимация появления чекбоксов в NoteCard (opacity + translateX, `withTiming`)
- [x] **5.4** Accessibility: `accessibilityLabel`, `accessibilityRole` на кнопках и чекбоксах
- [x] **5.5** `extraData` в FlashList корректно передаётся через `useMemo`

## Dependencies

- **1.1 и 1.2 независимы** — хуки не вызывают друг друга; `deactivate` вызывается на уровне экрана после `bulkDelete` resolves
- **2.1, 2.2 параллельно** — независимые компоненты
- **2.3 независимо** — BulkActionBar можно делать параллельно с 2.1/2.2
- **3.x зависит от 1.x и 2.x** — интеграция после готовности хуков и компонентов
- **4.x зависит от 3.x** — search проще делать после отладки на index
- **5.x зависит от 3.x и 4.x** — полировка в конце

**Внешние зависимости:**
- `expo-haptics` — уже в проекте
- `react-native-gesture-handler` — уже в проекте (SwipeableNoteCard)
- `react-native-reanimated` — уже в проекте
- `react-native-toast-message` — **новая зависимость**, нужно установить (`npm install react-native-toast-message`)

## Timeline & Estimates

| Phase | Задачи | Оценка |
|-------|--------|--------|
| Phase 1 | Хуки (1.1, 1.2) | S |
| Phase 2 | Компоненты (2.1, 2.2, 2.3) | M |
| Phase 3 | Интеграция index (3.1–3.3) | M |
| Phase 4 | Интеграция search (4.1–4.2) | S |
| Phase 5 | Полировка (5.1–5.5) | S |

## Risks & Mitigation

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| FlashList не ре-рендерит карточки при изменении `selectedIds` | Высокая | Передавать `extraData={{ isActive, selectedIds }}` — FlashList использует это для dirty check |
| Gesture конфликт между long press и scroll в FlashList | Средняя | Long press с delay 500ms — достаточно чтобы отличить от scroll; FlashList cancelable |
| Swipe gesture не полностью отключается при `isSelectionMode` | Низкая | Не рендерить ReanimatedSwipeable совсем — рендерить NoteCard напрямую |
| BulkActionBar перекрывает tab bar или контент | Средняя | Использовать `insets.bottom` + знать высоту tab bar (константа или ref) |
| Частичный провал bulk delete (N из M успешны) | Низкая | `Promise.allSettled` — показать тост с количеством ошибок, успешные удалены |

## Resources Needed

- Знание текущего FlashList API (extraData prop)
- Высота tab bar для позиционирования BulkActionBar (проверить в `_layout.tsx` или измерить `onLayout`)
- `expo-haptics` API (уже в документации Expo)
