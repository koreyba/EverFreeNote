# EverFreeNote

[![Build](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/build.yml)
[![Component Tests](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/component-tests.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/component-tests.yml)
[![E2E Tests](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/e2e.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/e2e.yml)

> Modern note-taking application built with Next.js and Supabase

**Simple. Secure. Synced.**

---

## Documentation

- **[Development Setup](docs/DEVELOPMENT_SETUP.md)** — local environment and tooling
- **[GitHub Actions Pipelines](docs/GITHUB_ACTIONS_PIPELINES.md)** — CI/CD pipelines and running with Act
- **[GitHub MCP Server Setup](docs/GITHUB_MCP_SETUP.md)** — connect Cursor to GitHub via MCP
- **[Testing Guide](docs/run_test.md)** — how to run tests locally and in CI
- **[Architecture Guide](docs/ARCHITECTURE.md)** — required reading before contributing
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** — deploy to Cloudflare Pages
- **[Cloudflare Environment Setup](CLOUDFLARE_ENV_SETUP.md)** — production environment variables
- **[Google OAuth Setup](docs/GOOGLE_OAUTH_SETUP.md)** — configure Google authentication
- **[Roadmap](docs/roadmap.md)** — product vision and feature plan

---

## Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop (for local development)
- Supabase account (for production)

### Local Development

```bash
# Install dependencies
npm install

# Start local Supabase stack (PostgreSQL + Auth + API + Studio)
npm run db:start

# Configure environment (use default local keys)
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open http://localhost:3000

**Supabase Studio**: http://localhost:54323

### Test Users
- `skip-auth@example.com` / `testpassword123`
- `test@example.com` / `testpassword123`

### Stop Services
```bash
npm run db:stop
```

See `docs/run_test.md` for detailed setup and testing instructions.

---

## Architecture

**Type:** Single Page Application (SPA)  
**Stack:** Next.js (static export), React 19, Supabase, Tailwind CSS + shadcn/ui, Cloudflare Pages hosting  
**Key constraints:** no SSR/server actions/API routes; all Supabase access from the client through a shared provider and service layer.

See `docs/ARCHITECTURE.md` for detailed information.

---

## Build & Deploy

```bash
# Build static export
npm run build

# Output directory: out/
```

Deploy the `out/` folder to:
- Cloudflare Pages
- Vercel
- Netlify
- Any static hosting

---

## Features

- Google OAuth authentication
- Create, edit, delete notes
- Tags with interactive chips
- Full-text search with FTS → ILIKE fallback
- Tag-based filtering
- Responsive design
- Secure row-level security (Supabase)
- Evernote ENEX import with HTML sanitization

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## License

MIT

---

## Contributing

Before adding new features, please read `docs/ARCHITECTURE.md` to understand the architectural principles.
