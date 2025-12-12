# Аудит разделения Core/UI

*Дата аудита: 2025-12-12*

## Статус: ✅ ЗАВЕРШЕНО

Архитектура core/ui полностью разделена. Core не имеет зависимостей от UI и готов к использованию на мобильных платформах.

---

## 1. Структура Core

```
core/
├── index.ts                    # Реэкспорт всех модулей
├── adapters/
│   ├── config.ts               # ConfigAdapter interface
│   ├── navigation.ts           # NavigationAdapter interface
│   ├── oauth.ts                # OAuthAdapter interface
│   ├── storage.ts              # StorageAdapter interface
│   └── supabaseClient.ts       # SupabaseClient factory interface
├── services/
│   ├── auth.ts                 # AuthService
│   ├── ftsPagination.ts        # FTS pagination helpers ← NEW
│   ├── notes.ts                # NoteService
│   ├── sanitizer.ts            # SanitizationService
│   ├── search.ts               # SearchService (FTS)
│   └── selection.ts            # Selection helpers ← NEW
└── utils/
    └── search.ts               # buildSearchQuery utility
```

### Зависимости Core

| Модуль | Зависимости | Статус |
|--------|-------------|--------|
| `services/auth.ts` | `@supabase/supabase-js` | ✅ |
| `services/notes.ts` | `@supabase/supabase-js`, `@/supabase/types` | ✅ |
| `services/search.ts` | `@supabase/supabase-js`, `@/supabase/types` | ✅ |
| `services/sanitizer.ts` | `isomorphic-dompurify` | ✅ |
| `services/ftsPagination.ts` | — (чистые функции) | ✅ |
| `services/selection.ts` | — (чистые функции) | ✅ |
| `adapters/*` | TypeScript interfaces | ✅ |
| `utils/search.ts` | `@/supabase/types` | ✅ |

**Вывод: Zero React/UI dependencies. ✅**

---

## 2. Структура UI

```
ui/
├── web/
│   ├── adapters/
│   │   ├── browser.ts          # BrowserAdapter (alert, confirm, etc.)
│   │   ├── navigation.ts       # Next.js router adapter
│   │   ├── oauth.ts            # Web OAuth adapter
│   │   ├── storage.ts          # localStorage adapter
│   │   └── supabaseClient.ts   # Browser Supabase client
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   ├── useInfiniteScroll.ts
│   │   ├── useNoteAppController.ts  # Main controller
│   │   ├── useNotesMutations.ts
│   │   └── useNotesQuery.ts
│   ├── config.ts
│   └── featureFlags.ts
└── mobile/
    ├── adapters/               # Заглушки для будущей реализации
    │   ├── navigation.ts
    │   ├── oauth.ts
    │   ├── storage.ts
    │   └── supabaseClient.ts
    └── config.ts
```

---

## 3. Структура Lib

```
lib/
├── constants/
│   └── typography.ts           # UI константы
├── enex/                       # ENEX import/export (feature-specific)
│   ├── converter.ts
│   ├── date-formatter.ts
│   ├── enex-builder.ts
│   ├── export-service.ts       # Использует @core/services/notes ✅
│   ├── export-types.ts
│   ├── image-downloader.ts
│   ├── image-processor.ts
│   ├── note-creator.ts
│   ├── parser.ts
│   └── types.ts
├── providers/
│   └── SupabaseProvider.tsx    # React-specific
├── supabase/
│   └── client.ts               # Web Supabase client init
├── utils/
│   └── normalize-html.ts
└── utils.ts                    # cn() для Tailwind
```

**Дубликаты: НЕТ ✅**
- `lib/services/` — удалена
- `lib/adapters/` — удалена

---

## 4. Бизнес-логика в useNoteAppController

### Вынесено в Core ✅

| Логика | Core модуль | Использование |
|--------|-------------|---------------|
| FTS hasMore | `ftsPagination.ts` | `computeFtsHasMore(...)` |
| FTS total | `ftsPagination.ts` | `computeFtsTotal(...)` |
| Toggle selection | `selection.ts` | `toggleSelection(ids, noteId)` |
| Select all | `selection.ts` | `selectAll(ids)` |
| Clear selection | `selection.ts` | `clearSelection()` |
| Auth operations | `auth.ts` | `AuthService` |

### Осталось в UI (корректно)

| Логика | Причина |
|--------|---------|
| Удаление аккаунта | Использует `fetch()`, env-переменные — web-specific |
| Накопление FTS результатов | React useEffect + useState |
| Bulk delete | Использует mutations + toasts — UI-specific |

---

## 5. Импорты

### Проверка на старые пути

```
@/lib/services/* → НЕТ совпадений ✅
@/lib/adapters/* → НЕТ совпадений ✅
```

### Текущие импорты в useNoteAppController

```typescript
// Core services
import { AuthService } from '@core/services/auth'
import { computeFtsHasMore, computeFtsTotal } from '@core/services/ftsPagination'
import { clearSelection, selectAll, toggleSelection } from '@core/services/selection'

// UI adapters
import { webStorageAdapter } from '@ui/web/adapters/storage'
import { webOAuthRedirectUri } from '@ui/web/config'
import { featureFlags } from '@ui/web/featureFlags'
```

---

## 6. Итоги

### ✅ Выполнено

| Задача | Статус |
|--------|--------|
| Удалить дубликаты lib/services | ✅ |
| Удалить дубликаты lib/adapters | ✅ |
| Перенести sanitizer в core | ✅ |
| Добавить getNotesByIds в core | ✅ |
| Вынести FTS pagination в core | ✅ |
| Вынести selection logic в core | ✅ |
| Обновить все импорты | ✅ |
| Обновить core/index.ts | ✅ |

### 📊 Метрики

- **Core модули:** 11 файлов
- **UI зависимости в Core:** 0
- **Дубликаты lib↔core:** 0
- **Старые импорты @/lib/services:** 0
- **Старые импорты @/lib/adapters:** 0

### 🎯 Готовность к мобильной разработке

**Core полностью готов.** Для мобильной версии нужно:

1. Реализовать адаптеры в `ui/mobile/adapters/`:
   - `storage.ts` — AsyncStorage/SecureStorage
   - `navigation.ts` — React Navigation
   - `oauth.ts` — Mobile OAuth flow
   - `supabaseClient.ts` — Mobile Supabase client

2. Создать мобильные хуки в `ui/mobile/hooks/`:
   - Аналог `useNoteAppController` с мобильной спецификой

---

*Аудит завершён: 2025-12-12*
