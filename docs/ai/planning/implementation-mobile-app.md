---
phase: planning
title: План реализации - Мобильное приложение на React Native + Expo
description: Детальный план задач, приоритеты и временные оценки для разработки мобильного приложения
last_updated: 2025-12-17
---

# План реализации мобильного приложения

## Текущий статус: В разработке (Фаза 3 завершена)

**Прогресс:** 4 из 8 основных задач выполнено (50%)

**Последнее обновление:** 17 декабря 2025

## Обзор

**Цель:** Создать нативное мобильное приложение для iOS и Android с максимальным переиспользованием core-слоя

**Общая оценка времени:** 4-6 недель (1 разработчик)

**Приоритет:** MVP сначала, потом оптимизации и дополнительные фичи

## ✅ Выполненные задачи

### Фаза 1: Подготовка инфраструктуры ✅ ЗАВЕРШЕНО
- ✅ Настройка Expo проекта с TypeScript
- ✅ Настройка metro.config.js и babel.config.js
- ✅ Конфигурация NativeWind v4 + Tailwind CSS
- ✅ Настройка TypeScript paths для @core/* и @ui/mobile/*
- ✅ ESLint конфигурация с globals для React Native
- ✅ Настройка переменных окружения (.env)

### Фаза 2: Адаптеры и провайдеры ✅ ЗАВЕРШЕНО
- ✅ Storage Adapter (AsyncStorage + SecureStore)
- ✅ OAuth Adapter (expo-web-browser)
- ✅ Navigation Adapter (expo-router)
- ✅ Supabase Client Factory для mobile
- ✅ SupabaseProvider с автоматической сессией
- ✅ Хуки useSupabase() и useAuth()

### Фаза 3: Аутентификация ✅ ЗАВЕРШЕНО  
- ✅ Экран логина с Google OAuth
- ✅ Callback экран для OAuth redirect
- ✅ Navigation guard для защищенных роутов
- ✅ Deep linking scheme (everfreenote://)
- ✅ Автоматическое сохранение сессии в SecureStore

### Фаза 4: Список заметок ✅ ЗАВЕРШЕНО
- ✅ Хуки для работы с заметками (useNotes, useCreateNote, useUpdateNote, useDeleteNote)
- ✅ FlashList для виртуализированного списка
- ✅ Pull-to-refresh функционал
- ✅ Loading, Error и Empty states
- ✅ Навигация к деталям заметки
- ✅ Форматирование дат с date-fns
- ✅ Интеграция с core/services/notes
- ✅ Фильтр по user_id в запросах

## 🚧 В разработке

### Фаза 5: Редактор заметок
**Статус:** ✅ Завершено  
**Оценка:** 2-3 дня
 
**План:**
- [x] Создать WebView компонент для TipTap редактора (EditorWebView.tsx)
- [x] Настроить двухстороннюю коммуникацию (postMessage: SET_CONTENT, GET_CONTENT, COMMAND)
- [x] Реализовать автосохранение изменений (debounced updateNote)
- [x] Добавить тулбар с кнопками форматирования (нативный EditorToolbar)
- [x] Обработка загрузки/сохранения контента (через useNote/useUpdateNote)

## 📋 Запланированные задачи

## Фазы разработки

```mermaid
gantt
    title План разработки мобильного приложения
    dateFormat  YYYY-MM-DD
    section Фаза 1: Подготовка
    Настройка проекта           :p1, 2025-12-16, 2d
    Создание базовых адаптеров  :p2, after p1, 2d
    Настройка провайдеров       :p3, after p2, 1d
    
    section Фаза 2: Аутентификация
    OAuth flow                  :a1, after p3, 3d
    Deep linking                :a2, after a1, 2d
    Secure storage              :a3, after a2, 1d
    
    section Фаза 3: Core UI
    Базовые компоненты          :u1, after a3, 3d
    Список заметок              :u2, after u1, 2d
    Rich text редактор          :u3, after u2, 3d
    
    section Фаза 4: CRUD & Sync
    CRUD операции               :c1, after u3, 2d
    Офлайн синхронизация        :c2, after c1, 3d
    Realtime updates            :c3, after c2, 2d
    
    section Фаза 5: Дополнительно
### Фаза 6: Офлайн-режим и синхронизация
**Статус:** ✅ Завершено  
**Оценка:** 3-4 дня

**План:**
- [x] Интеграция expo-sqlite с FTS5 (DatabaseService.ts)
- [x] Адаптация core/services/offlineSyncManager для mobile (MobileSyncService.ts)
- [x] Фоновая синхронизация при восстановлении сети (Автоматически через NetInfo)
- [x] Conflict resolution стратегия (compactQueue)
- [x] UI индикаторы offline/online (Баннер в TabsLayout)

### Фаза 7: Поиск заметок (FTS)
**Статус:** ✅ Завершено  
**Оценка:** 2 дня

**План:**
- [x] Интеграция core/services/search с SQLite FTS5 (useSearch.ts)
- [x] Экран поиска с автокомплитом (app/(tabs)/search.tsx)
- [x] Подсветка результатов поиска (Snippet в результатах)
- [x] История поисковых запросов

### Фаза 8: Deep Linking и финальная настройка
**Статус:** ✅ Завершено  
**Оценка:** 1-2 дня

**План:**
- [x] Настройка expo-linking для прямых ссылок на заметки
- [x] Обработка входящих deep links
- [x] Тестирование OAuth callback через deep links
- [x] Финальная полировка UI/UX

## 📊 Метрики прогресса

| Фаза | Статус | Прогресс | Оценка | Затрачено |
|------|--------|----------|--------|-----------|
| 1. Подготовка инфраструктуры | ✅ Завершено | 100% | 5 дней | ~1 день |
| 2. Адаптеры и провайдеры | ✅ Завершено | 100% | 3 дня | ~1 день |
| 3. Аутентификация | ✅ Завершено | 100% | 3 дня | ~1 день |
| 4. Список заметок | ✅ Завершено | 100% | 2 дня | ~0.5 дня |
| 5. Редактор заметок | ✅ Завершено | 100% | 3 дня | ~1 день |
| 6. Офлайн-режим | ✅ Завершено | 100% | 4 дня | ~1 день |
| 7. Поиск (FTS) | ✅ Завершено | 100% | 2 дня | ~0.5 дня |
| 8. Deep Linking | ✅ Завершено | 100% | 2 дня | ~0.5 дня |
| **ИТОГО** | **✅ Завершено** | **100%** | **24 дня** | **~6.5 дня** |

## 🎯 Достижения

### ✅ Техническая инфраструктура
- Полностью настроенный Expo проект с SDK 54
- NativeWind v4 для стилизации (Tailwind CSS)
- TypeScript с строгими правилами и path aliases
- ESLint с нулевыми ошибками и предупреждениями
- Metro bundler с поддержкой CSS

### ✅ Архитектура
- Чистое разделение на adapters/providers/hooks/components
- 100% переиспользование core-слоя (services, types)
- Адаптеры для всех platform-specific API
- Провайдеры для управления глобальным состоянием

### ✅ Функциональность
- Полноценная OAuth аутентификация через Google
- Безопасное хранение токенов в device keychain
- Защита роутов с navigation guards
- Список заметок с виртуализацией (FlashList)
- Pull-to-refresh и loading states
- Интеграция с Supabase через core/services

### ✅ Code Quality
- TypeScript проверка: 0 ошибок
- ESLint: 0 ошибок, 0 предупреждений
- Proper error handling
- Responsive UI с правильными spacing/shadows

## 📝 Детальная история выполнения

### 17 декабря 2025

**Завершено:**
1. ✅ Создание hooks/useNotes.ts с интеграцией TanStack Query
2. ✅ Реализация FlashList компонента для списка заметок
3. ✅ Добавление pull-to-refresh функционала
4. ✅ Реализация Loading/Error/Empty states
5. ✅ Установка и настройка date-fns для форматирования
6. ✅ Добавление фильтра по user_id в core/services/notes
7. ✅ Настройка переменных окружения EXPO_PUBLIC_*
8. ✅ Финальная валидация и запуск приложения

**Проблемы и решения:**
- FlashList v2 не использует `estimatedItemSize` - удалено свойство
- Отсутствие EXPO_PUBLIC_* переменных - добавлены в .env
- Отсутствие фильтра по user_id - добавлен `.eq('user_id', userId)` в запрос

**Следующие шаги:**
- Начать работу над WebView редактором для заметок
- Настроить bridge для коммуникации с TipTap

---

## 🔍 Детальные задачи (архив)

**Шаги:**
1. Создать новый Expo проект с TypeScript
   ```bash
   npx create-expo-app mobile --template
   cd mobile
   ```

2. Настроить `app.json`
   ```json
   {
     "expo": {
       "name": "EverFreeNote",
       "slug": "everfreenote",
       "scheme": "everfreenote",
       "version": "0.1.0",
       "orientation": "portrait",
       "icon": "./assets/icon.png",
       "splash": {
         "image": "./assets/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#ffffff"
       },
       "ios": {
         "bundleIdentifier": "com.everfreenote.app",
         "supportsTablet": false,
         "infoPlist": {
           "UIBackgroundModes": ["remote-notification"]
         }
       },
       "android": {
         "package": "com.everfreenote.app",
         "adaptiveIcon": {
           "foregroundImage": "./assets/adaptive-icon.png",
           "backgroundColor": "#ffffff"
         },
         "permissions": [
           "android.permission.INTERNET",
           "android.permission.ACCESS_NETWORK_STATE"
         ]
       },
       "plugins": [
         "expo-router",
         "expo-secure-store",
         "expo-web-browser"
       ]
     }
   }
   ```

3. Установить зависимости
   ```bash
   # Core dependencies
   npm install expo-router expo-web-browser expo-linking expo-secure-store
   npm install @react-native-async-storage/async-storage
   npm install expo-sqlite
   npm install @tanstack/react-query
   npm install @supabase/supabase-js
   
   # UI dependencies
   npm install nativewind
   npm install tailwindcss
   npm install lucide-react-native
   npm install react-native-webview
   npm install @shopify/flash-list
   npm install react-native-reanimated
   npm install react-native-gesture-handler
   
   # Network & offline
   npm install @react-native-community/netinfo
   
   # Dev dependencies
   npm install --save-dev @types/react @types/react-native
   ```

4. Настроить TypeScript paths для доступа к core
   ```json
   // tsconfig.json
   {
     "extends": "expo/tsconfig.base",
     "compilerOptions": {
       "strict": true,
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"],
         "@core/*": ["../core/*"],
         "@ui/mobile/*": ["./components/*"]
       }
     }
   }
   ```

**Критерии приемки:**
- ✅ Проект успешно инициализирован
- ✅ Все зависимости установлены
- ✅ TypeScript настроен с paths для core
- ✅ `npm run start` запускается без ошибок

---

### Задача 1.2: Настройка Expo Router
**Приоритет:** Критический  
**Оценка:** 3 часа  
**Статус:** Не начата

**Шаги:**
1. Создать структуру папок
   ```
   mobile/
   ├── app/
   │   ├── (auth)/
   │   │   ├── _layout.tsx
   │   │   ├── login.tsx
   │   │   └── callback.tsx
   │   ├── (tabs)/
   │   │   ├── _layout.tsx
   │   │   ├── index.tsx
   │   │   ├── search.tsx
   │   │   └── profile.tsx
   │   ├── note/
   │   │   └── [id].tsx
   │   ├── _layout.tsx
   │   └── +not-found.tsx
   ```

2. Реализовать Root Layout
   ```typescript
   // app/_layout.tsx
   import { Slot } from 'expo-router'
   import { SupabaseProvider } from '@/providers/SupabaseProvider'
   import { QueryProvider } from '@/providers/QueryProvider'
   
   export default function RootLayout() {
     return (
       <SupabaseProvider>
         <QueryProvider>
           <Slot />
         </QueryProvider>
       </SupabaseProvider>
     )
   }
   ```

3. Настроить navigation guard для защищенных роутов
   ```typescript
   // app/(tabs)/_layout.tsx
   import { Redirect, Tabs } from 'expo-router'
   import { useAuth } from '@/hooks/useAuth'
   
   export default function TabsLayout() {
     const { user, loading } = useAuth()
     
     if (loading) return <LoadingScreen />
     if (!user) return <Redirect href="/(auth)/login" />
     
     return <Tabs>{/* ... */}</Tabs>
   }
   ```

**Критерии приемки:**
- ✅ File-based routing работает
- ✅ Navigation guard защищает приватные роуты
- ✅ Переходы между экранами работают

---

### Задача 1.3: Создание адаптеров
**Приоритет:** Критический  
**Оценка:** 6 часов  
**Статус:** Не начата

**Подзадачи:**

#### 1.3.1: Storage Adapter (AsyncStorage)
```typescript
// mobile/adapters/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { StorageAdapter } from '@core/adapters/storage'

export const mobileStorageAdapter: StorageAdapter = {
  async getItem(key: string) {
    try {
      return await AsyncStorage.getItem(key)
    } catch (error) {
      console.error('[Storage] getItem error:', error)
      return null
    }
  },
  
  async setItem(key: string, value: string) {
    try {
      await AsyncStorage.setItem(key, value)
    } catch (error) {
      console.error('[Storage] setItem error:', error)
      if (error.message?.includes('quota')) {
        // Очистка старых данных при переполнении
        await this.clearOldCache()
        await AsyncStorage.setItem(key, value)
      }
    }
  },
  
  async removeItem(key: string) {
    await AsyncStorage.removeItem(key)
  },
  
  async clearOldCache() {
    // Очистка кэша старее 7 дней
    const keys = await AsyncStorage.getAllKeys()
    const cacheKeys = keys.filter(k => k.startsWith('cache:'))
    
    for (const key of cacheKeys) {
      const item = await AsyncStorage.getItem(key)
      if (item) {
        const { timestamp } = JSON.parse(item)
        const age = Date.now() - timestamp
        if (age > 7 * 24 * 60 * 60 * 1000) {
          await AsyncStorage.removeItem(key)
        }
      }
    }
  },
}
```

#### 1.3.2: OAuth Adapter (Expo WebBrowser)
```typescript
// mobile/adapters/oauth.ts
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import type { OAuthAdapter } from '@core/adapters/oauth'

WebBrowser.maybeCompleteAuthSession()

export const mobileOAuthAdapter: OAuthAdapter = {
  async startOAuth(authUrl: string) {
    const redirectUrl = Linking.createURL('auth/callback')
    
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      redirectUrl,
      { preferEphemeralSession: true }
    )
    
    if (result.type === 'success') {
      return result.url
    } else if (result.type === 'cancel') {
      throw new Error('OAuth cancelled by user')
    } else {
      throw new Error('OAuth failed')
    }
  },
}
```

#### 1.3.3: Navigation Adapter (Expo Router)
```typescript
// mobile/adapters/navigation.ts
import { router } from 'expo-router'
import type { NavigationAdapter } from '@core/adapters/navigation'

export const mobileNavigationAdapter: NavigationAdapter = {
  navigate(url: string, options?: { replace?: boolean }) {
    if (options?.replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  },
}
```

#### 1.3.4: Supabase Client
```typescript
// mobile/adapters/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'
import { mobileStorageAdapter } from './storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mobileStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Критерии приемки:**
- ✅ Все адаптеры реализованы
- ✅ Storage adapter корректно сохраняет/читает данные
- ✅ OAuth adapter открывает браузер и получает callback
- ✅ Navigation adapter переключает экраны
- ✅ Supabase client инициализируется с mobile storage

---

### Задача 1.4: Настройка провайдеров
**Приоритет:** Высокий  
**Оценка:** 2 часа  
**Статус:** Не начата

```typescript
// mobile/providers/SupabaseProvider.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/adapters/supabaseClient'
import type { User } from '@supabase/supabase-js'

type SupabaseContextType = {
  user: User | null
  loading: boolean
}

const SupabaseContext = createContext<SupabaseContextType>({
  user: null,
  loading: true,
})

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    
    // Слушаем изменения auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  return (
    <SupabaseContext.Provider value={{ user, loading }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export const useSupabase = () => useContext(SupabaseContext)
```

**Критерии приемки:**
- ✅ SupabaseProvider инициализируется
- ✅ QueryProvider настроен
- ✅ ThemeProvider работает

---

## Фаза 2: Аутентификация (6 дней)

### Задача 2.1: OAuth через Google
**Приоритет:** Критический  
**Оценка:** 8 часов  
**Статус:** Не начата

**Шаги:**
1. Создать login экран
2. Реализовать OAuth flow
3. Обработать callback
4. Сохранить токены в SecureStore

**Файлы:**
- `app/(auth)/login.tsx`
- `app/(auth)/callback.tsx`
- `hooks/useAuth.ts`

**Критерии приемки:**
- ✅ Кнопка "Войти через Google" работает
- ✅ После успешного входа редирект на главный экран
- ✅ Токены сохраняются в SecureStore
- ✅ При перезапуске приложения пользователь остается залогинен

---

### Задача 2.2: Deep Linking
**Приоритет:** Критический  
**Оценка:** 6 часов  
**Статус:** Не начата

**Шаги:**
1. Настроить схему `everfreenote://`
2. Зарегистрировать в app.json
3. Обработать callback URL
4. Добавить в Supabase redirect URL

**Критерии приемки:**
- ✅ Deep link `everfreenote://auth/callback` работает
- ✅ OAuth редирект корректно обрабатывается
- ✅ В production работает universal links

---

## Фаза 3: Core UI Components (8 дней)

### Задача 3.1: Базовые UI компоненты
**Приоритет:** Высокий  
**Оценка:** 8 часов  
**Статус:** Не начата

**Компоненты для создания:**
- Button
- Input
- Card
- Badge (для тегов)
- Loading spinner
- Empty state

**Пример:**
```typescript
// components/ui/Button.tsx
import { Pressable, Text } from 'react-native'
import { styled } from 'nativewind'

const StyledPressable = styled(Pressable)
const StyledText = styled(Text)

export const Button = ({ variant = 'default', onPress, children }) => (
  <StyledPressable
    onPress={onPress}
    className={`rounded-lg px-4 py-3 ${
      variant === 'default' ? 'bg-primary' : 'bg-transparent border'
    }`}
  >
    <StyledText className="text-white font-medium text-center">
      {children}
    </StyledText>
  </StyledPressable>
)
```

**Критерии приемки:**
- ✅ Все компоненты созданы
- ✅ Стилизация через NativeWind работает
- ✅ Компоненты переиспользуемые

---

### Задача 3.2: Список заметок (виртуализация)
**Приоритет:** Критический  
**Оценка:** 6 часов  
**Статус:** Не начата

```typescript
// components/NoteList.tsx
import { FlashList } from '@shopify/flash-list'
import { NoteCard } from './NoteCard'
import type { Note } from '@core/types/domain'

type NoteListProps = {
  notes: Note[]
  onNotePress: (note: Note) => void
  onTagPress: (tag: string) => void
}

export const NoteList = ({ notes, onNotePress, onTagPress }: NoteListProps) => {
  return (
    <FlashList
      data={notes}
      renderItem={({ item }) => (
        <NoteCard
          note={item}
          onPress={() => onNotePress(item)}
          onTagPress={onTagPress}
        />
      )}
      estimatedItemSize={120}
      keyExtractor={(item) => item.id}
    />
  )
}
```

**Критерии приемки:**
- ✅ FlashList рендерит список
- ✅ Скролл плавный (60 FPS)
- ✅ NoteCard отображает заметку корректно

---

### Задача 3.3: Rich Text Editor (WebView)
**Приоритет:** Критический  
**Оценка:** 8 часов  
**Статус:** Не начата

**Решение:** WebView с полным переиспользованием существующего RichTextEditor

**Подзадачи:**

#### 3.3.1: Создать страницу для WebView
```typescript
// app/editor-webview/page.tsx
'use client'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { useEffect, useState } from 'react'

export default function EditorWebViewPage() {
  const [content, setContent] = useState('')

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data
      if (type === 'SET_CONTENT') setContent(payload)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleChange = (html: string) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'CONTENT_CHANGED',
        payload: html
      }))
    }
  }

  return (
    <div className="h-screen w-screen">
      <RichTextEditor initialContent={content} onChange={handleChange} />
    </div>
  )
}
```

#### 3.3.2: Создать React Native обертку
```typescript
// mobile/components/EditorWebView.tsx
import WebView from 'react-native-webview'

export const EditorWebView = forwardRef<EditorWebViewHandle, Props>(
  ({ initialContent, onContentChange }, ref) => {
    const webViewRef = useRef<WebView>(null)
    const currentContent = useRef(initialContent)

    useImperativeHandle(ref, () => ({
      setContent(html: string) {
        webViewRef.current?.postMessage(JSON.stringify({
          type: 'SET_CONTENT',
          payload: html
        }))
      },
      getContent() {
        return currentContent.current
      }
    }))

    const handleMessage = (event: any) => {
      const { type, payload } = JSON.parse(event.nativeEvent.data)
      if (type === 'CONTENT_CHANGED') {
        currentContent.current = payload
        onContentChange?.(payload)
      }
    }

    const editorUrl = __DEV__ 
      ? 'http://localhost:3000/editor-webview'
      : 'https://everfreenote.app/editor-webview'

    return (
      <WebView
        ref={webViewRef}
        source={{ uri: editorUrl }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
      />
    )
  }
)
```

**Критерии приемки:**
- ✅ Редактор загружается в WebView
- ✅ Все TipTap расширения работают
- ✅ Bridge коммуникация работает (SET_CONTENT, CONTENT_CHANGED)
- ✅ Автосохранение работает
- ✅ Производительность приемлемая (<500ms загрузка)

---

## Фаза 4: CRUD & Sync (7 дней)

### Задача 4.1: CRUD операции с заметками
**Приоритет:** Критический  
**Оценка:** 6 часов  
**Статус:** Не начата

**Использовать существующий NoteService из core:**

```typescript
// hooks/useNotes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NoteService } from '@core/services/notes'
import { supabase } from '@/adapters/supabaseClient'

const noteService = new NoteService(supabase)

export const useNotes = (userId: string) => {
  const queryClient = useQueryClient()
  
  const { data, isLoading } = useQuery({
    queryKey: ['notes', userId],
    queryFn: () => noteService.getNotes(userId),
  })
  
  const createMutation = useMutation({
    mutationFn: (note) => noteService.createNote({ ...note, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', userId] })
    },
  })
  
  return {
    notes: data?.notes || [],
    isLoading,
    createNote: createMutation.mutate,
  }
}
```

**Критерии приемки:**
- ✅ Создание заметки работает
- ✅ Редактирование заметки работает
- ✅ Удаление заметки работает
- ✅ TanStack Query кэширует данные

---

### Задача 4.2: Офлайн синхронизация
**Приоритет:** Высокий  
**Оценка:** 10 часов  
**Статус:** Не начата

**Использовать offlineSyncManager из core:**

```typescript
// hooks/useOfflineSync.ts
import { useEffect } from 'react'
import { AppState } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { offlineSyncManager } from '@core/services/offlineSyncManager'

export const useOfflineSync = () => {
  useEffect(() => {
    // Слушаем изменения сети
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        offlineSyncManager.processQueue()
      }
    })
    
    // Слушаем app state
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        offlineSyncManager.processQueue()
      }
    })
    
    return () => {
      unsubscribe()
      subscription.remove()
    }
  }, [])
}
```

**Критерии приемки:**
- ✅ Офлайн создание заметки добавляется в очередь
- ✅ При появлении интернета очередь обрабатывается
- ✅ Конфликты разрешаются корректно

---

## Фаза 5: Дополнительные фичи (5 дней)

### Задача 5.1: Поиск и фильтрация
**Приоритет:** Средний  
**Оценка:** 6 часов  

**Использовать SearchService из core**

---

### Задача 5.2: Экспорт/Импорт ENEX
**Приоритет:** Низкий  
**Оценка:** 6 часов  

**Использовать ENEX сервисы из core + expo-file-system**

---

## Фаза 6: Тестирование (7 дней)

### Задача 6.1: Unit тесты
**Оценка:** 10 часов  

**Покрытие:**
- Компоненты: 80%
- Hooks: 90%
- Utils: 100%

```typescript
// components/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../ui/Button'

describe('Button', () => {
  it('вызывает onPress при нажатии', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button onPress={onPress}>Test</Button>)
    fireEvent.press(getByText('Test'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

---

## Фаза 7: Релиз (10 дней)

### Задача 7.1: Оптимизация bundle
- Tree shaking
- Code splitting
- Hermes engine

### Задача 7.2: Beta testing
- TestFlight (iOS)
- Internal Testing (Android)

### Задача 7.3: Production release
- App Store submission
- Google Play submission

---

## Риски и зависимости

| Риск | Вероятность | Влияние | План митигации |
|------|-------------|---------|----------------|
| TipTap не работает | Высокая | Критическое | Использовать react-native-pell-rich-editor |
| OAuth сложный | Средняя | Высокое | Следовать документации Supabase |
| App Store rejection | Низкая | Высокое | Следовать HIG, проверить перед submission |

---

## Метрики успеха

- ✅ 100% core-слой переиспользован
- ✅ 80%+ покрытие тестами
- ✅ Размер bundle < 50MB
- ✅ Time to Interactive < 2s
- ✅ Scroll FPS = 60

---

## Связанные документы

- [Requirements](../requirements/feature-mobile-app-react-native.md)
- [Design](../design/design-mobile-app.md)
