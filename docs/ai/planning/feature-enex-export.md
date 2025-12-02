---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown: Evernote Export (.enex)

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Core Export Functionality
  - Реализация базового экспорта заметок без изображений
  - Генерация валидного .enex XML
  - UI кнопка экспорта

- [ ] Milestone 2: Image Export Support
  - Скачивание и конвертация изображений
  - Включение изображений в .enex файл с hash/en-media как в Evernote
  - Обработка ошибок при скачивании

- [ ] Milestone 3: Polish & Testing
  - Индикация прогресса
  - Тестирование и исправление багов
  - Оптимизация производительности

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation & Core Export

#### Task 1.1: Create Export Types and Interfaces
- [ ] Создать типы для экспорта (`lib/enex/export-types.ts`)
  - `ExportNote`, `ExportResource`, `ExportProgress` (ExportResource.hash: md5 hex)
- [ ] Определить интерфейсы сервисов
- **Estimate:** 1 hour

#### Task 1.2: Implement Date Formatter
- [ ] Создать `lib/enex/date-formatter.ts`
- [ ] Реализовать конвертацию ISO → Evernote format (YYYYMMDDTHHMMSSZ)
- [ ] Добавить тесты
- **Estimate:** 2 hours

#### Task 1.3: Implement EnexBuilder (без изображений)
- [ ] Создать `lib/enex/enex-builder.ts`
- [ ] Реализовать генерацию XML структуры (en-export, en-note в CDATA)
- [ ] Реализовать `buildNote()` для заметок без изображений
- [ ] Экранирование XML специальных символов
- [ ] Обертка HTML в CDATA
- [ ] Добавить тесты
- **Estimate:** 4 hours

#### Task 1.4: Add getNotesByIds method to NoteService
- [ ] Добавить метод `getNotesByIds(noteIds: string[], userId: string)` в `lib/services/notes.ts`
- [ ] Реализовать запрос к Supabase с фильтрацией по ID
- [ ] Добавить тесты для нового метода
- **Estimate:** 1 hour

#### Task 1.5: Create Basic ExportService (без изображений)
- [ ] Создать `lib/enex/export-service.ts`
- [ ] Реализовать получение заметок через NoteService.getNotesByIds
- [ ] Интеграция с EnexBuilder
- [ ] Создание Blob файла
- [ ] Базовая обработка ошибок
- **Estimate:** 3 hours

#### Task 1.5: Create ExportSelectionDialog Component
- [ ] Создать `components/ExportSelectionDialog.tsx`
- [ ] Диалог с карточками заметок (используя NoteCard variant="compact")
- [ ] Чекбоксы на каждой карточке (интегрированные с карточками)
- [ ] Кнопка "Выбрать все" / "Снять выделение" в заголовке
- [ ] Отображение количества выбранных заметок: "Выбрано: N из M"
- [ ] Кнопки "Отмена" и "Экспортировать (N)" в футере
- [ ] Валидация: кнопка экспорта неактивна без выбора
- [ ] Загрузка списка заметок через NoteService
- **Estimate:** 4 hours

#### Task 1.7: Create ExportButton Component
- [ ] Создать `components/ExportButton.tsx`
- [ ] Кнопка под ImportButton в Sidebar
- [ ] Открытие ExportSelectionDialog
- [ ] Интеграция с ExportService через диалог
- [ ] Базовая обработка ошибок
- [ ] Интеграция в Sidebar.tsx (под ImportButton)
- **Estimate:** 1 hour

#### Task 1.8: Create ExportProgressDialog Component
- [ ] Создать `components/ExportProgressDialog.tsx`
- [ ] Отображение прогресса экспорта
- [ ] Показ текущего этапа и количества обработанных заметок
- [ ] Интеграция с ExportService
- **Estimate:** 2 hours

#### Task 1.9: Integration Testing (без изображений)
- [ ] Тестирование выбора заметок в диалоге
- [ ] Тестирование кнопки "Выбрать все"
- [ ] Тестирование экспорта выбранных заметок без изображений
- [ ] Проверка валидности XML
- [ ] Проверка импорта обратно в EverFreeNote
- [ ] Проверка открытия в Evernote
- **Estimate:** 3 hours

### Phase 2: Image Export Support

#### Task 2.1: Implement ImageDownloader
- [ ] Создать `lib/enex/image-downloader.ts`
- [ ] Реализовать `extractImageUrls()` для извлечения URL из HTML
- [ ] Реализовать `downloadImage()` для скачивания и конвертации в base64 + md5 hash
- [ ] Определение MIME типа и размеров изображения
- [ ] Обработка ошибок скачивания (graceful degradation)
- [ ] Добавить тесты
- **Estimate:** 4 hours

#### Task 2.2: Extend EnexBuilder для изображений
- [ ] Реализовать `buildResource()` для генерации XML ресурсов
- [ ] Интеграция ресурсов в `buildNote()`
- [ ] Обработка изображений без размеров
- [ ] Встраивание `<en-media type="..." hash="...">` в ENML
- [ ] Добавить тесты
- **Estimate:** 2 hours

#### Task 2.3: Extend ExportService для изображений
- [ ] Изменение сигнатуры метода: принимать массив noteIds вместо получения всех заметок
- [ ] Интеграция ImageDownloader в процесс экспорта
- [ ] Параллельная обработка изображений (batch processing)
- [ ] Обработка ошибок при скачивании изображений (graceful degradation)
- [ ] Пропуск изображений при ошибках с логированием (console.error с контекстом)
- [ ] Подсчет пропущенных изображений
- [ ] Возврат информации о пропущенных изображениях
- [ ] Показ предупреждения о пропущенных изображениях в итоговом сообщении
- [ ] Конвертация HTML → ENML с `<en-media hash="...">` и md5 как в Evernote
- [ ] Детерминированный порядок ресурсов/тегов для идемпотентности (round-trip совпадает, кроме export-date)
- **Estimate:** 4 hours

#### Task 2.4: Testing Image Export
- [ ] Тестирование экспорта с изображениями
- [ ] Проверка base64 кодирования
- [ ] Проверка отображения изображений после импорта
- [ ] Проверка корректности md5/hash привязки `<en-media>` → `<resource>`
- [ ] Тестирование с большим количеством изображений
- **Estimate:** 2 hours

### Phase 3: Polish & Optimization

#### Task 3.1: Add Progress Tracking
- [ ] Расширить ExportProgress интерфейс
- [ ] Реализовать callbacks прогресса в ExportService
- [ ] Создать ExportProgressDialog компонент
- [ ] Интеграция прогресса в ExportButton
- **Estimate:** 3 hours

#### Task 3.2: Error Handling & Edge Cases
- [ ] Обработка заметок без содержимого
- [ ] Обработка заметок без тегов
- [ ] Обработка очень больших файлов
- [ ] Обработка сетевых ошибок
- [ ] Улучшение сообщений об ошибках
- **Estimate:** 2 hours

#### Task 3.3: Performance Optimization
- [ ] Оптимизация batch processing изображений
- [ ] Оптимизация генерации XML (потоковая обработка)
- [ ] Оптимизация использования памяти
- [ ] Тестирование производительности
- **Estimate:** 3 hours

#### Task 3.4: UI/UX Improvements
- [ ] Улучшение дизайна ExportButton
- [ ] Добавление иконок и анимаций
- [ ] Улучшение сообщений об ошибках
- [ ] Accessibility improvements
- **Estimate:** 2 hours

#### Task 3.5: Comprehensive Testing
- [ ] Unit тесты для всех компонентов
- [ ] Integration тесты для полного flow
- [ ] E2E тесты для экспорта
- [ ] Тестирование с различными размерами данных
- [ ] Проверка совместимости с Evernote
- [ ] Тесты на идемпотентность: повторный экспорт/импорт дает тот же .enex (кроме export-date), детерминированный порядок ресурсов/тегов и стабильные md5-хэши
- **Estimate:** 4 hours

## Dependencies
**What needs to happen in what order?**

- Task dependencies and blockers
  - Phase 1 должна быть завершена перед Phase 2
  - Task 1.3 (EnexBuilder) должен быть завершен перед Task 1.4 (ExportService)
  - Task 2.1 (ImageDownloader) должен быть завершен перед Task 2.2 (EnexBuilder extension)
  - Task 2.2 должен быть завершен перед Task 2.3 (ExportService extension)

- External dependencies (APIs, services, etc.)
  - Supabase Client для доступа к данным
  - NoteService для получения заметок
  - Supabase Storage для доступа к изображениям
  - Fetch API для скачивания изображений

- Team/resource dependencies
  - Доступ к тестовому аккаунту Evernote для проверки совместимости
  - Тестовые данные с различными типами заметок и изображений

## Timeline & Estimates
**When will things be done?**

- Estimated effort per task/phase
  - Phase 1: ~19 hours (добавлен диалог выбора заметок + метод getNotesByIds)
  - Phase 2: ~12 hours (добавлена обработка graceful degradation)
  - Phase 3: ~14 hours
  - **Total: ~45 hours**

- Target dates for milestones
  - Milestone 1: Week 1
  - Milestone 2: Week 2
  - Milestone 3: Week 3

- Buffer for unknowns
  - +20% buffer для непредвиденных проблем
  - **Total with buffer: ~54 hours**

## Risks & Mitigation
**What could go wrong?**

- Technical risks
  - **Риск:** Очень большие файлы экспорта (>100MB) могут вызвать проблемы с памятью браузера
    - **Митигация:** Потоковая обработка, предупреждение пользователя о больших файлах
  - **Риск:** Ошибки при скачивании изображений могут прервать экспорт
    - **Митигация:** Graceful degradation, пропуск проблемных изображений
  - **Риск:** Несовместимость XML формата с Evernote
    - **Митигация:** Тестирование на реальных файлах, следование спецификации Evernote

- Resource risks
  - **Риск:** Недостаточно тестовых данных для проверки
    - **Митигация:** Создание скриптов для генерации тестовых данных

- Dependency risks
  - **Риск:** Изменения в NoteService могут сломать экспорт
    - **Митигация:** Использование стабильного API, тестирование интеграции

## Resources Needed
**What do we need to succeed?**

- Team members and roles
  - Frontend разработчик для UI компонентов
  - Backend разработчик для сервисов экспорта

- Tools and services
  - Evernote для проверки совместимости экспортированных файлов
  - Тестовые аккаунты с различными типами заметок

- Infrastructure
  - Доступ к Supabase Storage для тестирования скачивания изображений

- Documentation/knowledge
  - Спецификация формата .enex от Evernote
  - Документация по ENML (Evernote Markup Language)
