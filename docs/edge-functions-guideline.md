---
phase: implementation
title: Edge Functions Guideline
description: SPA integration rules for server logic
---

# Edge Functions Guideline

## Rule of thumb
- Приложение собирается как SPA/static export. **Не используем Next API routes** для серверной логики.
- Любые серверные операции (удаление аккаунта, служебные действия с данными) выносим в Supabase Edge Functions.
- Клиент общается с Edge Functions через `supabase.functions.invoke(...)`; сервисные ключи остаются на стороне Supabase.

## Delete Account flow (пример)
- Функция `delete-account` в `supabase/functions/delete-account/index.ts`:
  - Берёт `Authorization: Bearer <access_token>` от клиента.
  - Через service role key удаляет все заметки пользователя и вызывает `auth.admin.deleteUser(uid)`.
  - Возвращает `{ success: true }` либо `{ error: string }`.
- Клиент:
  - Вызывает `supabase.functions.invoke("delete-account")`.
  - При успехе выполняет `signOut()` и показывает тост.

## Настройка окружения
- На Supabase (prod) должны быть заданы `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` для Edge Functions.
- На клиенте нужны только публичные ключи: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Чтобы функции ходили на прод-проект, задайте `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` (иначе вызовы пойдут на `NEXT_PUBLIC_SUPABASE_URL`). Если функция там не задеплоена, будет 404.

## Деплой Edge Functions
1) Установить Supabase CLI.
2) `supabase functions deploy delete-account`
3) В Supabase Dashboard добавить secrets (например, SERVICE_ROLE_KEY) и права, если нужно.

## Типичные ошибки
- 404 при вызове функции: функция не задеплоена на проект/URL, куда смотрит клиент. Решение: задеплоить `delete-account` и/или задать `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` на правильный проект (или запустить `supabase functions serve delete-account` в dev).
- Нет доступа: на функции не передан Bearer токен или включены неверные проверки JWT. Проверьте `Authorization` и настройки функции.
