# 🔐 Google OAuth Setup Guide

## ❌ Проблема

Google OAuth не работал на production (`https://everfreenote.pages.dev/`).

**Причина:** Неправильная обработка OAuth callback - передавался `window.location.search` вместо `code`.

---

## ✅ Исправление

Обновлён `app/auth/callback/page.js`:

```javascript
// Было (неправильно):
await supabase.auth.exchangeCodeForSession(window.location.search)

// Стало (правильно):
const code = new URLSearchParams(window.location.search).get('code')
if (code) {
  await supabase.auth.exchangeCodeForSession(code)
}
```

Теперь Google OAuth должен работать на production! 🎉

---

## 📋 Проверка настроек Supabase (если всё ещё не работает)

### Шаг 1: Создай Google OAuth Credentials

1. Перейди на [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Создай новый проект или выбери существующий
3. Перейди в **APIs & Services** → **Credentials**
4. Нажми **Create Credentials** → **OAuth client ID**
5. Выбери **Web application**
6. Настрой:

   **Authorized JavaScript origins:**
   ```
   https://everfreenote.pages.dev
   https://<your-supabase-project>.supabase.co
   ```

   **Authorized redirect URIs:**
   ```
   https://<your-supabase-project>.supabase.co/auth/v1/callback
   ```

7. Сохрани **Client ID** и **Client Secret**

---

### Шаг 2: Настрой Google OAuth в Supabase Dashboard

1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери свой production проект
3. Перейди в **Authentication** → **Providers**
4. Найди **Google** в списке провайдеров
5. Включи Google provider
6. Вставь:
   - **Client ID** (из Google Console)
   - **Client Secret** (из Google Console)
7. Нажми **Save**

---

### Шаг 3: Настрой Redirect URLs в Supabase

1. В Supabase Dashboard → **Authentication** → **URL Configuration**
2. Добавь в **Redirect URLs**:
   ```
   https://everfreenote.pages.dev/auth/callback
   https://everfreenote.pages.dev
   ```
3. Установи **Site URL**:
   ```
   https://everfreenote.pages.dev
   ```
4. Сохрани изменения

---

## 🧪 Проверка

### На Production:

1. Открой https://everfreenote.pages.dev/
2. Нажми "Sign in with Google"
3. Должен открыться Google OAuth popup
4. После авторизации должен вернуться на сайт с авторизованным пользователем

### Локально (опционально):

Если хочешь чтобы Google OAuth работал локально:

1. Добавь в Google Console **Authorized redirect URIs**:
   ```
   http://localhost:54321/auth/v1/callback
   ```

2. Создай `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
   
   # Google OAuth (для локального Supabase)
   GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

3. Перезапусти Supabase:
   ```bash
   npm run db:stop
   npm run db:start
   ```

**Но для локальной разработки проще использовать email/password тестовых пользователей!**

---

## 🔍 Диагностика проблем

### Google OAuth redirect не работает

**Проверь:**
1. ✅ Client ID и Secret правильно скопированы в Supabase
2. ✅ Redirect URI в Google Console точно совпадает с Supabase
3. ✅ Site URL в Supabase настроен на production домен
4. ✅ Redirect URLs включают `/auth/callback`

### Ошибка "redirect_uri_mismatch"

**Причина:** Redirect URI в Google Console не совпадает с тем, что отправляет Supabase.

**Решение:**
1. Скопируй точный redirect URI из ошибки Google
2. Добавь его в Google Console → Authorized redirect URIs
3. Подожди 5 минут (Google кеширует настройки)
4. Попробуй снова

### Ошибка "invalid_client"

**Причина:** Client ID или Secret неправильные.

**Решение:**
1. Перепроверь Client ID и Secret в Google Console
2. Скопируй их заново в Supabase Dashboard
3. Сохрани и попробуй снова

---

## 📋 Чеклист настройки

### Google Console:
- [ ] Создан OAuth Client ID
- [ ] Добавлен `https://everfreenote.pages.dev` в Authorized JavaScript origins
- [ ] Добавлен `https://<project>.supabase.co/auth/v1/callback` в Authorized redirect URIs
- [ ] Скопированы Client ID и Client Secret

### Supabase Dashboard:
- [ ] Google provider включен
- [ ] Client ID вставлен
- [ ] Client Secret вставлен
- [ ] Site URL = `https://everfreenote.pages.dev`
- [ ] Redirect URLs включают `https://everfreenote.pages.dev/auth/callback`
- [ ] Изменения сохранены

### Проверка:
- [ ] Открыл production сайт
- [ ] Нажал "Sign in with Google"
- [ ] Успешно авторизовался
- [ ] Вернулся на сайт с активной сессией

---

## 🎯 Текущий статус

### ✅ Что работает:
- Email/Password авторизация (test@example.com, skip-auth@example.com)
- Локальная разработка с Supabase CLI
- Все тесты проходят

### ❌ Что НЕ работает:
- Google OAuth на production (не настроен)

### 🔧 Что нужно сделать:
1. Настроить Google OAuth credentials в Google Console
2. Добавить credentials в Supabase Dashboard
3. Настроить redirect URLs
4. Протестировать на production

---

## 💡 Альтернатива (временное решение)

Если Google OAuth не критичен прямо сейчас, можешь:

1. **Убрать кнопку Google на production:**
   ```javascript
   // В app/page.js
   const isProduction = process.env.NODE_ENV === 'production'
   
   // В AuthForm
   {!isProduction && (
     <Button onClick={handleSignInWithGoogle}>
       Sign in with Google
     </Button>
   )}
   ```

2. **Оставить только email/password:**
   - Пользователи могут регистрироваться через email
   - Или использовать тестовые аккаунты

---

## 📚 Дополнительные ресурсы

- [Supabase Google OAuth Guide](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Вопросы?** Открой issue или посмотри Supabase документацию!

