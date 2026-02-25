---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide — Editor Undo/Redo Controls

## Development Setup
**How do we get started?**

Все зависимости уже установлены. Изменяем только 2 файла:
1. `ui/web/components/RichTextEditor.tsx` — веб
2. `ui/mobile/app/note/[id].tsx` — мобайл-нейтив

## Code Structure
**How is the code organized?**

```
ui/web/components/
└── RichTextEditor.tsx        ← MenuBar: добавить Undo/Redo первыми

ui/mobile/app/note/
└── [id].tsx                  ← Stack.Screen: headerLeft с undo/redo
```

## Implementation Notes

### Core Features

#### Веб: MenuBar в RichTextEditor.tsx

Добавить в начало JSX внутри `<div className="sticky top-[-1px] z-20 ...">`, перед кнопкой Bold:

```tsx
// Импорт (добавить к существующим из lucide-react):
import { Undo, Redo } from "lucide-react"

// В MenuBar, первые элементы:
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => editor.chain().focus().undo().run()}
      disabled={!editor.can().undo()}
      aria-label="Undo"
    >
      <Undo className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
</Tooltip>

<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => editor.chain().focus().redo().run()}
      disabled={!editor.can().redo()}
      aria-label="Redo"
    >
      <Redo className="w-4 h-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
</Tooltip>

{/* Разделитель после Undo/Redo, перед Bold */}
<div className="w-px h-5 bg-border mx-1" />
```

#### Мобайл: headerLeft в note/[id].tsx

Добавить импорты:
```tsx
import { Undo2, Redo2 } from 'lucide-react-native'
```

Изменить `Stack.Screen options`:
```tsx
<Stack.Screen
  options={{
    title: '',                          // убрать "Edit"
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
    headerLeft: () => (
      <View style={styles.headerLeftActions}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}
        >
          {/* Используем нативную стрелку назад */}
          <ChevronLeft color={colors.foreground} size={24} />
        </Pressable>
        <Pressable
          onPress={() => editorRef.current?.runCommand('undo')}
          accessibilityLabel="Undo"
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}
        >
          <Undo2 color={colors.foreground} size={20} />
        </Pressable>
        <Pressable
          onPress={() => editorRef.current?.runCommand('redo')}
          accessibilityLabel="Redo"
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}
        >
          <Redo2 color={colors.foreground} size={20} />
        </Pressable>
      </View>
    ),
    headerRight: () => (
      // без изменений: Trash2 + ThemeToggle
    ),
  }}
/>
```

Добавить в стили:
```ts
headerLeftActions: {
  flexDirection: 'row',
  alignItems: 'center',
  marginLeft: 4,
},
```

Импортировать `ChevronLeft` (или использовать другую иконку "назад"):
```tsx
import { Trash2, ChevronLeft } from 'lucide-react-native'
```

### Patterns & Best Practices
- Не добавлять состояние в компоненты — использовать прямой вызов TipTap API.
- Для веба: `editor.can().undo()` возвращает актуальное значение после каждого ре-рендера (TipTap реактивен).
- Для мобайл: команды `undo`/`redo` уже поддерживаются generic-обработчиком в bridge — не нужно трогать `RichTextEditorWebView.tsx`.

## Integration Points
**How do pieces connect?**

- Мобайл bridge path: `Pressable.onPress` → `editorRef.current.runCommand('undo')` → `EditorWebView.runCommand` → `postMessage` → `RichTextEditorWebView.runCommand` → `editor.chain().focus().undo().run()`
- Веб: напрямую через `editor` объект в `MenuBar`.

## Error Handling
- Если `editor` равен `null` в MenuBar — кнопки не рендерятся (существующая проверка `if (!editor) return null`).
- Если мобайл `editorRef.current` не инициализирован — `runCommand` не вызовется (optional chaining `?.`).

## Performance Considerations
- Undo/Redo — синхронные операции ProseMirror, без задержек.
- Disabled-state на вебе пересчитывается при каждом ре-рендере TipTap — это нормально, TipTap оптимизирован.
