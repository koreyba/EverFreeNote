# Changelog

Все значимые изменения в проекте EverFreeNote документируются в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/),
и проект следует [Semantic Versioning](https://semver.org/lang/ru/).

## [Unreleased]

### Fixed
- Исправлен импорт FixedSizeList в VirtualNoteList.jsx (импорт из react-window)

### Added
- Full-Text Search (FTS) с PostgreSQL для быстрого поиска заметок
- Highlighting найденных фрагментов в результатах поиска
- Поддержка 3 языков для stemming: русский, английский, украинский
- API endpoint `/api/notes/search` с FTS и ILIKE fallback
- React компонент `SearchResults` для отображения результатов с подсветкой
- React hook `useSearchNotes` с debouncing и caching
- Performance benchmark script `scripts/benchmark-fts.js`
- E2E тесты для FTS функциональности
- Unit тесты для search функций (40+ test cases)

### Changed
- Обновлен `hooks/useNotesQuery.js` - добавлен FTS search hook
- Обновлен `app/globals.css` - стили для `<mark>` тегов

### Deployment Notes
**Миграции для выполнения:**
- `supabase/migrations/20251021130000_add_fts_search_function.sql` - создает RPC функцию `search_notes_fts()`

**Проверки перед деплоем:**
1. Убедиться что FTS индекс существует: `idx_notes_fts` (создан в миграции `20251021122738_add_performance_indexes.sql`)
2. Проверить что Supabase поддерживает RPC функции с `SECURITY DEFINER`
3. Запустить benchmark: `node scripts/benchmark-fts.js`

**После деплоя:**
1. Smoke test: `GET /api/notes/search?q=test&lang=ru`
2. Проверить что FTS используется (method='fts' в response)
3. Мониторить fallback rate (должен быть < 5%)
4. Проверить execution time (должен быть < 100ms для 10K записей)

---

## [0.2.0] - 2025-01-21

### Added
- Performance optimizations для больших датасетов (10K+ заметок)
- Virtual scrolling для списков заметок (> 100 записей)
- Infinite scroll с React Query pagination
- GIN индексы для tags и FTS
- Оптимизация запросов с server-side filtering

### Changed
- Переход на React Query для кэширования и оптимистичных обновлений
- Улучшена производительность рендеринга списков заметок

### Deployment Notes
**Миграции для выполнения:**
- `supabase/migrations/20251021122738_add_performance_indexes.sql`

**Проверки:**
- Индексы созданы корректно
- Performance тесты показывают улучшение

---

## [0.1.0] - 2025-01-01

### Added
- Базовая функциональность заметок (CRUD)
- Аутентификация через Google OAuth
- Rich Text Editor с Tiptap
- Система тегов для заметок
- Импорт из Evernote (.enex файлы)
- Темная/светлая тема
- Responsive UI с Tailwind CSS и shadcn/ui

### Deployment Notes
**Миграции для выполнения:**
- `supabase/migrations/20250101000000_initial_schema.sql` - базовая схема БД
- `supabase/migrations/20250101000001_enable_rls.sql` - включение RLS
- `supabase/migrations/20250101000002_create_auth_users.sql` - тестовые пользователи
- `supabase/migrations/20250120000000_create_note_images_bucket.sql` - storage для изображений

**Настройка окружения:**
1. Создать Supabase проект
2. Настроить Google OAuth (см. `GOOGLE_OAUTH_SETUP.md`)
3. Добавить переменные окружения в `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Запустить миграции: `npx supabase db reset`

---

## Формат версий

### [MAJOR.MINOR.PATCH]

- **MAJOR** - несовместимые изменения API
- **MINOR** - новая функциональность, обратно совместимая
- **PATCH** - исправления багов, обратно совместимые

### Типы изменений

- **Added** - новая функциональность
- **Changed** - изменения в существующей функциональности
- **Deprecated** - функциональность, которая скоро будет удалена
- **Removed** - удаленная функциональность
- **Fixed** - исправления багов
- **Security** - исправления уязвимостей

### Deployment Notes

Для каждой версии указываем:
- **Миграции для выполнения** - список SQL миграций в порядке выполнения
- **Проверки перед деплоем** - что нужно проверить
- **После деплоя** - smoke tests и мониторинг
- **Откат** - как откатить изменения при проблемах

