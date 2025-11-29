# EverFreeNote — Архитектурный обзор

> Обновлено: 29 ноября 2025  
> Тип приложения: Single Page Application (SPA, static export)

---

## 1. Высокоуровневая архитектура

**Клиент (SPA):**
- Next.js (App Router) с `output: 'export'` — только статические HTML/CSS/JS.
- React 19, Tailwind CSS, shadcn/ui.
- Весь доступ к Supabase происходит с клиента (никакого SSR/server actions/API Routes).

**BaaS (Supabase):**
- PostgreSQL + Row Level Security.
- Supabase Auth (OAuth).
- Supabase Storage (загрузка изображений ENEX).
- RPC-функции для полнотекстового поиска (FTS).

**Хостинг:**
- Cloudflare Pages (или любой статический хостинг).

```
Client (SPA) ──HTTPS──> Supabase (DB/Auth/Storage/RPC)
               |
               └─ Static hosting (Cloudflare Pages)
```

---

## 2. Ограничения SPA (static export)

- Нет SSR/server actions/API Routes, нет `getServerSideProps`.
- Только client components или явно помеченные `use client`.
- Supabase-запросы выполняются в браузере; кэширование/пагинация через React Query.
- Любые зависимости от `window/localStorage` идут через адаптер (`lib/adapters/browser.ts`) для совместимости с React Native/WebView.

---

## 3. Слой сервисов и контроллеров

**Паттерн:** UI → контроллеры/хуки → сервисы → адаптеры → Supabase.

- **UI компоненты (`components/`)** — без прямых вызовов Supabase.
- **Контроллеры/хуки (`hooks/`)** — собирают состояние, пагинацию, мутации, эффекты.
- **Сервисы (`lib/services/`)** — CRUD/поиск/санитизация (чистые функции поверх Supabase SDK).
- **Адаптеры (`lib/adapters/`)** — изолируют browser API (alert/prompt/localStorage/location).
- **Провайдеры (`lib/providers/`)** — единый Supabase клиент + контекст Auth.

Единый клиент Supabase создаётся в `lib/supabase/client.ts` и прокидывается через `SupabaseProvider`.

---

## 4. Данные и поиск

- **Notes CRUD:** `lib/services/notes.ts` — пагинация через `.range`, сортировка по `updated_at`.
- **Поиск:** `@core/services/search` — FTS (RPC) с fallback на ILIKE; общий компонент результатов в `NoteList`.
- **Санитизация:** HTML очищается через DOMPurify перед `dangerouslySetInnerHTML` и при импорте ENEX (`lib/services/sanitizer.ts`, `lib/enex/converter.ts`).
- **Пагинация:** Infinite Scroll + React Query `useInfiniteQuery` (`hooks/useNotesQuery.ts`).

---

## 5. Безопасность

- Row Level Security в Supabase (SELECT/INSERT/UPDATE/DELETE только для `auth.uid() = user_id`).
- Токены/Auth управляются Supabase SDK; кэш/тема/диалоги — через адаптеры без прямого `window`.
- HTML очищается перед выводом и при импорте (XSS защита).

Пример RLS:
```sql
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE USING (auth.uid() = user_id);
```

---

## 6. Структура проекта (сокращённо)

```
app/
  layout.tsx           # Глобальные провайдеры/темы
  page.tsx             # Вход в приложение (AuthShell / NotesShell)
components/
  features/notes/      # Sidebar, NoteList, NoteEditor, NoteView, NotesShell
  features/auth/       # AuthShell
  ui/                  # shadcn/ui обёртки
hooks/
  useNoteAppController.ts   # Состояние/handlers приложения заметок
  useNotesQuery.ts          # Пагинация + поиск
  useNotesMutations.ts      # CRUD мутации
lib/
  services/                # notes, search, sanitizer, auth
  adapters/                # browser API wrapper
  providers/               # SupabaseProvider
  supabase/                # client singleton, search helpers
  enex/                    # ENEX parser/converter/image upload
docs/
  ARCHITECTURE.md, DEPLOYMENT_GUIDE.md, roadmap.md, ...
```

---

## 7. Сборка и деплой

- `next.config.js` должен содержать `output: 'export'` и `images: { unoptimized: true }`.
- Команда сборки: `npm run build` → артефакт в `out/`.
- Деплой: загрузить `out/` на Cloudflare Pages (или любой статический хостинг).

---

## 8. Особые замечания

- Не использовать API Routes/SSR/server actions — только клиент.
- При добавлении функциональности: UI → хуки/контроллеры → сервисы → адаптеры.
- Для React Native/WebView:
  - использовать `browser` адаптер вместо прямых `window/localStorage/prompt`;
  - редактор: либо WebView, либо markdown/ограниченный HTML.
- Поиск: единый компонент результатов и единый сервис FTS/ILIKE.
- Импорт ENEX: проходит через sanitizer; изображения грузятся в Supabase Storage.

---

## 9. Риски и тестирование

- Убедиться в наличии Supabase env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Критичны тесты на поиск (FTS + fallback), санитизацию HTML и ENEX импорт.
- Для больших датасетов — использовать виртуализацию списка (`VirtualNoteList`) и крупные страницы пагинации (50).
