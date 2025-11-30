---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Сейчас веб-клиент и будущий мобильный (React Native) будут дублировать доменную/сетевую логику; нет чёткой границы между core и платформенными слоями.
- Команда разработчиков тратит время на поддержку двух реализаций и рискует рассинхронизацией источника истины.
- Текущий веб-ориентированный код (Supabase клиент, браузерные адаптеры) мешает прямому переиспользованию в RN.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals
  - Выделить общий core-слой (доменные типы, сервисы, use-cases) без привязки к платформе.
  - Создать явные платформенные слои для web и mobile с адаптерами (storage, навигация, Supabase init, OAuth flow).
  - Минимизировать дублирование кода между web и mobile; единый источник истины для обработки данных.
- Secondary goals
  - Облегчить тестирование core-слоя (unit) и платформенных адаптаций (integration).
  - Подготовить структуру для будущего RN-приложения без ломки веба.
- Non-goals (what's explicitly out of scope)
  - Не разрабатываем UI мобильного приложения в этой фазе.
  - Не переписываем существующий веб-UI; только реорганизация слоёв и адаптеров.

## User Stories & Use Cases
**How will users interact with the solution?**

- Как разработчик, хочу иметь общий core-пакет (типы, сервисы, use-cases), чтобы подключать его и в web, и в mobile без правок.
- Как разработчик web, хочу использовать браузерные адаптеры (localStorage, window.location, web OAuth), чтобы web оставался стабильным после разделения.
- Как разработчик mobile, хочу иметь RN-адаптеры (AsyncStorage, deep links/custom tabs, mobile Supabase init), чтобы быстро собрать мобильный клиент без дублирования логики.
- Как разработчик, хочу единый источник конфигурации Supabase/фич-флагов, чтобы не расходились значения между платформами.

## Success Criteria
**How will we know when we're done?**

- Core слой не использует браузерные/RN API напрямую; все платформенные зависимости идут через адаптеры/интерфейсы.
- Web продолжает работать без регресса (авторизация, CRUD заметок, поиск).
- Подготовлен мобильный entrypoint/пакет-шаблон, который компилируется с core и RN-адаптерами (без UI).
- Документация по слоям/адаптерам добавлена; план задач на мобильную интеграцию сформирован.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Используем Supabase JS SDK v2; для RN потребуется кастомный storage (AsyncStorage) и отдельный client factory.
- Не меняем существующие доменные модели и API контракт с Supabase.
- Веб остаётся на Next.js/React Query/Tailwind; мобайл будет на React Native/Expo.
- Временные ограничения: фокус на подготовительном рефакторинге, без полного RN UI.
- Хостинг web — Cloudflare Pages free tier; Supabase — free tier. Нельзя сильно увеличивать трафик/ресурсы, никаких тяжёлых фоновых задач и кастомных serverless.
- Core не должен иметь прямых зависимостей от браузера/RN API; любые платформенные вызовы идут через адаптеры.
- Мобильный OAuth redirect URI (placeholder для RN): `everfreenote://auth/callback`; будет добавлен в Supabase при старте мобильной интеграции.

## Questions & Open Items
**What do we still need to clarify?**

- Какой стек RN (Expo или bare) и какой модуль для deep links/Custom Tabs?  
- Нужны ли разные среды (dev/stage/prod) с разными Supabase проектаами для mobile?  
- Нужен ли shared кэш (React Query) между web и mobile или раздельные конфиги?
- Планируем ли публиковать core как отдельный пакет (workspace) или через алиасы/tsconfig paths?***
