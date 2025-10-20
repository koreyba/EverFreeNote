---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] **Milestone 1:** Requirements & Design Complete - Понимание .enex формата и архитектуры
- [ ] **Milestone 2:** Image Support in Editor - Редактор поддерживает изображения
- [ ] **Milestone 3:** Basic Import Working - Импорт одного файла с одной заметкой работает
- [ ] **Milestone 4:** Full Feature Complete - Batch import, progress, все фичи работают
- [ ] **Milestone 5:** Testing & Polish - Все тесты проходят, edge cases обработаны

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Research & Requirements (Подзадача 1)
**Цель:** Определить требования к поддержке .enex формата

- [ ] **Task 1.1:** Изучить .enex формат
  - Скачать sample .enex файлы из Evernote
  - Проанализировать XML структуру
  - Документировать все поддерживаемые элементы
  - Документировать неподдерживаемые элементы
  - **Estimate:** 1 час

- [ ] **Task 1.2:** Проанализировать Evernote HTML
  - Изучить ENML (Evernote Markup Language)
  - Определить mapping на стандартный HTML
  - Определить специальные теги (`<en-media>`, `<en-todo>`, etc.)
  - **Estimate:** 1 час

- [ ] **Task 1.3:** Создать тестовые .enex файлы
  - Простая заметка (только текст)
  - Заметка с форматированием
  - Заметка с изображениями
  - Заметка с неподдерживаемыми элементами
  - Файл с множеством заметок
  - **Estimate:** 30 минут

### Phase 2: Editor Capabilities Audit (Подзадача 2)
**Цель:** Определить хватает ли нам компонентов и текущих возможностей редактора

- [ ] **Task 2.1:** Аудит текущих Tiptap extensions
  - Проверить какие extensions уже установлены
  - Сравнить с требованиями .enex
  - Создать список недостающих extensions
  - **Estimate:** 30 минут

- [ ] **Task 2.2:** Тестирование HTML → Tiptap конвертации
  - Создать тестовый HTML из .enex
  - Попробовать вставить в Tiptap
  - Документировать что работает / не работает
  - **Estimate:** 1 час

- [ ] **Task 2.3:** Определить gaps в функциональности
  - ❌ Image support - НЕТ
  - ✅ Bold, Italic, Underline - ЕСТЬ
  - ✅ Headings - ЕСТЬ
  - ✅ Lists - ЕСТЬ
  - ✅ Links - ЕСТЬ
  - ❌ Tables - НЕТ (не поддерживаем)
  - ❌ Code blocks - НЕТ (не поддерживаем)
  - **Estimate:** 30 минут

### Phase 3: Image Support Implementation (Подзадача 3, часть 1)
**Цель:** Добавить поддержку изображений в редактор

- [ ] **Task 3.1:** Установить Tiptap Image extension
  - `npm install @tiptap/extension-image`
  - Добавить в RichTextEditor extensions
  - Протестировать базовую вставку изображения
  - **Estimate:** 30 минут

- [ ] **Task 3.2:** Настроить Supabase Storage bucket
  - Создать bucket `note-images`
  - Настроить public access
  - Создать RLS policies
  - Протестировать upload/download
  - **Estimate:** 1 час

- [ ] **Task 3.3:** Создать ImageProcessor service
  - Функция base64 → Blob
  - Функция upload to Supabase Storage
  - Функция generate public URL
  - Error handling
  - **Estimate:** 2 часа

- [ ] **Task 3.4:** Интегрировать images в RichTextEditor
  - Добавить toolbar кнопку для вставки изображения
  - Реализовать upload при вставке
  - Показывать loading state
  - Обрабатывать ошибки
  - **Estimate:** 2 часа

- [ ] **Task 3.5:** Протестировать image support
  - Вставка изображения через UI
  - Сохранение заметки с изображением
  - Загрузка заметки с изображением
  - Редактирование заметки с изображением
  - **Estimate:** 1 час

### Phase 4: Core Parser Implementation (Подзадача 3, часть 2)
**Цель:** Реализовать парсинг .enex файлов

- [ ] **Task 4.1:** Создать EnexParser service
  - Функция parse(file) → ParsedNote[]
  - XML parsing с DOMParser
  - Extract title, dates, tags
  - Extract content from CDATA
  - Extract resources
  - **Estimate:** 3 часа

- [ ] **Task 4.2:** Создать ContentConverter service
  - Функция convert(html, resources) → Tiptap HTML
  - ENML → HTML conversion
  - Replace `<en-media>` с placeholders
  - Remove unsupported elements
  - Add placeholder text
  - **Estimate:** 3 часа

- [ ] **Task 4.3:** Интегрировать ImageProcessor с ContentConverter
  - Upload images during conversion
  - Replace `<en-media>` с `<img src="url">`
  - Handle upload errors gracefully
  - **Estimate:** 2 часа

- [ ] **Task 4.4:** Unit tests для parsers
  - Test valid .enex parsing
  - Test invalid XML handling
  - Test ENML conversion
  - Test image processing
  - Test unsupported elements
  - **Estimate:** 2 часа

### Phase 5: Database Integration (Подзадача 4)
**Цель:** Сохранение импортированных заметок в БД

- [ ] **Task 5.1:** Создать NoteCreator service
  - Функция create(note, userId) → noteId
  - Insert в Supabase notes table
  - Handle custom created_at/updated_at
  - **Estimate:** 1 час

- [ ] **Task 5.2:** Реализовать duplicate detection
  - Query existing notes by title
  - Add [duplicate] prefix if exists
  - **Estimate:** 1 час

- [ ] **Task 5.3:** Обработка ошибок БД
  - Network errors
  - Permission errors
  - Validation errors
  - Rollback strategy
  - **Estimate:** 1 час

### Phase 6: UI Implementation (Подзадача 5)
**Цель:** Добавить UI для импорта

- [ ] **Task 6.1:** Создать ImportButton component
  - Button в sidebar или header
  - Hidden file input
  - Multiple file selection
  - .enex file filter
  - **Estimate:** 1 час

- [ ] **Task 6.2:** Создать ImportProgressDialog component
  - Dialog с progress bar
  - Current file / total files
  - Current note / total notes
  - Cancel button (optional)
  - **Estimate:** 2 часа

- [ ] **Task 6.3:** Создать UnsupportedFeaturesDialog component
  - List неподдерживаемых элементов
  - Показывать перед импортом
  - "Proceed" / "Cancel" buttons
  - **Estimate:** 1 час

- [ ] **Task 6.4:** Интегрировать import flow
  - Wire up ImportButton → file selection
  - Show UnsupportedFeaturesDialog
  - Process files with progress
  - Show success/error notifications
  - Refresh notes list after import
  - **Estimate:** 2 часа

### Phase 7: Batch Processing (Подзадача 5, продолжение)
**Цель:** Поддержка массового импорта

- [ ] **Task 7.1:** Реализовать batch file processing
  - Process files sequentially
  - Track progress per file
  - Aggregate results
  - **Estimate:** 2 часа

- [ ] **Task 7.2:** Реализовать batch note processing
  - Process notes from single file
  - Track progress per note
  - Handle partial failures
  - **Estimate:** 2 часа

- [ ] **Task 7.3:** Оптимизация performance
  - Parallel image uploads (max 5)
  - Batch DB inserts (if possible)
  - Debounce UI updates
  - **Estimate:** 2 часа

### Phase 8: Testing & Quality Assurance
**Цель:** Убедиться что все работает правильно

- [ ] **Task 8.1:** Unit tests
  - EnexParser tests
  - ContentConverter tests
  - ImageProcessor tests
  - NoteCreator tests
  - **Estimate:** 3 часа

- [ ] **Task 8.2:** Integration tests
  - End-to-end import flow
  - Single file import
  - Multiple files import
  - Error scenarios
  - **Estimate:** 2 часа

- [ ] **Task 8.3:** Manual testing
  - Test с real .enex files из Evernote
  - Test edge cases
  - Test на разных браузерах
  - Test performance с большими файлами
  - **Estimate:** 2 часа

- [ ] **Task 8.4:** Bug fixes и polish
  - Fix discovered issues
  - Improve error messages
  - Improve UX
  - **Estimate:** 3 часа

### Phase 9: Documentation & Cleanup
**Цель:** Документировать фичу

- [ ] **Task 9.1:** Обновить user documentation
  - How to export from Evernote
  - How to import to EverFreeNote
  - Supported/unsupported features
  - Troubleshooting
  - **Estimate:** 1 час

- [ ] **Task 9.2:** Обновить developer documentation
  - Architecture overview
  - Code structure
  - Adding new supported elements
  - **Estimate:** 1 час

## Dependencies
**What needs to happen in what order?**

**Critical path:**
1. Phase 1 (Research) → блокирует все остальное
2. Phase 2 (Audit) → должен быть после Phase 1
3. Phase 3 (Image Support) → блокирует Phase 4 (нужны images для конвертации)
4. Phase 4 (Parser) → может начаться параллельно с Phase 3
5. Phase 5 (DB Integration) → после Phase 4
6. Phase 6 (UI) → после Phase 5
7. Phase 7 (Batch) → после Phase 6
8. Phase 8 (Testing) → после всех implementation phases
9. Phase 9 (Docs) → после Phase 8

**Parallel work opportunities:**
- Phase 3 (Image Support) и Phase 4 (Parser) могут идти параллельно
- Phase 6 (UI) и Phase 7 (Batch) могут частично перекрываться

**External dependencies:**
- Supabase Storage API
- Tiptap Image extension
- Browser DOMParser API
- Browser File API

## Timeline & Estimates
**When will things be done?**

**Total estimated effort:** ~40-45 часов

**Breakdown by phase:**
- Phase 1: 2.5 часа (Research)
- Phase 2: 2 часа (Audit)
- Phase 3: 6.5 часа (Image Support) - CRITICAL
- Phase 4: 10 часов (Parser) - CRITICAL
- Phase 5: 3 часа (DB Integration)
- Phase 6: 6 часов (UI)
- Phase 7: 6 часов (Batch Processing)
- Phase 8: 10 часов (Testing)
- Phase 9: 2 часа (Documentation)

**Realistic timeline (поэтапная реализация):**

**Sprint 1 (Week 1): MVP - Single File, Single Note**
- Phase 1: Research (2.5h)
- Phase 2: Audit (2h)
- Phase 3: Image Support (6.5h)
- Phase 4: Basic Parser (5h - только single note)
- Phase 5: Basic DB Integration (2h)
- Phase 6: Basic UI (3h - только single file)
- **Total:** ~21 час
- **Deliverable:** Можно импортировать один .enex с одной заметкой

**Sprint 2 (Week 2): Full Features**
- Phase 4: Complete Parser (5h - multiple notes)
- Phase 5: Complete DB Integration (1h - duplicates)
- Phase 6: Complete UI (3h - progress dialog)
- Phase 7: Batch Processing (6h)
- **Total:** ~15 часов
- **Deliverable:** Полный функционал импорта

**Sprint 3 (Week 3): Testing & Polish**
- Phase 8: Testing (10h)
- Phase 9: Documentation (2h)
- Bug fixes (buffer)
- **Total:** ~12 часов
- **Deliverable:** Production-ready feature

**Buffer:** +20% для непредвиденных проблем = ~10 часов

**Total timeline:** 3 недели (48-58 часов работы)

## Risks & Mitigation
**What could go wrong?**

**Risk 1: .enex формат сложнее чем ожидается**
- **Impact:** HIGH
- **Probability:** MEDIUM
- **Mitigation:** Начать с research phase, тестировать на real files рано

**Risk 2: Проблемы с Supabase Storage**
- **Impact:** HIGH
- **Probability:** LOW
- **Mitigation:** Протестировать Storage API рано, иметь fallback (base64 в DB)

**Risk 3: HTML → Tiptap конвертация теряет форматирование**
- **Impact:** MEDIUM
- **Probability:** MEDIUM
- **Mitigation:** Extensive testing, graceful degradation с placeholders

**Risk 4: Performance проблемы с большими файлами**
- **Impact:** MEDIUM
- **Probability:** MEDIUM
- **Mitigation:** Implement progress tracking, optimize early, set size limits

**Risk 5: Browser memory limits**
- **Impact:** MEDIUM
- **Probability:** LOW
- **Mitigation:** Process files sequentially, clear memory between files

**Risk 6: Tiptap Image extension не работает как ожидается**
- **Impact:** HIGH
- **Probability:** LOW
- **Mitigation:** Протестировать extension рано, иметь custom solution как fallback

**Risk 7: RLS policies блокируют image uploads**
- **Impact:** MEDIUM
- **Probability:** MEDIUM
- **Mitigation:** Тщательно тестировать policies, документировать setup

## Resources Needed
**What do we need to succeed?**

**NPM packages:**
- `@tiptap/extension-image` - для поддержки изображений
- Возможно: `fast-xml-parser` - если DOMParser недостаточно
- Возможно: `jszip` - если .enex файлы сжаты

**Tools:**
- Evernote account для создания test .enex files
- Browser DevTools для debugging XML parsing
- Supabase Dashboard для Storage management

**Documentation:**
- Evernote .enex format specification
- ENML (Evernote Markup Language) docs
- Tiptap Image extension docs
- Supabase Storage docs

**Test data:**
- Sample .enex files (различные сценарии)
- Large .enex files (performance testing)
- Malformed .enex files (error handling)

**No additional team members or infrastructure needed**

