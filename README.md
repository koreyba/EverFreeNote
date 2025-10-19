# 🌿 EverFreeNote

[![Build](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/build.yml)
[![Component Tests](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/component-tests.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/component-tests.yml)
[![E2E Tests](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/e2e.yml/badge.svg)](https://github.com/YOUR_USERNAME/EverFreeNote/actions/workflows/e2e.yml)

> Modern note-taking application built with Next.js and Supabase

**Simple. Secure. Synced.**

---

## 📚 Documentation

- **[⚡ Quick Start](QUICKSTART.md)** — Get started in 3 commands
- **[✅ GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)** — CI/CD is ready! Learn how to use it
- **[🧪 Testing Guide](docs/run_test.md)** — Complete guide for running tests locally and in CI
- **[🎯 Testing Strategy](.github/TESTING_STRATEGY.md)** — When to run which tests
- **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** ⭐ — Required reading for developers
- **[🚀 Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** — How to deploy to Cloudflare Pages
- **[⚙️ Cloudflare Environment Setup](CLOUDFLARE_ENV_SETUP.md)** — Fix production environment variables
- **[🔐 Google OAuth Setup](GOOGLE_OAUTH_SETUP.md)** — Configure Google authentication
- **[⚙️ GitHub Actions Details](/.github/workflows/README.md)** — Technical CI/CD documentation
- **[🗺️ Roadmap](./docs/roadmap.md)** — Product vision and feature roadmap

---

## 🚀 Quick Start

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

Open [http://localhost:3000](http://localhost:3000)

**Supabase Studio**: [http://localhost:54323](http://localhost:54323)

### Test Users
- `skip-auth@example.com` / `testpassword123`
- `test@example.com` / `testpassword123`

### Stop Services
```bash
npm run db:stop
```

See [docs/run_test.md](./docs/run_test.md) for detailed setup and testing instructions.

---

## 🏗️ Architecture

**Type:** Single Page Application (SPA)

**Stack:**
- Next.js 14 (Static Export)
- React 18
- Supabase (BaaS)
- Tailwind CSS + shadcn/ui
- Cloudflare Pages

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed information.

---

## 📦 Build & Deploy

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

## ✨ Features

- ✅ Google OAuth Authentication
- ✅ Create, Edit, Delete Notes
- ✅ Tags System with Interactive Tags
- ✅ Real-time Search
- ✅ Tag-based Filtering
- ✅ Responsive Design
- ✅ Secure Row-Level Security

---

## 🔐 Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📝 License

MIT

---

## 🤝 Contributing

Before adding new features, please read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) to understand the architectural principles.

