---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture — Editor Undo/Redo Controls

## Architecture Overview
**What is the high-level system structure?**

```mermaid
graph TD
  subgraph "Web (Next.js)"
    NE[NoteEditor.tsx] --> RTE[RichTextEditor.tsx]
    RTE --> MB[MenuBar component]
    MB --> UB[Undo Button]
    MB --> RB[Redo Button]
    UB -->|editor.chain.undo| TT[TipTap History]
    RB -->|editor.chain.redo| TT
    TT -->|onUpdate| OCC[onContentChange]
    OCC -->|schedule| DAS[debouncedAutoSave]
  end

  subgraph "Mobile Native (React Native)"
    NS[note/[id].tsx] --> SH[Stack.Screen headerLeft]
    NS --> EWV[EditorWebView.tsx]
    SH -->|editorRef.runCommand undo/redo| NS
    NS -->|runCommand via ref| EWV
    EWV -->|postMessage WebView bridge| RTEWV[RichTextEditorWebView.tsx]
    RTEWV -->|editor.chain.undo/redo| TT2[TipTap History]
    TT2 -->|onUpdate| OCC2[onContentChange]
    OCC2 -->|schedule| DAS2[debouncedAutoSave]
  end
```

- История редактирования полностью управляется TipTap History (через StarterKit).
- Веб: кнопки рендерятся напрямую в `MenuBar`, имеют доступ к `editor` объекту.
- Мобайл: команды проходят через существующий WebView bridge (`runCommand`).

## Data Models
**What data do we need to manage?**

Новых моделей данных не требуется. История живёт в памяти TipTap (ProseMirror transaction history) и сбрасывается при переходе между заметками по следующим причинам:

- **Веб:** `NoteEditor` ремонтирует `RichTextEditor` через смену `key={editor-${inputResetKey}}` — создаётся новый экземпляр TipTap с чистой историей.
- **Мобайл-нейтив:** `NoteEditorScreen` полностью монтируется заново при навигации на новую заметку, WebView перезагружается — история сбрасывается.

Важно: `setContent` сам по себе **не** очищает ProseMirror history. Сброс обеспечивается именно ремонтированием компонента.

## API Design
**How do components communicate?**

### Веб
Прямой вызов TipTap API в `MenuBar`:
```ts
editor.chain().focus().undo().run()
editor.chain().focus().redo().run()
editor.can().undo()  // для disabled state
editor.can().redo()  // для disabled state
```

### Мобайл — WebView Bridge

Полный путь команды:
```
note/[id].tsx (Pressable.onPress)
  → editorRef.current?.runCommand('undo')      // EditorWebViewHandle
  → EditorWebView.tsx: postMessage to WebView
  → RichTextEditorWebView.tsx: runCommand handler
  → editor.chain().focus()['undo']().run()      // TipTap History
```

```ts
// В note/[id].tsx:
editorRef.current?.runCommand('undo')
editorRef.current?.runCommand('redo')
```

Generic-обработчик в `RichTextEditorWebView.tsx` поддерживает любую TipTap-команду по имени.
**Ограничение:** работают только команды **без обязательных аргументов** — `undo` и `redo` подходят.

## Component Breakdown
**What are the major building blocks?**

### Изменяемые файлы

| Файл | Изменение |
|---|---|
| `ui/web/components/RichTextEditor.tsx` | Добавить Undo/Redo кнопки в начало `MenuBar` |
| `ui/mobile/app/note/[id].tsx` | Убрать `title: 'Edit'`, добавить `headerLeft` с back + undo/redo |
| `ui/mobile/components/EditorToolbar.tsx` | Не изменяется (undo/redo идут в header, не в toolbar) |
| `ui/web/components/RichTextEditorWebView.tsx` | Не изменяется (bridge уже поддерживает undo/redo) |

### Новые файлы
Нет — изменения только в существующих компонентах.

## Design Decisions
**Why did we choose this approach?**

### Веб: тулбар, а не шапка
- Соответствует стандартным ожиданиям пользователей (Google Docs, Notion, Word).
- Тулбар sticky — кнопки всегда видны при скролле.
- В шапке (`Editing | Read | Save`) логика document-level actions, а не editor-level.

### Мобайл-нейтив: шапка, а не тулбар
- `EditorToolbar` появляется только при открытой клавиатуре — undo/redo нужны всегда.
- Надпись "Edit" в шапке не несёт функциональной нагрузки — замена обоснована.
- Шапка всегда видна независимо от фокуса.

### Иконки
- Веб: `Undo` и `Redo` из `lucide-react` (уже используется в проекте).
- Мобайл: `Undo2` и `Redo2` из `lucide-react-native` (другой визуальный стиль от обычных стрелок навигации — чтобы не путать с кнопкой "назад").

### Disabled state
- Веб: реализуем через `editor.can().undo()` / `editor.can().redo()` — TipTap обновляет состояние после каждой транзакции, React перерисовывает кнопки реактивно.
- Мобайл MVP: кнопки всегда активны. Если история пустая, команда тихо игнорируется — без вибрации, без тоста, без визуальной реакции. Это осознанное решение MVP; disabled-state может быть добавлен позже через расширение bridge-протокола.

## Non-Functional Requirements
**How should the system perform?**

- Нажатие undo/redo на вебе: немедленный отклик (синхронное обновление TipTap, < 16ms).
- Мобайл bridge: задержка 50–150ms на реальных устройствах — приемлемо. Порог деградации UX: > 300ms (не ожидается при обычных условиях).
- Нет дополнительных сетевых запросов, нет изменений в БД непосредственно при undo/redo.
- Автосохранение **должно** срабатывать после undo/redo: TipTap вызывает `onUpdate` → `onContentChange()` → `debouncedAutoSave.schedule()`. Это ожидаемое и корректное поведение — откатившееся состояние сохраняется автоматически.
