---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide — mobile-bulk-edit

## Development Setup

Никаких новых зависимостей или migrations не требуется. Всё необходимое уже есть в проекте:
- `expo-haptics` — haptic feedback
- `react-native-gesture-handler` — gesture handling
- `react-native-reanimated` — анимации
- `@shopify/flash-list` — список заметок

## Code Structure

```
ui/mobile/
├── hooks/
│   ├── useBulkSelection.ts        # NEW: selection mode state
│   └── useBulkDeleteNotes.ts      # NEW: batch delete logic
├── components/
│   ├── NoteCard.tsx               # MODIFIED: +isSelectionMode, isSelected, onLongPress
│   ├── SwipeableNoteCard.tsx      # MODIFIED: +isSelectionMode (disables swipe)
│   └── BulkActionBar.tsx          # NEW: bottom action bar
└── app/(tabs)/
    ├── index.tsx                  # MODIFIED: selection integration
    └── search.tsx                 # MODIFIED: selection integration + reset on query change
```

## Implementation Notes

### useBulkSelection.ts

```typescript
export function useBulkSelection() {
  const [isActive, setIsActive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const activate = useCallback((id: string) => {
    setIsActive(true)
    setSelectedIds(new Set([id]))
  }, [])

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const deactivate = useCallback(() => {
    setIsActive(false)
    setSelectedIds(new Set())
  }, [])

  return { isActive, selectedIds, activate, toggle, selectAll, clear, deactivate }
}
```

### useBulkDeleteNotes.ts

```typescript
export function useBulkDeleteNotes() {
  const { mutateAsync: deleteNote } = useDeleteNote()
  const [isPending, setIsPending] = useState(false)

  const bulkDelete = useCallback(async (ids: string[]) => {
    setIsPending(true)
    try {
      await Promise.allSettled(ids.map(id => deleteNote(id)))
    } finally {
      setIsPending(false)
    }
  }, [deleteNote])

  return { bulkDelete, isPending }
}
```

**Важно:** `useDeleteNote` уже обрабатывает optimistic updates и offline queue. Каждый вызов `deleteNote(id)` сразу убирает заметку из React Query кеша.

### NoteCard — selection mode props

```typescript
interface NoteCardProps {
  // ... existing props
  isSelectionMode?: boolean
  isSelected?: boolean
  onLongPress?: () => void
}

// В теле компонента:
// - onPress: если isSelectionMode → onLongPress() (toggle), иначе → оригинальный onPress
// - Рендер чекбокса: слева от контента, только если isSelectionMode
// - Чекбокс: простой View с border (unchecked) или с primary color fill + checkmark (checked)
```

### SwipeableNoteCard — отключение свайпа

```typescript
if (isSelectionMode) {
  return (
    <NoteCard
      note={note}
      onPress={onPress}          // toggle selection
      onLongPress={onLongPress}  // уже активен, но для consistency
      isSelectionMode
      isSelected={isSelected}
    />
  )
}
// иначе — стандартный ReanimatedSwipeable wrapper
```

### BulkActionBar — позиционирование

```typescript
// Абсолютное позиционирование над tab bar
// Tab bar высота: ~49px (стандарт iOS) + insets.bottom
// Можно передать bottomOffset как prop или вычислить через useSafeAreaInsets

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT,  // константа или передаётся как prop
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: insets.bottom + 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  }
})
```

**Альтернатива позиционирования:** Если Tab bar высоту сложно знать заранее, передавать `bottomOffset` prop из экрана, где использовать `onLayout` на tab bar или использовать константу Expo Router default tab bar height.

### FlashList — extraData для корректного ре-рендера

```typescript
// КРИТИЧНО: без extraData FlashList не ре-рендерит элементы при изменении selectedIds
<FlashList
  data={notes}
  renderItem={renderNote}
  extraData={{ isActive, selectedIds }}  // передать!
  // ...
/>
```

### Stack.Screen header transformation

```typescript
<Stack.Screen
  options={{
    title: isActive ? `${selectedIds.size} selected` : 'Notes',
    headerLeft: isActive
      ? () => (
          <Pressable onPress={deactivate}>
            <Text style={{ color: colors.primary }}>Cancel</Text>
          </Pressable>
        )
      : undefined,
    // headerRight остаётся (кнопка создания или пустая в selection mode)
    headerRight: isActive ? () => null : /* original */ ...,
  }}
/>
```

### Search screen — сброс selection mode

```typescript
// В search.tsx, после установки debouncedQuery:
useEffect(() => {
  if (isActive) deactivate()
}, [debouncedQuery]) // намеренно не включать isActive/deactivate в deps чтобы не зациклиться
// Или использовать ref для deactivate
```

### Android back button — перехват для выхода из selection mode

```typescript
// В index.tsx и search.tsx — перехватываем back button на Android
useEffect(() => {
  if (!isActive) return
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    deactivate()
    return true  // true = событие обработано, не уходить с экрана
  })
  return () => sub.remove()
}, [isActive, deactivate])
```

Импортировать `BackHandler` из `react-native`. Без этого Android back button уйдёт с таба.

### Confirmation alert

```typescript
const handleDeletePress = () => {
  const count = selectedIds.size
  Alert.alert(
    'Delete notes',
    `Delete ${count} note${count === 1 ? '' : 's'}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await bulkDelete([...selectedIds])
          deactivate()  // авто-выход после удаления
        },
      },
    ]
  )
}
```

## Integration Points

- **React Query кеш:** `useDeleteNote` автоматически обновляет `['notes']` и `['search']` — bulk delete работает через него же
- **Offline queue:** каждый `deleteNote` в цикле использует существующую offline логику — изменений не требуется
- **SwipeContext:** в selection mode `SwipeableNoteCard` не рендерится → нет конфликта со SwipeContext

## Error Handling

- `Promise.allSettled` гарантирует что все deletes выполнятся независимо от ошибок отдельных
- При ошибках: `useDeleteNote` автоматически rollback оптимистичного удаления
- Если нужно показать пользователю о частичных ошибках — проверить `results.filter(r => r.status === 'rejected')` и показать Toast

## Performance Considerations

- `useBulkSelection` методы мемоизированы через `useCallback` — не вызывают лишних ре-рендеров
- `extraData` в FlashList должен быть стабильным объектом — лучше `useMemo(() => ({ isActive, selectedIds }), [isActive, selectedIds])`
- Чекбоксы в NoteCard: простые View-компоненты без сторонних библиотек — нет оверхеда
- `selectedIds` как `Set<string>` — O(1) lookup для проверки `isSelected`

## Security Notes

- Удаление проходит через существующий `useDeleteNote` — все проверки авторизации (RLS в Supabase) сохранены
- Нет возможности удалить заметки другого пользователя — userId фильтр на уровне сервиса
