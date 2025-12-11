---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

```mermaid
graph TD
  Controller["useNoteAppController<br/>counts & selection state"] --> Sidebar["Sidebar (counts label)"]
  Controller --> NoteList["NoteList (data source)"]
  Controller --> InfiniteScroll["Unified Infinite Scroll"]
  NoteList --> UI["Displayed notes"]
  InfiniteScroll --> FTS["FTS Observer"]
  InfiniteScroll --> Regular["Regular Observer"]
```

- Контроллер вычисляет: отображаемое количество (X) и общее (Y) для текущего контекста (обычный список, FTS, теги).
- Sidebar показывает метку «Notes displayed: X out of Y» или «Notes displayed: X out of unknown» при FTS поиске с неполной загрузкой.
- Логика выбора/удаления не меняется: операции применяются к загруженным элементам.
- Unified infinite scroll: оба режима (обычный и FTS) используют одинаковый паттерн автоматической подгрузки при скролле.

## Data Models
**What data do we need to manage?**

- `notesDisplayed`: длина отображаемого списка (обычный `notes` или FTS-результаты).
- `notesTotal`: общее число заметок в текущем контексте:
  - Обычный режим: из `pages[0].totalCount`
  - FTS режим: `undefined` пока есть ещё страницы (`ftsHasMore`), иначе длина накопленных результатов
- `ftsHasMore`: определяется по размеру последней страницы (`lastFtsPageSize === ftsLimit`)
- `ftsObserverTarget`: ref для infinite scroll в FTS режиме
- Существующие: `notes`, `ftsData`, `showFTSResults`, `filtered/tagged results`.

## API Design
**How do components communicate?**

- Нет новых API-запросов.
- Контроллер возвращает в Sidebar оба числа (visible, total) для единого рендеринга.

## Component Breakdown
**What are the major building blocks?**

- `useNoteAppController`: вычислить `notesDisplayed` (X) и `notesTotal` (Y) для текущего режима; передать в props.
- `Sidebar`: показать метку «Notes displayed: X out of Y» во всех режимах.
- `NoteList`: источник данных для visible count (length текущего списка/FTS выдачи).

## Design Decisions
**Why did we choose this approach?**

- Не грузим все данные — отображаем честное число для загруженных результатов и общее число из доступных метаданных.
- Не меняем бизнес-логику массовых операций; только честное отображение, чтобы избежать ожиданий «удаляет всё».
- **"unknown" вместо неточного числа**: при FTS поиске показываем "X out of unknown" пока пользователь не загрузит все результаты, чтобы избежать путаницы с неточными числами от сервера.
- **Unified infinite scroll**: FTS и обычный режим используют одинаковый UX — автоматическая подгрузка при скролле + кнопка "Load More" как визуальный индикатор и fallback.
- **Простая логика ftsHasMore**: если последняя страница = 20 результатов (ftsLimit), значит возможно есть ещё.

## Non-Functional Requirements
**How should the system perform?**

- 0 дополнительных запросов.
- Корректные числа в любом режиме (поиск/теги/обычный).
- Устойчивость при отсутствии `total` в FTS — используем длину накопленных результатов без эвристик «+1».
