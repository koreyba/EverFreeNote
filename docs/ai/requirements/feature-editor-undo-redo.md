---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding — Editor Undo/Redo Controls

## Problem Statement
**What problem are we solving?**

- На мобильных устройствах нет стандартного Ctrl+Z, поэтому пользователи не могут отменить последнее действие в редакторе без сторонней клавиатуры.
- На вебе сочетания клавиш Ctrl+Z / Ctrl+Shift+Z работают, но они скрыты от пользователя — нет визуального элемента управления.
- Пострадавшие пользователи: все, кто редактирует заметки на мобайл-нейтив и на вебе.
- Текущий обходной путь: на мобайл — невозможно отменить без физической клавиатуры; на вебе — Ctrl+Z работает, но не очевидно.

## Goals & Objectives
**What do we want to achieve?**

- **Primary:** Добавить кнопки Undo и Redo в интерфейс на всех платформах: веб-десктоп, веб-мобайл, мобайл-нейтив (Android/iOS).
- **Secondary:** На вебе кнопки отражают состояние истории (disabled, если нечего отменять/повторять). На мобайл-нейтив — всегда активны (MVP, нет механизма передачи состояния через bridge).
- **Non-goals:**
  - Кастомная история редактирования (используем встроенную в TipTap через StarterKit).
  - История отмены для заголовка заметки и тегов (только тело редактора).
  - Keyboard shortcut hints на мобайл-нейтив.
  - Сохранение истории undo между сессиями (история живёт только в памяти TipTap).

## User Stories & Use Cases
**How will users interact with the solution?**

- Как пользователь веба, я хочу нажать кнопку ↩ в тулбаре редактора, чтобы отменить последнее изменение, не используя клавиатуру.
- Как пользователь веба, я хочу нажать кнопку ↪ в тулбаре, чтобы повторить отменённое действие.
- Как пользователь мобайл-приложения, я хочу нажать кнопку ↩ в шапке экрана редактирования, чтобы отменить последнее изменение одним нажатием.
- Как пользователь мобайл-приложения, я хочу нажать кнопку ↪ рядом с ↩, чтобы повторить действие.

**Edge cases:**
- При переключении на другую заметку история undo сбрасывается — пользователь не может отменить изменения предыдущей заметки.
- На мобайл-нейтив, если история пустая, нажатие ↩ тихо игнорируется (без ошибки и визуальной реакции) — ожидаемое поведение.
- После закрытия и повторного открытия заметки (или перезагрузки страницы) история undo недоступна — ожидаемое поведение, аналогично Notion и Google Docs.

## Success Criteria
**How will we know when we're done?**

- [ ] На вебе кнопки Undo/Redo появляются первыми в тулбаре редактора.
- [ ] На вебе кнопка Undo задизаблена, если история пуста; Redo — если нечего повторять.
- [ ] На мобайл-нейтив кнопки Undo/Redo отображаются в шапке экрана (header), надпись "Edit" убрана.
- [ ] Undo отменяет последний ввод текста в редакторе (сценарий: ввёл слово → нажал ↩ → слово исчезло).
- [ ] Redo восстанавливает отменённое (сценарий: ↩ → ↪ → слово вернулось).
- [ ] После undo автосохранение срабатывает через debounce (~500–1000ms) и сохраняет откатившееся состояние.
- [ ] Кнопки имеют aria-labels ("Undo", "Redo") для доступности.
- [ ] Работает на Android и iOS (мобайл-нейтив).
- [ ] Работает в браузере desktop и mobile viewport (веб).

## Constraints & Assumptions
**What limitations do we need to work within?**

- TipTap StarterKit уже включает History extension — никаких дополнительных зависимостей не нужно.
- На мобайл-нейтив редактор работает через WebView (React Native → WebView → TipTap). Через bridge передаются только *команды*, не состояние истории.
- `runCommand('undo')` и `runCommand('redo')` уже поддерживаются generic-обработчиком в `RichTextEditorWebView.tsx` (`editor.chain().focus()[command]().run()`).
- На мобайл-нейтив в MVP не реализуем disabled-state для кнопок (потребовало бы расширения bridge-протокола для передачи `can().undo()`).
- Автосохранение после undo/redo работает автоматически: TipTap вызывает `onUpdate` → `onContentChange()` → `debouncedAutoSave.schedule()`. Специального кода не требуется.
- История undo хранится только в памяти TipTap и сбрасывается при `setContent` (переключение заметки) или перезагрузке страницы/приложения.
- Иконки: использовать `lucide-react` (веб) и `lucide-react-native` (мобайл).

## Questions & Open Items
**What do we still need to clarify?**

- **Закрыто:** Tooltips на вебе — реализуем ("Undo (Ctrl+Z)" / "Redo (Ctrl+Shift+Z)").
- **Закрыто:** Автосохранение после undo — срабатывает автоматически через существующий `onUpdate` → debounce pipeline.
- **Открыто:** Нужен ли disabled-state на мобайл-нейтив в будущем? (потребует расширения bridge-протокола для передачи `can().undo()` из WebView в React Native — отложено после MVP).

## 2026-02-26 Web Note Switch History Reset Addendum
- Web must reset editor history only on real note transitions (`noteId` changed to another existing note).
- Autosave create transition (`undefined -> id` for the same draft) must keep the same editor session and preserve focus/caret.
- The reset mechanism is an editor remount (new session key), not `setContent` mutation on the existing editor instance.
- Acceptance check: after switching A -> B, both undo and redo are disabled until user edits note B.
