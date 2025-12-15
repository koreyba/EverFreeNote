# Mobile UI layer (React Native / Expo)

## 📱 О проекте

Нативное мобильное приложение для iOS и Android, построенное на React Native и Expo с максимальным переиспользованием core-слоя.

## � Быстрый старт

### Запуск проекта
```powershell
cd ui/mobile
npm install --legacy-peer-deps
npm start
```

**📖 Подробная инструкция:** [LAUNCH_GUIDE.md](./LAUNCH_GUIDE.md)

### Проверка кода (ОБЯЗАТЕЛЬНО перед коммитом!)
```powershell
npm run validate  # TypeScript + ESLint
```

**📋 Правила валидации:** [VALIDATION_RULES.md](./VALIDATION_RULES.md)

---

## 📚 Документация

**Перед началом работы обязательно ознакомьтесь с:**

1. **[Требования](../../docs/ai/requirements/feature-mobile-app-react-native.md)** - полное описание проблемы, целей, пользовательских историй и критериев успеха
2. **[Дизайн и архитектура](../../docs/ai/design/design-mobile-app.md)** - детальная архитектура, адаптеры, UI компоненты, диаграммы
3. **[План реализации](../../docs/ai/planning/implementation-mobile-app.md)** - пошаговый план с задачами, оценками и примерами кода
4. **[Краткое резюме](../../docs/ai/MOBILE_APP_SUMMARY.md)** - quick start guide и чек-лист

---

## 🏗️ Структура проекта

```
ui/mobile/                       # React Native приложение (Expo)
├── app/                         # Expo Router (file-based routing)
│   ├── (auth)/                  # Auth group
│   │   └── login.tsx            # Экран входа
│   ├── (tabs)/                  # Main tabs group
│   │   ├── index.tsx            # Список заметок
│   │   └── settings.tsx         # Настройки
│   ├── note/[id].tsx            # Редактор заметки
│   ├── _layout.tsx              # Root layout
│   └── index.tsx                # Entry point
├── components/                  # React Native компоненты
├── hooks/                       # React Native специфичные хуки
├── adapters/                    # Platform adapters
├── providers/                   # Context providers
├── assets/                      # Изображения, шрифты
├── app.json                     # Expo конфигурация
├── package.json                 # Зависимости
├── tsconfig.json                # TypeScript config
├── eslint.config.mjs            # ESLint config
├── LAUNCH_GUIDE.md              # 📖 Как запустить приложение
└── VALIDATION_RULES.md          # 📋 Правила проверки кода
```
├── adapters/                    # Платформенные адаптеры
│   ├── storage.ts              # AsyncStorage adapter
│   ├── oauth.ts                # Expo OAuth adapter
│   ├── navigation.ts           # Expo Router adapter
│   └── supabaseClient.ts       # Mobile Supabase client
├── providers/                   # React Context провайдеры
├── constants/
│   ├── theme.ts                # Цвета, шрифты (синхронизированы с web)
│   └── config.ts
└── app.json                     # Expo config
```

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Для iOS: Xcode (macOS)
- Для Android: Android Studio

### Инициализация проекта (TODO)

```bash
# В корне проекта EverFreeNote
npx create-expo-app mobile --template
cd mobile

# Установка зависимостей
npm install expo-router expo-web-browser expo-linking expo-secure-store
npm install @react-native-async-storage/async-storage
npm install @tanstack/react-query @supabase/supabase-js
npm install nativewind tailwindcss lucide-react-native
npm install react-native-pell-rich-editor @shopify/flash-list
npm install @react-native-community/netinfo

# Запуск проекта
npm run start
```

### Переменные окружения

Создайте `.env` файл:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 🎯 Ключевые технологии

### Core Stack:
- **React Native** 0.74+ (новая архитектура)
- **Expo SDK 51+** (managed workflow)
- **Expo Router** (file-based routing)
- **NativeWind v4** (Tailwind CSS для RN)

### UI & Styling:
- **NativeWind** для стилизации (синхронизировано с web)
- **lucide-react-native** для иконок
- **FlashList** для виртуализации списков
- **react-native-pell-rich-editor** для rich text

### State & Data:
- **TanStack Query v5** для кэширования
- **Supabase JS v2** для backend
- **AsyncStorage** для локального хранения
- **NetInfo** для определения статуса сети

## 🔌 Адаптеры

Все платформенные зависимости изолированы в адаптерах:

### Storage Adapter (AsyncStorage)
```typescript
// adapters/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StorageAdapter } from '@core/adapters/storage'

export const mobileStorageAdapter: StorageAdapter = {
  async getItem(key: string) { /* ... */ },
  async setItem(key: string, value: string) { /* ... */ },
  async removeItem(key: string) { /* ... */ },
}
```

### OAuth Adapter (Expo WebBrowser)
```typescript
// adapters/oauth.ts
import * as WebBrowser from 'expo-web-browser'
import type { OAuthAdapter } from '@core/adapters/oauth'

export const mobileOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string) { /* ... */ },
}
```

### Navigation Adapter (Expo Router)
```typescript
// adapters/navigation.ts
import { router } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

export const mobileNavigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }) { /* ... */ },
}
```

## 🔄 Переиспользование core-слоя

✅ **100% переиспользование:**
- `core/services/*` - все сервисы (notes, auth, search, offline)
- `core/types/*` - все типы
- `core/utils/*` - все утилиты
- `core/enex/*` - экспорт/импорт ENEX

Пример:
```typescript
// hooks/useNotes.ts
import { NoteService } from '@core/services/notes'
import { supabase } from '@/adapters/supabaseClient'

const noteService = new NoteService(supabase)

export const useNotes = (userId: string) => {
  return useQuery({
    queryKey: ['notes', userId],
    queryFn: () => noteService.getNotes(userId),
  })
}
```

## 📱 Особенности мобильного приложения

### Офлайн-режим
- Использует существующий `offlineSyncManager` из core
- Автоматическая синхронизация при появлении интернета
- Очередь операций сохраняется в AsyncStorage

### OAuth аутентификация
- Google Sign-In через expo-web-browser
- Deep linking: `everfreenote://auth/callback`
- Токены хранятся в Expo SecureStore

### Производительность
- FlashList для виртуализации больших списков (10000+ заметок)
- Мемоизация компонентов
- Debouncing поиска (300ms)
- Автосохранение с debounce (500ms)

## 🎨 Дизайн-система

Все цвета, шрифты и spacing синхронизированы с веб-версией:

```typescript
// constants/theme.ts
export const colors = {
  light: {
    primary: 'hsl(221.2 83.2% 53.3%)',
    background: 'hsl(0 0% 100%)',
    // ...
  },
  dark: {
    primary: 'hsl(217.2 91.2% 59.8%)',
    background: 'hsl(222.2 84% 4.9%)',
    // ...
  },
}
```

## 🧪 Тестирование

### Unit тесты (Jest)
```bash
npm run test
```

### Integration тесты (Detox)
```bash
npm run test:e2e
```

**Целевое покрытие:**
- Компоненты: 80%
- Hooks: 90%
- Utils: 100%

## 📦 Сборка и развертывание

### Development build
```bash
npx expo run:ios
npx expo run:android
```

### Production build (EAS)
```bash
eas build --platform ios
eas build --platform android
```

### Over-the-Air Updates
```bash
eas update --branch production
```

## 🔐 Безопасность

- Токены хранятся в **Expo SecureStore** (Keychain на iOS, EncryptedSharedPreferences на Android)
- OAuth через **PKCE flow** (встроен в Supabase)
- Все запросы к Supabase через **https**

## 📊 Метрики производительности

| Метрика | Целевое значение |
|---------|------------------|
| Time to Interactive | < 2s |
| List scroll FPS | 60 FPS |
| Note switch time | < 100ms |
| Bundle size | < 50MB |

## 🐛 Известные проблемы и решения

### TipTap не работает в React Native
**Решение:** Используем react-native-pell-rich-editor для MVP

### AsyncStorage лимит 6MB на iOS
**Решение:** При необходимости мигрируем на expo-sqlite

### Клавиатура перекрывает контент
**Решение:** Используем KeyboardAvoidingView

## 🔗 Полезные ссылки

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [NativeWind](https://www.nativewind.dev/)
- [Supabase with React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [FlashList](https://shopify.github.io/flash-list/)

## 📋 Текущий статус

**Фаза:** Документация завершена ✅  
**Следующий шаг:** Инициализация Expo проекта

## 🤝 Вклад в проект

Следуйте [плану реализации](../../docs/ai/planning/implementation-mobile-app.md) для систематической разработки.

---

**Примечание:** Этот слой находится в разработке. Core logic переиспользуется из `/core`.
