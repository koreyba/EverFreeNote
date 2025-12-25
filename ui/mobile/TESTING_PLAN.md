# План тестирования (React Native / Expo) — EverFreeNote Mobile

## Отчет о текущем состоянии

- Проект: `ui/mobile` (Expo + TypeScript, expo-router, React Query, AsyncStorage, Supabase).
- Тестов нет: отсутствуют Jest, @testing-library/react-native, конфиги и тестовая архитектура.
- Предположение по окружению: Expo Managed workflow (dev-client/bare не обнаружены; наличие `android/` трактуем как prebuild).
- Ограничение: тесты запускаются только локально; CI можно добавить позже без сложного пайплайна.

## 1. Стратегия тестирования

### 1.1 Категории тестов

- **Unit**: чистая логика без RN/UI (core/services, utils, adapters).
- **Component**: отдельные RN-компоненты (props → UI/события).
- **Integration**: экраны и флоу из нескольких компонентов + провайдеры (auth, sync, search).

### 1.2 Что НЕ делаем на первом этапе

- **E2E** (Detox/Appium) — отложить до стабилизации базовых уровней.
- Снапшоты — исключить (низкий ROI, высокая ломкость).
- Сквозные тесты с реальными сетями/SQLite — только моки.

### 1.3 Пирамида для Expo/RN

- 70% Unit (быстрые, стабильные, максимальный ROI)
- 20% Component (визуальная/поведенческая валидация)
- 10% Integration (критические экраны/флоу)

### 1.4 Приоритеты (максимальный ROI)

1. **Core-логика**: offline cache/queue/sync, search, selection, sanitizer, экспорт/импорт.
2. **Auth и навигация**: обработка сессии, guard’ы, deep links.
3. **Критические экраны**: Notes list, Note details, Search.

### 1.5 Граница между уровнями

- **Unit**: без `react-native`, без провайдеров, без side-effects.
- **Component**: один компонент + его UI-состояния, с моками зависимостей.
- **Integration**: экран/флоу + providers + навигация (моки API/хранилища).

### 1.6 Детерминированность (анти-флейк)

- Никакой реальной сети, времени и внешних хранилищ.
- Управляемые таймеры (`jest.useFakeTimers`, `setSystemTime`).
- Стабильные данные (builders/fixtures, без случайностей).
- Моки повторяемы и локальны (внутри теста/файла).
- `react-query` без ретраев, короткие таймауты.

### 1.7 Поддержка со временем

- Один стандартный `renderWithProviders`.
- Единые builders/fixtures на уровне `tests/`.
- Ревью тестов как часть PR (см. чеклист ниже).
- Регулярная чистка flake и устаревших моков.

## 2. Архитектура тестов

### 2.1 Структура каталогов

```
ui/mobile/
  tests/
    unit/
    component/
    integration/
    fixtures/
    mocks/
    builders/
    utils/
  app/
  components/
  hooks/
  services/
  adapters/
  lib/
```

Допускается co-location для сложных компонентов, но по умолчанию — `tests/`.

### 2.2 Именование

- Файлы: `*.test.ts` / `*.test.tsx`
- Нейминг: `ComponentName.test.tsx`, `search.test.ts`
- Сьюты по сценарию: `describe('NotesScreen', ...)`

### 2.3 Fixtures / Mocks / Builders

- `tests/fixtures/` — статические данные (JSON, базовые сущности).
- `tests/builders/` — фабрики для `Note`, `User`, `Session`.
- `tests/mocks/` — моки модулей (storage, network, device).
- `tests/utils/` — helpers (`renderWithProviders`, `flushPromises`).

### 2.4 Screen-level тесты

- Тестируем экран как интеграцию: providers + навигация + ключевые действия.
- Валидация: корректные состояния (loading/error/empty/success).
- Экранные тесты размещать в `tests/integration/`.

### 2.5 Page-object-подобные абстракции

Использовать **легковесный Screen Object**:

```ts
const notesScreen = {
  addButton: () => screen.getByTestId('notes.add'),
  noteTitle: (title: string) => screen.getByText(title),
  searchInput: () => screen.getByPlaceholderText('Search'),
}
```

Это ускоряет поддержку, не прячет важные детали, и остается прозрачным.

### 2.6 Селекторы: testID, role, текст

- Приоритет: `accessibilityRole` + `name` (role-based queries).
- `testID` только там, где нет стабильного текста/role.
- Не использовать динамический текст и авто-генерации.
- Стабильный формат: `feature.element.state` (например `notes.add`).

### 2.7 renderWithProviders

Общий helper для экранов и сложных компонентов:

```tsx
// tests/utils/renderWithProviders.tsx
export function renderWithProviders(ui: React.ReactElement, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <SupabaseProvider>
          <QueryClientProvider client={queryClient}>
            {ui}
          </QueryClientProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
    options
  )
}
```

### 2.8 Моки (сеть/хранилище/девайс)

- **Сеть**: `global.fetch = jest.fn()` или `jest.mock('axios')`.
- **AsyncStorage**: `@react-native-async-storage/async-storage/jest/async-storage-mock`.
- **SecureStore**: jest mock модуль.
- **expo-router**: моки `useRouter`, `useLocalSearchParams`.
- **Timers/Date**: `jest.useFakeTimers` + `setSystemTime`.
- **Dimensions/ColorScheme**: `jest.spyOn` + fixed values.

### 2.9 Anti-patterns

- Снапшоты.
- Проверка implementation details (state, internal hooks).
- Нестабильные селекторы (структура layout, индекс элементов).
- Over-mocking (моки всего, включая простую логику).

## 3. Технический сетап (пошагово)

### 3.1 Зависимости (devDependencies)

Минимальный набор:

- `jest`
- `jest-expo`
- `@testing-library/react-native`
- `react-test-renderer` (версия = React 19.1.0)
- `@types/jest`

Опционально (по мере необходимости):

- `jest-fetch-mock` (если нужен удобный fetch)
- `@testing-library/react-native/extend-expect` (без установки jest-native)

### 3.2 jest.config.ts (минимальный)

```ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.(ts|tsx)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapper: {
    '^@core/(.*)$': '<rootDir>/../core/$1',
    '^@ui/mobile/(.*)$': '<rootDir>/$1',
  },
  clearMocks: true,
}

export default config
```

### 3.3 setupTests.ts

```ts
import '@testing-library/react-native/extend-expect'
import 'react-native-gesture-handler/jestSetup'
import { cleanup } from '@testing-library/react-native'

afterEach(cleanup)

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }))
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock')
)

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}))

global.fetch = jest.fn()
```

### 3.4 Пример render helper

```tsx
// tests/utils/renderWithProviders.tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { SupabaseProvider, ThemeProvider } from '@ui/mobile/providers'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <SafeAreaProvider>
      <ThemeProvider>
        <SupabaseProvider>
          <QueryClientProvider client={queryClient}>
            {ui}
          </QueryClientProvider>
        </SupabaseProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
```

### 3.5 Примеры тестов

**Unit (core/utils)**:

```ts
import { buildTsQuery } from '@core/utils/search'

describe('buildTsQuery', () => {
  it('returns null for empty input', () => {
    expect(buildTsQuery('')).toBeNull()
  })
})
```

**Component**:

```tsx
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '@ui/mobile/components/Button'

describe('Button', () => {
  it('calls onPress', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button onPress={onPress}>Save</Button>)

    fireEvent.press(getByText('Save'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

**Integration (screen)**:

```tsx
import { screen, fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../utils/renderWithProviders'
import NotesScreen from '@ui/mobile/app/(tabs)/index'

describe('NotesScreen', () => {
  it('renders empty state', () => {
    renderWithProviders(<NotesScreen />)
    expect(screen.getByText('No notes yet')).toBeTruthy()
  })
})
```

### 3.6 Запуск локально и (потом) CI

Локально:

- `npx jest`
- `npx jest --watch`
- `npx jest --coverage`

Позже (GitHub Actions free plan):

- Один workflow `test-mobile.yml` с `npm ci` → `npm test`.
- Без кешей и сложных артефактов на первом шаге.

## 4. Правила качества тестов

### 4.1 Принципы

- Тест проверяет поведение, а не реализацию.
- Один тест — один сценарий.
- Никаких snapshot-тестов.
- Читаемость важнее экономии строк.

### 4.2 Чеклист для code review

- Есть ли четкая цель теста?
- Используются ли стабильные селекторы?
- Нет ли реальной сети/таймеров/Storage?
- Тест воспроизводим при повторных запусках?
- Моки минимальны и локальны?

### 4.3 Когда переписывать тест, а не чинить

- Он флейкает из-за асинхронности/таймеров.
- Требует сложных стабилизаций ради одного assert’а.
- Проверяет внутренние детали реализации.
- Любое изменение UI ломает тест без изменения поведения.

## 5. Роадмап внедрения

### Этап 1 — инфраструктура

- Добавить зависимости и базовый Jest config.
- Создать `tests/` с utils/fixtures/mocks/builders.
- Сделать `renderWithProviders`.

### Этап 2 — первые экраны / critical flows

- Unit для core/services (offline/search).
- Component для ключевых UI (Buttons, Inputs).
- Integration для Notes list и Search.

### Этап 3 — стабилизация и масштабирование

- Выравнивание coverage по critical core.
- Удаление флейков, устранение дублирующих моков.
- Подготовка к CI (GitHub Actions).

## 6. Процесс генерации тестов

- Для unit и integration использовать `/writing-test` с целью 100% покрытия.
- После каждого набора тестов фиксировать coverage и пробелы в `docs/ai/testing/`.

## Coverage backlog (initial list)

Priority P0 (tags + notes):
- [x] Components: `TagChip`, `TagList`
- [x] Components: `NoteCard`
- [ ] Screens: `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx`, `app/note/[id].tsx`
- [ ] Hooks: `useNotes`, `useSearch`
- [ ] Mobile services: `services/database.ts`, `services/searchHistory.ts`, `services/sync.ts`
- [ ] Core: `@core/services/notes`, `@core/services/search`, `@core/utils/search`

Priority P1 (auth + settings + theme):
- [ ] Screens: `app/(auth)/login.tsx`, `app/(auth)/callback.tsx`, `app/(tabs)/settings.tsx`
- [ ] Providers: `ThemeProvider`, `SupabaseProvider`
- [ ] Adapters: `adapters/config.ts`, `adapters/oauth.ts`, `adapters/storage.ts`

Priority P2 (editor + infra):
- [ ] Components: `EditorToolbar`, `EditorWebView`
- [ ] Adapters: `adapters/offlineStorage.ts`, `adapters/networkStatus.ts`, `adapters/supabaseClient.ts`
- [ ] Lib: `lib/theme.ts`
