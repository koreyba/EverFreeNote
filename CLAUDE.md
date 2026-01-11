# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Start local Supabase stack (PostgreSQL + Auth + Storage + Studio)
npm run db:start

# Start development server
npm run dev
# Open http://localhost:3000

# Stop Supabase
npm run db:stop
```

### Build & Validation
```bash
# Type check (no emit)
npm run type-check

# Lint with ESLint
npm run eslint

# Type check + lint
npm run validate

# Build static export
npm run build
# Output directory: out/
```

### Testing
```bash
# Component tests (Cypress) for Web
npm run test:component              # Run all
npm run test:component:watch        # Interactive mode
npm run test:component:coverage     # With coverage

# Tests for mobile app
cd ui/mobile
npm run test

```

### Test Users
```bash
# Default test credentials (created automatically by seed.sql)
# Email: test@example.com / Password: testpassword123
# Email: skip-auth@example.com / Password: testpassword123

# Manually initialize test users
npm run db:init-users
```

---

## Architecture Overview

**Type:** Single Page Application (SPA)
**Stack:** Next.js (static export), React 19, Supabase, TypeScript, Tailwind CSS + shadcn/ui
**Hosting:** Cloudflare Pages
**Key constraint:** No SSR, no server actions, no API routes (except minimal proxy endpoints)

### Core Architectural Principles

1. **Static SPA Only**
   - All Supabase access happens from the client through a shared provider and service layer
   - Next.js is used in static export mode (`next build` produces `out/` folder)
   - No server-side rendering or API routes (except minimal proxies for CORS)

2. **Service Layer Pattern**
   - All business logic lives in `core/services/` (framework-agnostic)
   - Services are platform-independent and can be shared between web and mobile
   - Services use dependency injection (SupabaseClient passed to constructor)

3. **Adapter Pattern for Platform Abstraction**
   - `core/adapters/` define interfaces (SupabaseClientFactory, StorageAdapter, etc.)
   - `ui/web/adapters/` and `ui/mobile/adapters/` provide platform-specific implementations
   - Enables code sharing between web and React Native mobile app

4. **Hooks as State Orchestrators**
   - Complex state management via composition of smaller hooks
   - `useNoteAppController()` is the main orchestrator that composes 10+ sub-hooks
   - Hooks manage concerns: search, sync, mutations, selection, offline state

5. **Offline-First Architecture**
   - IndexedDB cache for notes (with localStorage fallback)
   - Mutation queue for pending operations
   - Sync manager coordinates background sync when online
   - Optimistic updates for immediate UI feedback

### Directory Structure

```
app/                          # Next.js app directory (pages, layout, routes)
├── api/                      # Minimal proxy endpoints (CORS workarounds)
├── auth/                     # Auth callback handling
└── editor-webview/           # Mobile webview integration

core/                         # Shared business logic (framework-agnostic)
├── adapters/                 # Platform abstraction interfaces
│   ├── supabaseClient.ts     # Client factory pattern
│   ├── storage.ts            # Storage adapter interface
│   └── navigation.ts         # Navigation adapter
├── services/                 # Domain services
│   ├── notes.ts              # Note CRUD operations
│   ├── auth.ts               # Authentication service
│   ├── search.ts             # Full-text search with FTS → ILIKE fallback
│   ├── sanitizer.ts          # HTML sanitization (DOMPurify)
│   ├── offlineCache.ts       # Offline cache interface
│   ├── offlineQueue.ts       # Mutation queue
│   ├── offlineSyncManager.ts # Sync orchestration
│   └── smartPaste.ts         # Smart paste feature
├── types/                    # Type definitions
│   ├── domain.ts             # Note, NoteViewModel, etc.
│   └── offline.ts            # Offline sync types
├── utils/                    # Helper functions
│   ├── search.ts             # FTS query builders
│   ├── overlay.ts            # Merge offline data with server data
│   └── compactQueue.ts       # Queue deduplication
└── enex/                     # Evernote ENEX import logic

ui/                           # Presentation layers
├── web/                      # Next.js web UI
│   ├── components/
│   │   ├── features/         # Feature-specific components
│   │   │   ├── notes/        # NoteEditor, NoteList, NoteCard, Sidebar
│   │   │   ├── auth/         # AuthForm
│   │   │   └── account/      # Settings
│   │   ├── providers/        # React Context providers
│   │   └── ui/               # UI primitives (shadcn/ui components)
│   ├── hooks/                # Custom React hooks
│   │   ├── useNoteAppController.ts  # Main orchestrator (composes all hooks)
│   │   ├── useNotesQuery.ts         # React Query integration
│   │   ├── useNotesMutations.ts     # Create/update/delete operations
│   │   ├── useNoteSync.ts           # Offline sync
│   │   ├── useNoteSearch.ts         # Search & FTS
│   │   └── useNoteSelection.ts      # Selection state
│   ├── adapters/             # Web-specific implementations
│   │   ├── supabaseClient.ts # Browser Supabase client
│   │   ├── offlineStorage.ts # IndexedDB + localStorage
│   │   └── networkStatus.ts  # Online/offline detection
│   └── providers/
│       └── SupabaseProvider.tsx  # Auth state + Supabase client
└── mobile/                   # React Native mobile app

supabase/                     # Database & backend
├── migrations/               # Schema migrations (versioned)
├── functions/                # Edge functions
├── types.ts                  # Generated DB types
├── seed.sql                  # Test users + sample data
└── config.toml               # Supabase configuration
```

### Data Flow

**Online:**
```
User Input → Component → useNoteAppController/useNotesMutations
  → NoteService → Supabase API → Database
  → React Query cache update → Component re-render
```

**Offline:**
```
User Input → Detect isOffline → Save to offlineCache (IndexedDB)
  → Enqueue in offlineQueue → Update local overlay state
  → Show "pending" badge → [Network restored]
  → offlineSyncManager drains queue → Server mutations
  → Cache invalidated → Refetch
```

### State Management

| Layer | State Type | Tool | Purpose |
|-------|-----------|------|---------|
| **Global** | Auth, Theme | React Context | User session, UI theme |
| **Server** | Notes, Search | React Query | Server state cache, sync, refetch |
| **Local** | UI, Selection | useState | Component interactions |
| **Offline** | Mutations, Cache | IndexedDB + Queue | Work while offline |

### Supabase Integration

1. **Client Factory** (`core/adapters/supabaseClient.ts`):
   - Defines `SupabaseClientFactory` interface
   - Implemented by `webSupabaseClientFactory` (browser)

2. **Provider Setup** (`ui/web/providers/SupabaseProvider.tsx`):
   - React Context wrapping entire app
   - Manages auth state (user, loading)
   - Subscribes to auth state changes

3. **Root Layout** (`app/layout.tsx`):
   ```
   SupabaseProvider (auth context)
   └─ QueryProvider (React Query)
      └─ ThemeProvider
         └─ App Content
   ```

4. **Database Types** (`supabase/types.ts`):
   - Auto-generated from schema
   - Used throughout application for type safety

---

## Key Patterns & Best Practices

### Database Migrations

When creating database migrations, ensure they are **safe and idempotent**:
- Use `IF NOT EXISTS` checks
- Follow expand-migrate-contract pattern:
  1. Add new columns/tables (expand)
  2. Migrate data (migrate)
  3. Remove old schema (contract)
- Avoid blocking operations
- Ensure migrations can be rolled back if needed
- Test migrations with `npm run perf:test`

### Service Layer

All business logic must go in `core/services/`:
- Framework-agnostic (no React imports)
- Use dependency injection (pass SupabaseClient to constructor)
- Return typed results
- Handle errors gracefully

Example:
```typescript
class NoteService {
  constructor(private supabase: SupabaseClient) {}

  async getNoteById(id: string): Promise<Note | null> {
    const { data, error } = await this.supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}
```

### Hooks as Orchestrators

- Hooks should compose smaller hooks, not be utility functions
- `useNoteAppController()` is the main orchestrator (~650 lines)
- Each hook manages a specific concern (search, sync, mutations, selection)
- Components receive simple props from the controller

### Offline-First Features

When implementing features that modify data:
1. Check if user is online (`useNetworkStatus()`)
2. If offline: save to `offlineCache`, enqueue mutation in `offlineQueue`
3. If online: call service directly
4. Always use optimistic updates for immediate feedback
5. Handle sync conflicts gracefully

### Search Implementation

The app uses **PostgreSQL full-text search with ILIKE fallback**:
- `core/services/search.ts`: SearchService calls `search_notes_fts()` function
- If FTS returns no results, falls back to ILIKE pattern matching
- Supports Russian and English text
- Query builders in `core/utils/search.ts`

### Component Structure

- Use feature-based organization (`components/features/notes/`, `components/features/auth/`)
- UI primitives from shadcn/ui go in `components/ui/`
- Keep components small and focused
- Extract complex logic to hooks

### Testing

- Component tests use Cypress Component Testing
- E2E tests use Cypress
- Test users are automatically created by `seed.sql`
- Use `test@example.com` / `testpassword123` for persistent testing
- Use `skip-auth@example.com` / `testpassword123` for quick testing with sample data

---

## Common Development Tasks

### Creating a Database Migration

```bash
# Create migration file
npx supabase migration new add_feature_x

# Edit the migration in supabase/migrations/

# Apply locally
npm run db:migrate

# Or reset database (drops all data)
npm run db:reset

# Regenerate types
npx supabase gen types typescript --local > supabase/types.ts
```

### Updating shadcn/ui Components

```bash
# Add a new component
npx shadcn@latest add button

# Update existing components
npx shadcn@latest add --overwrite button
```

---

## Important Notes

- **Never use server-side features**: No SSR, no server actions, no API routes (Next.js is only used for static export)
- **All Supabase calls from client**: Use `SupabaseProvider` and service layer
- **Offline-first mindset**: Always consider offline scenarios when implementing features
- **Type safety**: Regenerate `supabase/types.ts` after schema changes
- **Migration safety**: Migrations must be idempotent and safe to run multiple times

---

## Documentation

- [README.md](README.md) — Project overview and quick start
- [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md) — Local environment setup
- [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) — Quick commands and troubleshooting
- [docs/GITHUB_ACTIONS_PIPELINES.md](docs/GITHUB_ACTIONS_PIPELINES.md) — CI/CD pipelines
- [docs/roadmap.md](docs/roadmap.md) — Product vision and features
- [ui/mobile/README.md](ui/mobile/README.md) — React Native mobile app
