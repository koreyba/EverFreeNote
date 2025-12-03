# План обновления до Next.js 16

## 📊 Текущее состояние

**Версии:**
- Next.js: 15.5.6 → 16.x
- React: 19 (уже актуально)
- TypeScript: 5.9.3 ✅ (совместимо)
- Node.js: 20 ✅ (совместимо, требуется 20.9.0+)

---

## 🔍 Анализ зависимостей

### ✅ Полностью совместимые (не требуют изменений)

**UI библиотеки:**
- `@radix-ui/*` - все пакеты совместимы с React 19 и Next.js 16
- `lucide-react` - совместимо
- `sonner` - совместимо
- `vaul` - совместимо
- `cmdk` - совместимо
- `input-otp` - совместимо

**State Management:**
- `@tanstack/react-query` v5.90.5 ✅ (совместимо с React 19)
- `@tanstack/react-table` v8.21.3 ✅

**Styling:**
- `tailwindcss` v4.1.14 ✅ (совместимо)
- `@tailwindcss/typography` v0.5.19 ✅
- `tailwindcss-animate` ✅
- `tailwind-merge` ✅
- `clsx` ✅
- `class-variance-authority` ✅

**Forms:**
- `react-hook-form` v7.65.0 ✅ (совместимо с React 19)
- `@hookform/resolvers` v5.2.2 ✅
- `zod` v4.1.12 ✅

**Backend:**
- `@supabase/ssr` v0.7.0 ✅ (совместимо, но рекомендуется обновить)
- `@supabase/supabase-js` v2.75.1 ✅

**Testing:**
- `cypress` v15.7.0 ✅ (совместимо с React 19 и Next.js 16)
- `@testing-library/cypress` ✅
- `@cypress/code-coverage` ✅

**Utilities:**
- `date-fns` v4.1.0 ✅
- `uuid` v13.0.0 ✅
- `isomorphic-dompurify` ✅
- `react-window` ✅
- `react-resizable-panels` ✅
- `embla-carousel-react` ✅
- `recharts` ✅
- `react-day-picker` ✅
- `react-color` ✅

### ⚠️ Требуют обновления

**1. Next.js Core:**
- `next`: 15.5.6 → 16.x (latest)
- `eslint-config-next`: 15.5.6 → 16.x (latest)

**2. TipTap (критично для React 19):**
- `@tiptap/react`: 3.7.2 → 3.8.0+ (рекомендуется 3.9.0+)
- `@tiptap/starter-kit`: 3.7.2 → 3.8.0+
- Все `@tiptap/extension-*`: 3.7.2 → 3.8.0+

**Причина:** TipTap 3.7.2 использует Tippy.js, который не совместим с React 19. Версии 3.0+ используют Floating UI.

**3. ESLint (требует миграции конфигурации):**
- `eslint`: 8.57.1 → 9.x (latest)
- `eslint-config-next`: требует обновления конфигурации на flat config

**4. Supabase (рекомендуется):**
- `@supabase/ssr`: 0.7.0 → 0.8.0+ (latest)
- `@supabase/supabase-js`: 2.75.1 → 2.80.0+ (latest)

**5. next-themes (потенциальные проблемы):**
- `next-themes`: 0.4.6 → проверить совместимость с React 19

**6. Другие dev зависимости:**
- `dotenv`: 17.2.3 → latest (не критично)
- `autoprefixer`: 10.4.21 → latest (не критично)
- `postcss`: 8 → latest (не критично)

---

## 🚨 Потенциальные проблемы

### 1. next-themes и React 19
**Проблема:** Известны проблемы совместимости с React 19.0.0-rc
**Решение:** 
- Протестировать текущую версию 0.4.6
- Если проблемы - рассмотреть альтернативы или обновить до latest
- Возможна замена на `next-themes@latest` или кастомное решение

### 2. ESLint миграция на flat config
**Проблема:** Next.js 16 требует ESLint 9, который использует flat config
**Решение:** Создать `eslint.config.mjs` вместо `.eslintrc.json`

### 3. TipTap обновление
**Проблема:** Могут быть breaking changes в API
**Решение:** 
- Проверить changelog TipTap 3.8+
- Протестировать RichTextEditor после обновления

---

## 📋 План обновления (пошагово)

### Этап 1: Подготовка
```bash
# 1. Создать бэкап
git checkout -b upgrade/nextjs-16
git commit -am "Backup before Next.js 16 upgrade"

# 2. Проверить текущее состояние
npm run build
npm run test:component
npm run eslint
```

### Этап 2: Обновление основных зависимостей
```bash
# 1. Обновить Next.js и ESLint config
npm install next@latest eslint-config-next@latest

# 2. Обновить ESLint до версии 9
npm install --save-dev eslint@latest

# 3. Обновить TipTap (критично!)
npm install @tiptap/react@latest @tiptap/starter-kit@latest \
  @tiptap/extension-color@latest \
  @tiptap/extension-font-family@latest \
  @tiptap/extension-heading@latest \
  @tiptap/extension-highlight@latest \
  @tiptap/extension-image@latest \
  @tiptap/extension-link@latest \
  @tiptap/extension-subscript@latest \
  @tiptap/extension-superscript@latest \
  @tiptap/extension-task-item@latest \
  @tiptap/extension-task-list@latest \
  @tiptap/extension-text-align@latest \
  @tiptap/extension-text-style@latest \
  @tiptap/extension-underline@latest

# 4. Обновить Supabase (рекомендуется)
npm install @supabase/ssr@latest @supabase/supabase-js@latest
```

### Этап 3: Миграция ESLint конфигурации
**Создать `eslint.config.mjs`:**
```javascript
import { defineConfig } from 'eslint/config';
import { FlatCompat } from '@eslint/compat';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default defineConfig([
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    extends: [
      js.configs.recommended,
      ...compat.extends('next/core-web-vitals'),
    ],
    rules: {
      // Сохранить существующие правила из .eslintrc.json
    },
  },
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      'cypress/**',
    ],
  },
]);
```

**Установить зависимости:**
```bash
npm install --save-dev @eslint/compat @eslint/js @next/eslint-plugin-next
```

**Удалить старый конфиг:**
```bash
# После проверки работы нового конфига
rm .eslintrc.json
```

### Этап 4: Обновление остальных зависимостей
```bash
# Обновить остальные пакеты (опционально)
npm update next-themes dotenv autoprefixer postcss

# Или обновить все до последних версий в пределах диапазонов
npm update
```

### Этап 5: Проверка и тестирование
```bash
# 1. Проверить TypeScript
npm run type-check

# 2. Проверить линтер
npm run eslint

# 3. Собрать проект
npm run build

# 4. Запустить тесты
npm run test:component

# 5. Проверить dev сервер
npm run dev
```

### Этап 6: Исправление проблем

**Если проблемы с next-themes:**
```bash
# Попробовать обновить
npm install next-themes@latest

# Или проверить альтернативы в компонентах/theme-provider.tsx
```

**Если проблемы с TipTap:**
- Проверить RichTextEditor.tsx
- Обновить импорты если нужно
- Проверить API изменений в changelog TipTap

**Если проблемы с ESLint:**
- Проверить правила в eslint.config.mjs
- Убедиться что все плагины установлены

---

## ✅ Чеклист после обновления

- [ ] Next.js обновлен до 16.x
- [ ] ESLint мигрирован на flat config
- [ ] TipTap обновлен до 3.8.0+
- [ ] Supabase обновлен до latest
- [ ] Проект собирается без ошибок (`npm run build`)
- [ ] TypeScript проверка проходит (`npm run type-check`)
- [ ] ESLint проходит (`npm run eslint`)
- [ ] Компонентные тесты проходят (`npm run test:component`)
- [ ] Dev сервер запускается (`npm run dev`)
- [ ] RichTextEditor работает корректно
- [ ] Theme switching работает (next-themes)
- [ ] Все функции приложения работают

---

## 📝 Примечания

1. **TipTap обновление критично** - старые версии несовместимы с React 19
2. **ESLint миграция обязательна** - Next.js 16 требует ESLint 9
3. **next-themes** - возможны проблемы, нужен тест
4. **Все остальные зависимости** - совместимы или требуют минорных обновлений

---

## 🔄 Откат (если что-то пошло не так)

```bash
# Вернуться к предыдущей версии
git checkout upgrade/nextjs-16
git reset --hard HEAD~1

# Или восстановить package.json и package-lock.json
git checkout main -- package.json package-lock.json
npm install
```

---

## 📚 Полезные ссылки

- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [TipTap 3.0 Release Notes](https://tiptap.dev/blog/release-notes/tiptap-3-0-is-stable)
- [ESLint 9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files-new)
- [React 19 Features](https://react.dev/blog/2024/04/25/react-19)
