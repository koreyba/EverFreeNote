# 🧪 Testing Strategy

## 📊 Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EverFreeNote Testing                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              │                                 │
                    ┌─────────▼─────────┐          ┌──────────▼──────────┐
                    │  Component Tests  │          │     E2E Tests       │
                    │   (Automatic)     │          │     (Manual)        │
                    └───────────────────┘          └─────────────────────┘
                              │                                 │
                    ┌─────────▼─────────┐          ┌──────────▼──────────┐
                    │ • 60 tests        │          │ • 7 tests           │
                    │ • ~2-3 min        │          │ • ~3-4 min          │
                    │ • UI components   │          │ • Full user flows   │
                    │ • Every push      │          │ • On demand         │
                    └───────────────────┘          └─────────────────────┘
```

## 🎯 Testing Pyramid

```
        ┌──────────────┐
        │  E2E Tests   │  ← 7 tests (Manual)
        │   (Slow)     │
        ├──────────────┤
        │  Component   │  ← 60 tests (Automatic)
        │    Tests     │
        │   (Fast)     │
        └──────────────┘
```

## 🔄 Workflows

### Component Tests (`test.yml`)

**Trigger:** Automatic
- ✅ Push to any branch
- ✅ Pull Request to any branch

**Purpose:**
- Catch UI bugs early
- Fast feedback loop
- No manual intervention needed

**What's tested:**
- Button, Input, Card components
- RichTextEditor functionality
- Badge, InteractiveTag
- AuthForm UI

### E2E Tests (`e2e.yml`)

**Trigger:** Manual only
- ✅ GitHub UI: Actions → E2E Tests (Manual) → Run workflow
- ✅ GitHub CLI: `gh workflow run e2e.yml`

**Purpose:**
- Verify critical user flows
- Test full stack integration
- Pre-release validation

**What's tested:**
- Authentication flow
- Note CRUD operations
- Search functionality
- Edge cases (empty notes, long titles, special chars)

## 📋 Decision Matrix

### When to run Component Tests?
**Always automatic** - no decision needed!

### When to run E2E Tests?

| Scenario | Run E2E? | Why |
|----------|----------|-----|
| Documentation update | ❌ | No code changes |
| CSS/styling tweaks | ❌ | Component tests sufficient |
| New UI component | ❌ | Component tests cover it |
| Auth logic change | ✅ | Critical flow affected |
| Database schema change | ✅ | Full stack integration |
| Before merging to `main` | ✅ | Pre-release validation |
| API endpoint change | ✅ | Integration testing needed |
| Bug fix in CRUD | ✅ | Verify fix works end-to-end |

## 🚀 Quick Commands

### Local Testing
```bash
# Component tests
npm run test:component

# E2E tests
npm run test:e2e

# All tests
npm run test:all
```

### CI Testing
```bash
# Component tests (automatic)
git push  # Triggers automatically

# E2E tests (manual)
gh workflow run e2e.yml
gh workflow run e2e.yml --ref feature/my-branch
```

## 📈 Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| **Component Tests** | 60 | UI components |
| **E2E Tests** | 7 | User flows |
| **Total** | 67 | Full stack |

### Component Test Breakdown
- AuthForm: 7 tests
- Badge: 4 tests
- Button: 8 tests
- Card: 9 tests
- Input: 8 tests
- InteractiveTag: 8 tests
- RichTextEditor: 16 tests

### E2E Test Breakdown
- Authentication: 1 test
- Note creation/editing: 1 test
- Search functionality: 1 test
- Empty note handling: 1 test
- Long title handling: 1 test
- Special characters: 1 test
- Line breaks: 1 test

## 🎓 Best Practices

### For Developers

1. **Write component tests first**
   - Fast to run
   - Easy to debug
   - Catch bugs early

2. **Add E2E tests for critical flows**
   - Authentication
   - Data persistence
   - User journeys

3. **Run tests locally before push**
   ```bash
   npm run test:component  # Quick check
   npm run test:e2e        # Full check (optional)
   ```

4. **Use E2E tests in CI strategically**
   - Before merging PR
   - After significant changes
   - Pre-release validation

### For Reviewers

1. **Check component test results automatically**
   - GitHub shows status on PR

2. **Request E2E run for critical changes**
   - Auth modifications
   - Database changes
   - API updates

3. **Review test artifacts on failure**
   - Screenshots show what broke
   - Videos show user flow

## 🔧 Troubleshooting

### Component tests failing locally?
```bash
npm run db:start
npm run dev
npm run test:component
```

### E2E tests failing locally?
```bash
# 1. Check Supabase
npm run db:status

# 2. Check Next.js
curl http://localhost:3000

# 3. Reset and retry
npm run db:reset
npm run dev
npm run test:e2e
```

### E2E tests failing in CI?
1. Download artifacts (screenshots/videos)
2. Check logs for error messages
3. Reproduce locally
4. Fix and re-run workflow

## 📚 Related Documentation

- [Testing Guide](../docs/run_test.md) - Complete testing documentation
- [GitHub Actions README](.github/workflows/README.md) - CI/CD details
- [Quick Start](../QUICKSTART.md) - Get started quickly

---

**Questions?** Open an issue or check the docs! 🚀

