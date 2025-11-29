---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Структура `/core` / `/ui/web` / `/ui/mobile`, адаптерные интерфейсы, вынос доменных сервисов в core.
- [ ] Milestone 2: Web-слой работает через адаптеры/фабрики без регрессий.
- [ ] Milestone 3: RN-скелет с адаптерами и Supabase RN factory, `tsc` на core + mobile.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Создать каталоги `/core`, `/ui/web`, `/ui/mobile`, обновить tsconfig paths/alias.
- [x] Определить интерфейсы адаптеров: `StorageAdapter`, `NavigationAdapter`, `OAuthAdapter` (опц.), `SupabaseClientFactory`, `ConfigProvider`.
- [x] Вынести доменные типы/сервисы/use-cases в `/core` (из `lib/services` и части hooks без UI-зависимостей). (сервисы перенесены; use-cases будут подключены через текущие hooks)

### Phase 2: Core Features (Web)
- [x] Реализовать web-адаптеры: `StorageAdapter` (localStorage), `NavigationAdapter` (window.location), web OAuth redirect; web Supabase client factory (browser fetch + localStorage).
- [x] Обновить провайдеры/контроллеры (`useNoteAppController` и др.) для работы через адаптеры core. (провайдер Supabase переведён на web factory/adapter; контроллер перенесён в `@ui/web/hooks/useNoteAppController`)
- [ ] Прогнать web smoke/существующие тесты, убедиться в отсутствии регрессий.

### Phase 3: Integration & Polish (Mobile prep)
- [x] Зафиксировать RN зависимости: `@react-native-async-storage/async-storage`, `expo-auth-session` (+ Linking/WebBrowser), `cross-fetch` при необходимости для Supabase. (задекларированы в планах и stubs)
- [x] Реализовать RN-адаптеры (storage/navigation/oauth), Supabase RN client factory (fetch + AsyncStorage).
- [x] Добавить мобильный entrypoint-заглушку, пройти `tsc` на core + mobile. (tsc проходит с stub-модулями)
- [ ] Документация: как подключать web/mobile адаптеры, где лежат configs/paths; обновить диаграмму при необходимости.

## Dependencies
**What needs to happen in what order?**

- Структура/алиасы → интерфейсы адаптеров → перенос core → web-адаптеры → web smoke → RN адаптеры/фабрики → tsc mobile.
- Внешние: Expo стек выбран; Supabase env (free tier); deep link placeholder `everfreenote://auth/callback`.

## Timeline & Estimates
**When will things be done?**

- Phase 1: ~1–2 дня.
- Phase 2: ~1–2 дня.
- Phase 3: ~2–3 дня (RN адаптеры + tsc).
- Буфер: ~1 день.

## Risks & Mitigation
**What could go wrong?**

- Регрессии web после переноса → поэтапное тестирование, фича-ветка.
- Supabase в RN требует правильного fetch/storage → заранее проверить с AsyncStorage и cross-fetch.
- Рост сложности путей/алиасов → централизовать в tsconfig/baseUrl/paths.
- Ограничения free tiers (Cloudflare Pages, Supabase): избегать тяжёлых запросов/фоновых задач, следить за числом сетевых вызовов.

## Resources Needed
**What do we need to succeed?**

- Supabase env (free tier), Expo tooling, RN зависимости (AsyncStorage, expo-auth-session).
- Время на настройку tsc/CI для mobile bundle.
- Документация/диаграммы для команды.
