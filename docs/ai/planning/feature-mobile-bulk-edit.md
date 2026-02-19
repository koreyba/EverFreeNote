---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown — mobile-bulk-edit

## Milestones

- [ ] Milestone 1: Selection state infrastructure (хуки)
- [ ] Milestone 2: UI компоненты (NoteCard checkbox, BulkActionBar)
- [ ] Milestone 3: Интеграция в index и search экраны
- [ ] Milestone 4: Bulk delete с подтверждением
- [ ] Milestone 5: Полировка (анимации, haptics, accessibility)

## Task Breakdown

### Phase 1: Хуки

- [ ] **1.1** Создать `ui/mobile/hooks/useBulkSelection.ts`
  - State: `isActive: boolean`, `selectedIds: Set<string>`
  - Methods: `activate(id)`, `toggle(id)`, `selectAll(ids)`, `clear()`, `deactivate()`
  - `activate(id)` устанавливает `isActive=true` и добавляет `id` в `selectedIds`
  - `deactivate()` сбрасывает всё

- [ ] **1.2** Создать `ui/mobile/hooks/useBulkDeleteNotes.ts`
  - Принимает `onComplete?: () => void` (вызывается всегда, после partial failure тоже)
  - Внутри использует `useDeleteNote()` (из существующих хуков)
  - Возвращает `bulkDelete(ids: string[]): Promise<void>` и `isPending: boolean`
  - `Promise.allSettled` для параллельного удаления без блокировки на ошибках
  - При наличии rejected результатов — показать toast "Could not delete N notes"

### Phase 2: UI компоненты

- [ ] **2.1** Обновить `NoteCard` — добавить selection mode props
  - Новые props: `isSelectionMode?: boolean`, `isSelected?: boolean`, `onLongPress?: () => void`
  - Когда `isSelectionMode=true`: показать чекбокс слева (View с border/filled circle или Checkbox-like icon)
  - `onPress` в selection mode: вызывает `onLongPress` callback (переключение выбора), НЕ навигацию
  - Визуальный стиль выбранной карточки: лёгкий accent background

- [ ] **2.2** Обновить `SwipeableNoteCard` — отключить swipe в selection mode
  - Новый prop: `isSelectionMode?: boolean`
  - Когда `isSelectionMode=true`: не рендерить `ReanimatedSwipeable`, рендерить `NoteCard` напрямую
  - Long press пробрасывается в NoteCard

- [ ] **2.3** Создать `ui/mobile/components/BulkActionBar.tsx`
  - Props: `selectedCount: number`, `totalCount: number`, `onSelectAll: () => void`, `onDeselectAll: () => void`, `onDelete: () => void`, `isPending: boolean`
  - Layout: горизонтальная панель с `position: absolute`, bottom над tab bar
  - Кнопка 1: "Select All (N)" (N = totalCount) если выбраны не все; "Deselect All" если выбраны все
  - Центр: текст "N selected"
  - Кнопка 2: "Delete" (красная), disabled и полупрозрачная если `selectedCount === 0` или `isPending`
  - `paddingBottom: insets.bottom` (safe area)
  - Slide-up анимация при появлении

### Phase 3: Интеграция в index экран

- [ ] **3.1** Подключить `useBulkSelection` в `app/(tabs)/index.tsx`
  - Добавить хук в тело компонента
  - Прокидывать `isSelectionMode`, `isSelected`, `onLongPress`, `onPress` в `SwipeableNoteCard`
  - Добавить `extraData={{ isActive, selectedIds }}` в FlashList (для корректного ре-рендера)

- [ ] **3.2** Трансформация header в index при selection mode
  - `Stack.Screen options` динамически: если `isActive` → title = "N selected", headerLeft = Cancel
  - Cancel: `deactivate()`

- [ ] **3.3** Добавить `BulkActionBar` в layout index
  - Рендерить только если `isActive`
  - Позиционировать абсолютно над tab bar (нужно знать высоту tab bar или использовать `insets`)
  - Передавать `onDelete` → alert → `bulkDelete([...selectedIds])` → `deactivate()`

### Phase 4: Интеграция в search экран

- [ ] **4.1** Подключить `useBulkSelection` в `app/(tabs)/search.tsx`
  - Аналогично index
  - `useEffect(() => { deactivate() }, [query])` — сброс при смене запроса

- [ ] **4.2** Трансформация header и BulkActionBar аналогично index

### Phase 5: Полировка

- [ ] **5.1** Haptic feedback при long press — `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` в `activate()`
- [ ] **5.0** BackHandler для Android в index.tsx и search.tsx — перехват hardware back button для выхода из selection mode
- [ ] **5.2** Slide-up анимация BulkActionBar (Animated.Value или Reanimated useSharedValue)
- [ ] **5.3** Анимация появления чекбоксов в NoteCard (opacity + translateX)
- [ ] **5.4** Accessibility: `accessibilityLabel`, `accessibilityRole` на кнопках и чекбоксах
- [ ] **5.5** Убедиться что `extraData` в FlashList корректно передаётся (иначе карточки не ре-рендерятся)

## Dependencies

- **1.2 зависит от 1.1** — useBulkDeleteNotes использует useBulkSelection.deactivate в onSuccess
- **2.1, 2.2 параллельно** — независимые компоненты
- **2.3 независимо** — BulkActionBar можно делать параллельно с 2.1/2.2
- **3.x зависит от 1.x и 2.x** — интеграция после готовности хуков и компонентов
- **4.x зависит от 3.x** — search проще делать после отладки на index
- **5.x зависит от 3.x и 4.x** — полировка в конце

**Внешние зависимости:**
- `expo-haptics` — уже в проекте (используется в других местах)
- `react-native-gesture-handler` — уже в проекте (SwipeableNoteCard)
- `react-native-reanimated` — уже в проекте

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
