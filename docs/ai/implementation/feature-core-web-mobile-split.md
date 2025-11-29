---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Настроить алиасы/paths для `/core`, `/ui/web`, `/ui/mobile` (tsconfig, eslint).
- Подготовить отдельные entrypoints: web (Next) и mobile (RN) используют свои провайдеры/адаптеры.
- Для RN: использовать `@react-native-async-storage/async-storage`, `expo-auth-session` (+ Linking/WebBrowser) для OAuth/deep link, и supabase-js конфиг с fetch/storage (cross-fetch при необходимости).

## Code Structure
**How is the code organized?**

- `/core`: types, services, use-cases, adapters (interfaces), config.
- `/ui/web`: Next UI, web adapters, web providers.
- `/ui/mobile`: RN entrypoint, mobile adapters, providers (позже UI).
- Общие утилиты и типы — в core.
- Для RN адаптеров: storage на AsyncStorage, navigation/oauth на Linking + expo-auth-session.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Supabase client factory должен принимать storage/fetch из адаптеров, не использовать window/global напрямую.
- Auth use-case: разделить web redirect flow и mobile deep-link flow через адаптеры.
- Notes/search/enex сервисы остаются в core, зависят от Supabase client/adapter интерфейсов.

### Patterns & Best Practices
- Dependency inversion: все платформенные зависимости через интерфейсы адаптеров.
- Никаких прямых обращений к window/localStorage в core.
- Минимизировать side-effects в core; side-effects (navigation, storage writes) — в адаптерах/провайдерах.

## Integration Points
**How do pieces connect?**

- Web: Next providers создают web Supabase client, передают адаптеры (browser storage/navigation) в core hooks/use-cases.
- Mobile: RN provider создаёт RN Supabase client, передаёт AsyncStorage/Linking адаптеры в core.
- React Query остаётся платформенным (web), для mobile — отдельная конфигурация при необходимости.

## Error Handling
**How do we handle failures?**

- Auth: корректно обрабатывать отсутствие code_verifier (web), network/timeouts (both), graceful fallback.
- Storage errors: адаптеры должны кидать/логировать понятные ошибки и не падать твердотело.

## Performance Considerations
**How do we keep it fast?**

- Core без лишних зависимостей; не тянуть UI-бандл в мобильный слой.
- Переиспользовать существующие кэши (React Query) только в платформенных слоях, не в core.

## Security Notes
**What security measures are in place?**

- Секреты Supabase остаются в env; никакого хардкода в core.
- OAuth flow разделён: web — redirect, mobile — deep link/custom tabs, оба не должны логировать токены.
- Storage адаптеры должны безопасно хранить/очищать сессии.***
