---
phase: planning
title: План миграции на TypeScript — Core/Server
description: Задачи по переводу утилит, Supabase/серверных частей и финализации миграции
---

# Часть B (Core/Server)

## Объем
- `lib/**` (supabase, enex, indexeddb, прочие утилиты), `scripts/**`, серверные части.
- Доменные типы (`types/domain.ts`, `supabase/types.ts`) и их расширение.
- Тестовые утилиты и настройки (Cypress config, ts-node/tsx для скриптов), CLI-скрипты.
- Финальные шаги миграции (`allowJs` off, удаление `jsconfig.json`).

## Текущий статус
- Supabase типы добавлены (`supabase/types.ts`), клиенты `lib/supabase/*.ts` и ENEX-пайплайн на TS.
- Доменные типы начаты (`types/domain.ts`), но требуют расширения.
- `tsc --noEmit` проходит.
- Cypress config переведён в TS.
- Основные Supabase-скрипты перенесены в TS с восстановлением логики (`benchmark-fts`, `generate-test-notes`, `init-test-users`, `measure-performance`, `test-migrations`).
- Audit-скрипты Supabase переведены в TS (`db_audit_scripts/*.ts`).

## Задачи (не пересекаются с Часть A)
- [ ] Расширить доменные типы (Tag, RPC/REST ответы, IndexedDB схемы) и применить в хуках/утилитах (частично: добавлены Tag, exec_sql/FTS в `supabase/types.ts`).
- [ ] Перевести `lib/indexeddb/**` и прочие утилиты/скрипты (`scripts/*.ts`) на TS с сохранением функционала (готово: supabase и audit скрипты в `.ts`; остаётся `lib/indexeddb`).
- [ ] Типизировать Supabase RPC/REST обёртки, актуализировать `supabase/types.ts` по схеме.
- [x] Обновить тестовые настройки для TS (Cypress config, ts-node/tsx для скриптов) без затрагивания UI компонентов.
- [x] Финализация миграции: отключить `allowJs`, удалить `jsconfig.json` (оставшиеся `.js` — только конфиги/тесты).
- [ ] Добавить fail-safe загрузку env для скриптов (client.ts с гардом для браузера; dotenv подхват только в node-контексте).

## Риски/зависимости
- Требуется синхронизация с Часть A по доменным типам и схемам Supabase.
- Возможные отсутствующие `@types` для скриптов/CLI — при необходимости добавлять локальные d.ts.

## Выходные артефакты
- Все core/утилиты/скрипты на TS или с `// @ts-check`.
- Обновлённые типы Supabase и доменные типы.
- `allowJs` выключен, `jsconfig.json` удалён после завершения обеих частей.
