---
phase: implementation
title: Edge Functions Guideline
description: How to run and deploy Supabase Edge Functions for this project
---

# Edge Functions Guideline

Эта инструкция описывает запуск Edge Functions локально и деплой на staging/production.

## Список функций
- `delete-account`
- `save-session`
- `get-sessions`
- `search-sessions`
- `update-session`

## Первый сетап (пре-кондишены, делается один раз)
1) Установить Supabase CLI (через npx он уже доступен).
2) Иметь значения:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `COACHING_USER_ID`
3) Добавить переменные в `.env.local` для локального запуска:
```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
COACHING_USER_ID=<uuid>
```

## Локальный запуск (каждый раз по необходимости)
1) Поднять локальный Supabase:
```
npm run db:start
```

2) Запустить функции:
```
npx supabase functions serve save-session get-sessions search-sessions update-session delete-account --env-file .env.local
```

4) Локальные URL:
```
http://127.0.0.1:54321/functions/v1/<function-name>
```

## Деплой на staging
Проект staging: `yabcuywqxgjlruuyhwin`

### Каждый новый деплой (всегда)
1) Явно переключиться на staging проект (чтобы не ошибиться с текущим):
```
npx supabase link --project-ref yabcuywqxgjlruuyhwin
```

2) Проверить секреты (если менялись — обновить):
```
npx supabase secrets set SUPABASE_URL=https://yabcuywqxgjlruuyhwin.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
npx supabase secrets set COACHING_USER_ID=<uuid>
```

3) Деплой функций:
```
npx supabase functions deploy save-session
npx supabase functions deploy get-sessions
npx supabase functions deploy search-sessions
npx supabase functions deploy update-session
npx supabase functions deploy delete-account
```

## Деплой на production
Проект production: `pmlloiywmuglbjkhrggo`

### Каждый новый деплой (всегда)
1) Явно переключиться на prod проект (чтобы не ошибиться с текущим):
```
npx supabase link --project-ref pmlloiywmuglbjkhrggo
```

2) Проверить секреты (если менялись — обновить):
```
npx supabase secrets set SUPABASE_URL=https://pmlloiywmuglbjkhrggo.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
npx supabase secrets set COACHING_USER_ID=<uuid>
```

3) Деплой функций:
```
npx supabase functions deploy save-session
npx supabase functions deploy get-sessions
npx supabase functions deploy search-sessions
npx supabase functions deploy update-session
npx supabase functions deploy delete-account
```

## Как переключаться между проектами
1) Посмотреть доступные проекты:
```
npx supabase projects list
```

2) Выбрать текущий проект:
```
npx supabase link --project-ref <project_ref>
```

3) Проверить текущий проект:
```
npx supabase status
```

## Готовые адреса для Claude (copy-paste)
### Staging (yabcuywqxgjlruuyhwin)
Base URL:
```
https://yabcuywqxgjlruuyhwin.supabase.co
```

Headers:
```
apikey: REDACTED_JWT
Authorization: Bearer REDACTED_JWT
Content-Type: application/json
```

Endpoints:
```
POST https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/save-session
POST https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/update-session
GET  https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/get-sessions?limit=3
GET  https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/search-sessions?q=embodiment&limit=5
```

Примеры тела для `update-session`:
```
// Полная замена
{ "id": "<note_id>", "mode": "replace", "content": "Новый полный текст" }

// Дополнение в конец
{ "id": "<note_id>", "mode": "append", "append": "Добавка к сессии" }

// Дополнение + обновление темы
{ "id": "<note_id>", "mode": "append", "append": "Добавка", "topic": "Новая тема" }
```

### Production (pmlloiywmuglbjkhrggo)
Base URL:
```
https://pmlloiywmuglbjkhrggo.supabase.co
```

Headers:
```
apikey: REDACTED_JWT
Authorization: Bearer REDACTED_JWT
Content-Type: application/json
```

Endpoints:
```
POST https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1/save-session
POST https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1/update-session
GET  https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1/get-sessions?limit=3
GET  https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1/search-sessions?q=embodiment&limit=5
```

Примеры тела для `update-session`:
```
// Полная замена
{ "id": "<note_id>", "mode": "replace", "content": "Новый полный текст" }

// Дополнение в конец
{ "id": "<note_id>", "mode": "append", "append": "Добавка к сессии" }

// Дополнение + обновление темы
{ "id": "<note_id>", "mode": "append", "append": "Добавка", "topic": "Новая тема" }
```
