---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Настроены алиасы/paths для `/core`, `/ui/web`, `/ui/mobile` в tsconfig.
- Web entrypoint (Next) и mobile (RN/Expo, позже) используют собственные провайдеры/адаптеры.
- RN зависимости для будущей интеграции: `@react-native-async-storage/async-storage`, `expo-web-browser` (OAuth placeholder), `cross-fetch` при необходимости; пока не установлены в web-пакете, используются stubs для tsc.

## Code Structure
**How is the code organized?**

- `/core`: adapters (интерфейсы), services (auth/notes/search/sanitizer), utils (search helpers), config interfaces.
- `/ui/web`: web adapters (localStorage, window.location, OAuth redirect, Supabase web factory), config (`ui/web/config.ts`), провайдеры.
- `/ui/mobile`: RN adapters (AsyncStorage, Linking/WebBrowser placeholder, Supabase RN factory), config (`ui/mobile/config.ts`), stubs для типов.
- Общие утилиты и типы — в core; UI остаётся в `/components`/`app`.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Supabase client factory принимает storage/fetch из адаптеров, без прямых `window`/`localStorage`.
- Auth: web redirect URI берётся из `webOAuthRedirectUri`; mobile deep link placeholder `everfreenote://auth/callback` для будущего RN.
- Notes/search/enex сервисы живут в core; search использует RPC + fallback ILIKE, без web API.

### Patterns & Best Practices
- Dependency inversion: любые платформенные зависимости идут через адаптеры.
- Core без прямых браузерных/RN API.
- Сайд-эффекты (навигация, storage) остаются в платформенных адаптерах/провайдерах.

## Integration Points
**How do pieces connect?**

- Web: SupabaseProvider использует web factory + web storage; hooks (`useNoteAppController`, `useNotesQuery`) используют core сервисы.
- Mobile: RN factory/адаптеры готовы; реальная OAuth интеграция в RN помечена TODO (нужен провайдерский auth URL).
- React Query конфиг остаётся вебовым; для RN будет отдельный провайдер при старте UI.
 - Примеры подключений:
   - Web: `import { webSupabaseClientFactory } from '@ui/web/adapters/supabaseClient'; import { webStorageAdapter } from '@ui/web/adapters/storage'; import { webOAuthRedirectUri } from '@ui/web/config';`
   - Mobile: `import { mobileSupabaseClientFactory } from '@ui/mobile/adapters/supabaseClient'; import { mobileStorageAdapter } from '@ui/mobile/adapters/storage'; import { mobileOAuthAdapter } from '@ui/mobile/adapters/oauth'; import { mobileSupabaseConfig, mobileOAuthRedirectUri } from '@ui/mobile/config';` (OAuth adapter — placeholder, требует связки с Supabase OAuth URL и deep link).

## Error Handling
**How do we handle failures?**

- Auth: корректно обрабатываем отсутствие session, ошибки sign-in/out; web поймает unhandled rejection от Web Locks в SupabaseProvider.
- Storage: адаптеры не бросают синхронно; ошибки ассинхронных вызовов логируются.
- Search: fallback на ILIKE при ошибке RPC.

## Performance Considerations
**How do we keep it fast?**

- Core лёгкий, без UI зависимостей.
- Веб-адаптеры используют браузерные API напрямую без лишних обёрток.
- Следить за размером web bundle — core не должен тянуть лишние RN deps (они не установлены).

## Security Notes
**What security measures are in place?**

- Supabase секреты берутся из env; нет хардкода в core.
- OAuth: web — https redirect; mobile — deep link placeholder, без токенов в логах.
- Sanitizer реэкспортируется из существующего сервиса (DOMPurify) для безопасного HTML.***
