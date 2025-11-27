---
phase: planning
title: План миграции на TypeScript — UI/клиент
description: Задачи по переводу клиентских компонентов, страниц и UI-библиотеки
---

# Часть A (UI/клиент)

## Объем
- `components/**`, `app/**`, клиентские хуки, шары доменных типов в UI.
- UI-библиотека (`components/ui/*`), страницы `app/*.tsx`, API handlers в `app/api/**`.
- Клиентские тесты (Cypress component/e2e), темы, стили.

## Текущий статус
- Готово: почти вся UI-библиотека на TSX (все кроме `components/ui/sidebar.jsx`).
- Доменные типы старт: `types/domain.ts`.
- `tsc --noEmit` проходит на текущем наборе TS-файлов.

## Задачи (не пересекаются с Часть B)
- [ ] Перевести `components/ui/sidebar.jsx` → `.tsx`.
- [ ] Перевести фичевые компоненты (`components/*.jsx`) на TSX, подключить общие типы (`Note`, RPC-ответы).
- [ ] Перевести страницы `app/*.js` на TSX, типизировать роуты/props, заменить dynamic import без типов.
- [ ] API-роуты `app/api/**` → TS, типы request/response.
- [ ] Обновить Cypress конфиги/тесты под TS (component + e2e) или `// @ts-check`.
- [ ] Финальный проход UI: линт/tsc/next build, фиксация покрытия в `docs/ai/testing/`.

## Риски/зависимости
- Общие типы из `types/domain.ts` должны синхронизироваться с Supabase типами (из Часть B).
- Изменения в Supabase RPC схемах могут ломать UI-хуки поиска/мутаций.

## Выходные артефакты
- Все клиентские файлы на TS/TSX, отсутствуют `.jsx`/`.js` в UI.
- Обновления в `docs/ai/testing/` по клиентским тестам.
