---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown — Editor Undo/Redo Controls

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Undo/Redo на вебе (desktop + mobile viewport)
- [ ] Milestone 2: Undo/Redo на мобайл-нейтив (Android/iOS)
- [ ] Milestone 3: Тесты и ревью

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Веб — RichTextEditor.tsx
- [x] Task 1.1: Импортировать иконки `Undo` и `Redo` из `lucide-react` в `RichTextEditor.tsx`
- [x] Task 1.2: Добавить кнопки Undo/Redo в начало `MenuBar` (перед Bold), с разделителем после
- [x] Task 1.3: Кнопка Undo: `onClick={() => editor.chain().focus().undo().run()}`, `disabled={!editor.can().undo()}`
- [x] Task 1.4: Кнопка Redo: `onClick={() => editor.chain().focus().redo().run()}`, `disabled={!editor.can().redo()}`
- [x] Task 1.5: Добавить Tooltip "Undo (Ctrl+Z)" и "Redo (Ctrl+Shift+Z)" по аналогии с остальными кнопками
- [ ] Task 1.6: Проверить визуально — desktop и mobile viewport

### Phase 2: Мобайл-нейтив — note/[id].tsx
- [x] Task 2.1: Импортировать `Undo2`, `Redo2`, `ChevronLeft` из `lucide-react-native` в `note/[id].tsx`
- [x] Task 2.2: Убрать `title: 'Edit'` → `title: ''` в `Stack.Screen options`
- [x] Task 2.3: Добавить `headerLeft` — кастомный компонент с кнопкой "назад" (`router.back()`) и двумя кнопками Undo/Redo
- [x] Task 2.4: Undo: `editorRef.current?.runCommand('undo')`, Redo: `editorRef.current?.runCommand('redo')`
- [x] Task 2.5: Стилизовать кнопки — добавлен стиль `headerLeftActions`, переиспользован `headerButton`
- [ ] Task 2.6: Проверить на Android-эмуляторе / реальном устройстве

### Phase 3: Тесты и финализация
- [ ] Task 3.1: Написать unit-тест для `MenuBar` — кнопки Undo/Redo рендерятся, вызывают нужные команды
- [ ] Task 3.2: Написать unit-тест для `note/[id].tsx` — `headerLeft` содержит undo/redo кнопки
- [ ] Task 3.3: Ручное тестирование по чеклисту (см. `docs/ai/testing/feature-editor-undo-redo.md`)
- [ ] Task 3.4: Code review

## Dependencies
**What needs to happen in what order?**

- Phase 1 и Phase 2 независимы — можно делать параллельно.
- Phase 3 зависит от Phase 1 и Phase 2.
- Внешних зависимостей нет: `lucide-react`, `lucide-react-native`, TipTap History — всё уже установлено.

## Timeline & Estimates
**When will things be done?**

| Phase | Оценка |
|---|---|
| Phase 1 (веб) | ~1-2 часа |
| Phase 2 (мобайл) | ~1-2 часа |
| Phase 3 (тесты + ревью) | ~1 час |
| **Итого** | **~3-5 часов** |

## Risks & Mitigation
**What could go wrong?**

| Риск | Вероятность | Митигация |
|---|---|---|
| `editor.can().undo()` не обновляется реактивно | Низкая | TipTap обновляет состояние после каждой транзакции; при необходимости — использовать `useEditorState` |
| Мобайл: команда `undo` не проходит через bridge | Низкая | `runCommand` уже тестируется для `toggleBold` и других команд |
| Визуальный конфликт headerLeft с нативной кнопкой "назад" | Средняя | Использовать `headerLeft` (заменяет дефолтный back) + рендерить свою кнопку "назад" явно |

## Resources Needed
**What do we need to succeed?**

- `lucide-react` (уже установлен)
- `lucide-react-native` (уже установлен)
- TipTap StarterKit History (уже включён)
- Expo Router `Stack.Screen` API (`headerLeft`)
