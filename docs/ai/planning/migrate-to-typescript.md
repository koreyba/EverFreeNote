---
phase: planning
title: План миграции на TypeScript
description: Шаги перевода кода, инфраструктуры и тестов на TS
---

# План миграции на TypeScript

## Вехи
- [x] Базовые настройки TS (`tsconfig` алиасы, типы Supabase, tsc проходит на текущих .ts/.tsx)
- [ ] Типизированные клиенты/утилиты (`lib/**`), общие доменные типы
- [ ] UI-атомы/шаблоны (`components/ui`) в TSX
- [ ] Фичевые компоненты/страницы (`components`, `app/*.tsx`, API-роуты) в TS/TSX
- [ ] Тесты/скрипты под TS (`cypress.config.ts`, вспомогательные скрипты), отключение `allowJs`

## Разбиение задач
### Фаза 1: Инфраструктура
- [x] Добавить алиасы в `tsconfig`, ввести типы Supabase (`supabase/types.ts`)
- [x] Перевести `lib/supabase/client` и FTS-утилиты в TS
- [ ] Согласовать строгие флаги финальной сборки (`noEmit`, `noUncheckedIndexedAccess`, отключение `allowJs`)

### Фаза 2: Общие типы и клиенты
- [ ] Вынести доменные типы (`Note`, `Tag`, ответы RPC/REST) в `types/` или `supabase/types` (начато: `types/domain.ts`)
- [x] Перевести `lib/enex` в TS (converter/parser/image-processor/note-creator + типы)
- [ ] Перевести `lib/indexeddb`, прочие утилиты в TS

### Фаза 3: UI-слой
- [ ] Конвертировать `components/ui/*.jsx` в TSX, добавить проп-типизацию и переиспользование общих типов (частично: button, input, card, badge, label, accordion, alert, alert-dialog, checkbox, input-otp, aspect-ratio, avatar, breadcrumb, collapsible, progress, separator, skeleton, switch, textarea, popover, tooltip, hover-card, dialog, dropdown-menu, drawer, sheet, toast/toaster, form, command, context-menu, menubar, pagination, scroll-area, resizable, select, radio-group, slider, tabs, toggle, toggle-group, calendar, carousel, chart, navigation-menu, table, sonner; осталось: sidebar)
- [ ] Конвертировать фичевые компоненты (`components/*.jsx`) и страницы (`app/*.js`) в TSX, нормализовать импорты
- [ ] Привести API-роуты к TS, типизировать `request/response`

### Фаза 4: Тесты и финализация
- [ ] Перевести конфиги/хелперы Cypress на TS или включить `// @ts-check`
- [ ] Прогнать `tsc --noEmit`, `next build`, Cypress; зафиксировать покрытие в `docs/ai/testing/`
- [ ] Отключить `allowJs`, удалить устаревшие `.js/.jsx` артефакты и `jsconfig.json`

## Зависимости и порядок
- Типы Supabase завязаны на актуальной схеме (`notes` + RPC `search_notes_fts`); при изменении схемы синхронизировать `supabase/types.ts`.
- Переход компонентов на TSX зависит от готовых типовых утилит (`Note`, `SearchResult`, типы supabase клиента).
- Перевод тестов после стабилизации публичных API компонентов.

## Оценка/порядок выполнения
- Фаза 1 уже выполнена; Фаза 2 — малые пачки по 2–3 файла за итерацию (1–2 дня).
- Фаза 3 — конверсия UI по слоям: `components/ui` → `components` → `app`, по 5–10 файлов за проход.
- Фаза 4 — после стабилизации типов; финальный проход линта/сборки/тестов.

## Риски и меры
- Несоответствие схемы Supabase ↔ типы — держать `supabase/types.ts` в актуальном состоянии.
- Третьесторонние пакеты без типов (Radix/Tiptap надстройки) — использовать `@types/*` или локальные d.ts.
- Рост `any` при быстрых конверсиях — вводить общие типы и постепенное усиление `strict` флагов.
- UX-регрессии при TS-рефакторе компонентов — покрывать ключевые компоненты Cypress-компонентными тестами.

## Требуемые ресурсы
- Доступ к Supabase схеме/CLI для актуализации типов.
- Время на прогон `tsc`, `next build`, Cypress в CI.
- Обновлённые типовые хелперы для Radix/Tiptap (по мере обнаружения).
