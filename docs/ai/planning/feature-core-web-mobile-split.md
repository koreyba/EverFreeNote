---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Определить структуру `/core` / `/ui/web` / `/ui/mobile`, описать адаптерные интерфейсы, вынести доменные сервисы в core.
- [ ] Milestone 2: Подключить web-адаптеры (browser storage/navigation, web Supabase client) и убедиться, что web работает без регрессов.
- [ ] Milestone 3: Добавить RN-скелет с адаптерами (AsyncStorage, Linking, expo-auth-session/custom tabs), Supabase RN factory; пройти `tsc` для core + mobile.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Создать каталоги `/core`, `/ui/web`, `/ui/mobile`, обновить tsconfig paths/alias.
- [ ] Определить интерфейсы адаптеров: `StorageAdapter`, `NavigationAdapter`, `OAuthAdapter` (опционально), `SupabaseClientFactory`, `ConfigProvider`.
- [ ] Вынести доменные типы/сервисы/use-cases в `/core` (из `lib/services` и части hooks без UI-зависимостей).

### Phase 2: Core Features (Web)
- [ ] Реализовать web-адаптеры: `StorageAdapter` на `localStorage`, `NavigationAdapter` на `window.location`, web OAuth redirect; web Supabase client factory (browser fetch + localStorage).
- [ ] Обновить провайдеры/контроллеры (`useNoteAppController` и др.) для работы через адаптеры core.
- [ ] Прогнать web smoke/существующие тесты, убедиться в отсутствии регрессий.

### Phase 3: Integration & Polish (Mobile prep)
- [ ] Выбрать и зафиксировать RN зависимости: `@react-native-async-storage/async-storage` для storage, `expo-auth-session` (+ Linking/WebBrowser) для OAuth, встроенный `Linking` для deep links, `cross-fetch` при необходимости для Supabase.
- [ ] Реализовать RN-адаптеры для storage/navigation/oauth, Supabase RN client factory (fetch + AsyncStorage).
- [ ] Добавить мобильный entrypoint-заглушку, пройти `tsc` на core + mobile.
- [ ] Документация: как подключать web/mobile адаптеры, где лежат configs/paths; обновить диаграмму при необходимости.

## Dependencies
**What needs to happen in what order?**

- Структура/алиасы → интерфейсы адаптеров → перенос core → web-адаптеры → web smoke → RN адаптеры/фабрики → tsc mobile.
- Внешние: выбран Expo стек, Supabase env (free tier), утверждён deep link `everfreenote://auth/callback`.

## Timeline & Estimates
**When will things be done?**

- Phase 1: ~1–2 дня.
- Phase 2: ~1–2 дня.
- Phase 3: ~2–3 дня (RN адаптеры + tsc).
- Буфер: ~1 день на фиксы/регрессию.

## Risks & Mitigation
**What could go wrong?**

- Регрессии web после переноса → поэтапное тестирование, фича-ветка.
- Supabase в RN требует правильного fetch/storage → заранее протестировать с AsyncStorage и cross-fetch.
- Рост сложности путей/алиасов → централизовать в tsconfig/baseUrl/paths.
- Ограничения free tiers (Cloudflare Pages, Supabase): избегать тяжёлых запросов/фоновых задач, следить за количеством сетевых вызовов после разделения.

## Resources Needed
**What do we need to succeed?**

- Доступ к Supabase env (free tier), Expo tooling, выбранные RN зависимости (AsyncStorage, expo-auth-session).
- Время на настройку tsc/CI для mobile bundle.
- Документация/диаграммы для команды.
