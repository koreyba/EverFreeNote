# ⚡ Quick Start Guide

## 🚀 Локальная разработка (3 команды)

```bash
# 1. Установи зависимости
npm install

# 2. Запусти Supabase (БД + Auth + API)
npm run db:start

# 3. Запусти приложение
npm run dev
```

**Готово!** Открой http://localhost:3000

---

## 🧪 Запуск тестов

### Локально
```bash
# Все тесты
npm test

# Только компонентные (быстро)
npm run test:component

# Только E2E (медленно)
npm run test:e2e

# Интерактивно (с UI)
npm run cypress
```

### В GitHub Actions
```bash
# Component тесты - запускаются АВТОМАТИЧЕСКИ при каждом push
git push

# E2E тесты - запускаются ВРУЧНУЮ
gh workflow run e2e.yml
# или через GitHub UI: Actions → E2E Tests (Manual) → Run workflow
```

---

## 📦 Первый запуск

### 1. Клонируй репозиторий
```bash
git clone https://github.com/YOUR_USERNAME/EverFreeNote.git
cd EverFreeNote
```

### 2. Установи зависимости
```bash
npm install
```

### 3. Установи Supabase CLI (один раз)

**Windows (PowerShell):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
npm install -g supabase
```

### 4. Создай `.env.local`
```bash
cp .env.local.example .env.local
```

### 5. Запусти Supabase
```bash
npm run db:start
```

Первый запуск займёт 2-3 минуты (скачивание Docker образов).

### 6. Запусти приложение
```bash
npm run dev
```

### 7. Открой в браузере
- **Приложение**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323

---

## 👤 Тестовые пользователи

| Email | Пароль | Описание |
|-------|--------|----------|
| `skip-auth@example.com` | `testpassword123` | Пользователь с 5 заметками |
| `test@example.com` | `testpassword123` | Пустой пользователь |

---

## 🛠️ Полезные команды

### База данных
```bash
npm run db:start    # Запустить Supabase
npm run db:stop     # Остановить Supabase
npm run db:reset    # Сбросить БД (применить миграции заново)
npm run db:status   # Статус и credentials
npm run db:studio   # Открыть Supabase Studio
```

### Разработка
```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run start       # Production server
```

### Тестирование
```bash
npm test            # Все тесты
npm run test:all    # Component + E2E последовательно
npm run cypress     # Cypress UI
```

---

## 🐛 Troubleshooting

### Порт 3000 занят
```bash
# Next.js автоматически выберет 3001
# Или убей процесс:
npx kill-port 3000
```

### Supabase не запускается
```bash
# Проверь Docker
docker ps

# Перезапусти
npm run db:stop
npm run db:start
```

### Тесты падают
```bash
# 1. Убедись что Supabase запущен
npm run db:status

# 2. Убедись что Next.js запущен
curl http://localhost:3000

# 3. Перезапусти всё
npm run db:reset
npm run dev
npm test
```

---

## 📚 Документация

- **Полная документация**: [docs/run_test.md](docs/run_test.md)
- **Архитектура**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Деплой**: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- **GitHub Actions**: [.github/workflows/README.md](.github/workflows/README.md)

---

## 🎯 Что дальше?

1. ✅ Запусти приложение локально
2. ✅ Залогинься с `skip-auth@example.com`
3. ✅ Создай свою первую заметку
4. ✅ Запусти тесты
5. ✅ Изучи код в `app/` и `components/`
6. ✅ Сделай свой первый PR!

---

**Вопросы?** Открой issue в GitHub! 🚀

