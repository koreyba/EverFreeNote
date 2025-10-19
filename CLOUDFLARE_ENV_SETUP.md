# ⚙️ Cloudflare Pages Environment Variables Setup

## 🐛 Проблема

Production сайт показывает ошибку:
```
{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
```

**Причина:** Production сайт использует **локальный** Supabase URL (`http://127.0.0.1:54321`) вместо production Supabase URL.

---

## ✅ Решение

### Шаг 1: Получи Production Supabase Credentials

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери свой production проект
3. Перейди в **Settings** → **API**
4. Скопируй:
   - **Project URL** (например: `https://abcdefgh.supabase.co`)
   - **Project API keys** → **anon public** key

**Пример:**
```
Project URL: https://abcdefgh.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODAwMDAwMDAsImV4cCI6MTk5NTU3NjAwMH0.xxxxxxxxxxxxx
```

---

### Шаг 2: Настрой Environment Variables в Cloudflare Pages

1. Открой [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Перейди в **Workers & Pages**
3. Найди и открой проект **EverFreeNote** (или как он называется)
4. Перейди в **Settings** → **Environment variables**

5. Для **Production** environment добавь/обнови:

   | Variable Name | Value | Environment |
   |---------------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` | Production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (твой production anon key) | Production |

6. Нажми **Save**

---

### Шаг 3: Redeploy

После изменения environment variables нужно передеплоить:

**Вариант 1: Через Cloudflare UI**
1. Перейди в **Deployments**
2. Найди последний деплой
3. Нажми **⋯** (три точки) → **Retry deployment**

**Вариант 2: Через Git**
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

---

### Шаг 4: Проверка

1. Дождись завершения деплоя (1-2 минуты)
2. Открой https://everfreenote.pages.dev/
3. Открой DevTools (F12) → Console
4. Проверь что используется правильный URL:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   // Должно быть: https://YOUR-PROJECT.supabase.co
   // НЕ должно быть: http://127.0.0.1:54321
   ```
5. Попробуй "Sign in with Google"

---

## 🔍 Диагностика

### Как проверить какой Supabase URL используется на проде?

1. Открой https://everfreenote.pages.dev/
2. Открой DevTools (F12) → Network
3. Нажми "Sign in with Google"
4. Посмотри на URL запроса:
   - ✅ Правильно: `https://YOUR-PROJECT.supabase.co/auth/v1/authorize`
   - ❌ Неправильно: `http://127.0.0.1:54321/auth/v1/authorize`

### Проверка через исходный код страницы

1. Открой https://everfreenote.pages.dev/
2. View Page Source (Ctrl+U)
3. Найди `NEXT_PUBLIC_SUPABASE_URL` в коде
4. Убедись что это production URL

---

## 📋 Чеклист

### В Supabase Dashboard:
- [ ] Открыл production проект
- [ ] Скопировал Project URL
- [ ] Скопировал anon public key
- [ ] Google OAuth provider включён (Authentication → Providers → Google)
- [ ] Site URL = `https://everfreenote.pages.dev`
- [ ] Redirect URLs включают `https://everfreenote.pages.dev/auth/callback`

### В Cloudflare Pages:
- [ ] Открыл Settings → Environment variables
- [ ] Добавил `NEXT_PUBLIC_SUPABASE_URL` для Production
- [ ] Добавил `NEXT_PUBLIC_SUPABASE_ANON_KEY` для Production
- [ ] Сохранил изменения
- [ ] Сделал redeploy

### Проверка:
- [ ] Деплой завершился успешно
- [ ] Открыл production сайт
- [ ] DevTools показывает правильный Supabase URL
- [ ] Google OAuth работает

---

## 💡 Дополнительные настройки

### Preview Environment (опционально)

Если хочешь чтобы preview деплои (для PR) тоже работали:

1. В Cloudflare Pages → Settings → Environment variables
2. Добавь те же переменные для **Preview** environment
3. Или используй локальный Supabase для preview (для тестирования)

### Local Development

Для локальной разработки используй `.env.local`:

```bash
# .env.local (для локальной разработки)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

Этот файл **не коммитится** в git и используется только локально.

---

## 🎯 Итоговая структура

```
Локальная разработка:
├─ .env.local (локальный Supabase)
└─ http://127.0.0.1:54321

Production:
├─ Cloudflare Environment Variables (production Supabase)
└─ https://YOUR-PROJECT.supabase.co
```

---

## 📚 Дополнительные ресурсы

- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs#get-the-api-keys)

---

**После настройки Google OAuth должен заработать на production! 🚀**

