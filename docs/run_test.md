# 🧪 Running Tests with Supabase CLI

## 1. Setting Up Local Environment

### Prerequisites
- **Docker Desktop** installed and running
- **Node.js** 18+ and **npm** installed
- **PowerShell** (for Windows) or **Bash** (for Linux/Mac)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Supabase Local Stack
```bash
npm run db:start
```

This command will:
- Start **PostgreSQL** database on port 54322
- Start **Supabase Studio** (database UI) on port 54323
- Start **GoTrue** (Auth service) on port 54321
- Start **PostgREST** (API) on port 54321
- Start **Realtime** service
- Start **Storage** service
- Start **Inbucket** (email testing) on port 54324
- **Automatically run migrations** (create tables, RLS policies)
- **Automatically seed test data** (test users + sample notes)
- Display connection information and API keys

**First run takes 2-5 minutes** as Docker images are downloaded.

### Step 3: Get API Keys
```bash
npm run db:status
```

This will display:
- API URL: `http://127.0.0.1:54321`
- Anon key (public key for client-side)
- Service role key (admin key for server-side)
- Database URL
- Studio URL: `http://localhost:54323`

### Step 4: Configure Environment Variables
Create `.env.local` file in the project root:

```bash
# Copy from example
cp .env.local.example .env.local
```

The default keys in `.env.local.example` work for local development:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=REDACTED_JWT
SUPABASE_SERVICE_ROLE_KEY=REDACTED_JWT
```

### Step 5: Start the Application
```bash
npm run dev
```

Application will be available at: http://localhost:3000

### Step 6: Verify Setup
- **Supabase Studio**: http://localhost:54323
- **Application**: http://localhost:3000
- **Email Testing**: http://localhost:54324
- **Database**: localhost:54322 (PostgreSQL)
- **API**: http://127.0.0.1:54321

### Step 7: Explore Supabase Studio
1. Open http://localhost:54323 in your browser
2. Navigate to **Table Editor** to see:
   - `users` table with test users
   - `notes` table with sample notes
3. Navigate to **Authentication** to see:
   - `test@example.com`
   - `skip-auth@example.com`
4. Navigate to **Database** → **Policies** to see RLS policies
5. Navigate to **SQL Editor** to run custom queries

### Database Schema
The local database automatically creates the following structure:

**Tables:**
- `users` - User accounts
  - `id` (UUID) - Primary key
  - `email` (TEXT) - Unique email address
  - `created_at` (TIMESTAMP) - Account creation time

- `notes` - User notes
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - Foreign key to users
  - `title` (TEXT) - Note title (default: 'Untitled')
  - `description` (TEXT) - Note content (HTML)
  - `tags` (TEXT[]) - Array of tags
  - `created_at` (TIMESTAMP) - Note creation time
  - `updated_at` (TIMESTAMP) - Last modification time

**Indexes:**
- `notes_user_id_idx` - For filtering notes by user
- `notes_updated_at_idx` - For sorting notes by update time

**RLS Policies:**
- Users can only view/edit/delete their own notes
- Users can only view their own user record

**Test Users:**
- `test@example.com` / `testpassword123`
- `skip-auth@example.com` / `testpassword123`

**Test Data:**
- 5 sample notes for `skip-auth@example.com`
- 1 sample note for `test@example.com`

---

## 2. Running Tests

### Prerequisites
- Local environment is set up (see section 1)
- Supabase is running (`npm run db:start`)
- Application is running on http://localhost:3000

### Component Tests
```bash
# Run all component tests (headless)
npm run test:component

# Run component tests in interactive mode
npx cypress open --component
```

Component tests verify:
- Individual UI components (Button, Input, Card, etc.)
- Component props and interactions
- Component rendering

### E2E Tests
```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests in interactive mode
npx cypress open --e2e
```

E2E tests verify:
- Authentication flow (skip-auth login)
- Note creation, editing, deletion
- Search and filtering
- Tag management
- Rich text editor functionality

### All Tests
```bash
# Run component and E2E tests sequentially
npm run test:all
```

### Test Configuration
- **Base URL**: http://localhost:3000
- **Database**: Uses local Supabase instance
- **Auth**: Uses test users from seed data
- **Isolation**: Each test suite uses the same seeded data
- **Browser**: Electron (headless by default)

### Test Coverage
- **Component Tests** (7 files):
  - AuthForm, Badge, Button, Card, Input
  - InteractiveTag, RichTextEditor
- **E2E Tests** (2 files):
  - `auth-and-notes.cy.js` - Full user workflows
  - `basic-notes.cy.js` - Basic note operations

---

## 3. Database Management

### Reset Database
```bash
# Reset database to initial state (re-run migrations + seeds)
npm run db:reset
```

This will:
- Drop all tables
- Re-run all migrations
- Re-seed test data

### Stop Supabase
```bash
# Stop all Supabase services
npm run db:stop
```

### View Status
```bash
# Check if Supabase is running and get connection info
npm run db:status
```

### Open Studio
```bash
# Open Supabase Studio in browser
npm run db:studio
```

---

## 4. Troubleshooting

### Database Connection Issues
```bash
# Check if Supabase is running
npm run db:status

# If not running, start it
npm run db:start

# If issues persist, reset everything
npm run db:stop
npm run db:start
```

### Port Conflicts
If you get port conflict errors:

1. Check what's using the ports:
```bash
# Windows
netstat -ano | findstr :54321
netstat -ano | findstr :54322
netstat -ano | findstr :54323

# Linux/Mac
lsof -i :54321
lsof -i :54322
lsof -i :54323
```

2. Stop conflicting services or change ports in `supabase/config.toml`

### Test Failures
```bash
# Reset database and try again
npm run db:reset

# Run tests with debug output
DEBUG=cypress:* npm run test:e2e

# Check Cypress screenshots for visual debugging
# Located in: cypress/screenshots/
```

### Migration Errors
```bash
# View migration status
npx supabase migration list

# Repair migrations
npx supabase migration repair --status applied <version>

# Reset and re-apply
npm run db:reset
```

### Docker Issues
```bash
# Check Docker is running
docker ps

# Restart Docker Desktop
# Then restart Supabase
npm run db:stop
npm run db:start
```

### Environment Variable Issues
```bash
# Verify environment variables are loaded
# In PowerShell:
Get-Content .env.local

# In Bash:
cat .env.local

# Make sure .env.local exists and has correct values
# Compare with .env.local.example
```

### Supabase CLI Issues
```bash
# Check Supabase CLI version
npx supabase --version

# Update Supabase CLI
npm install supabase@latest --save-dev

# View Supabase logs
npx supabase logs
```

---

## 5. GitHub Actions Integration

The project uses 2 separate workflows:

### `test.yml` - Component Tests (Automatic)

**Triggers:**
- Push to **any** branch
- Pull Request to **any** branch

**What it does:**
- Runs 60 component tests
- Fast (~2-3 minutes)
- Catches UI bugs immediately

### `e2e.yml` - E2E Tests (Manual)

**Triggers:**
- Manual dispatch only (GitHub UI or CLI)
- Can select any branch

**What it does:**
- Runs 7 E2E tests
- Slower (~3-4 minutes)
- Tests full user flows (auth, CRUD, search)

### How to Run E2E Tests Manually

**Via GitHub UI:**
1. Go to **Actions** tab
2. Select **"E2E Tests (Manual)"** workflow
3. Click **"Run workflow"**
4. (Optional) Specify branch or leave empty for current
5. Click green **"Run workflow"** button

**Via GitHub CLI:**
```bash
# Current branch
gh workflow run e2e.yml

# Specific branch
gh workflow run e2e.yml --ref feature/my-branch
```

### Technical Details

**Supabase CLI Installation:**
- Uses official `supabase/setup-cli@v1` action
- Automatically installs latest version
- No need for `npm install -g supabase` (deprecated)

### CI Environment
- **Runner**: `ubuntu-latest`
- **Node**: `18`
- **Supabase**: Full local stack (same as local development)
- **Artifacts**: Screenshots and videos (on failure)

### Viewing Results
1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Click on the workflow run to see job details
4. Download artifacts (screenshots/videos) if tests failed

---

## 6. GitHub Actions Workflow Details

### Two Separate Workflows

```
Component Tests (test.yml)     E2E Tests (e2e.yml)
├─ Automatic on push           ├─ Manual trigger only
├─ Fast (~2-3 min)             ├─ Slower (~3-4 min)
├─ 60 tests                    ├─ 7 tests
└─ UI components               └─ Full user flows
```

**Why separate?**
- Component tests are fast → run automatically
- E2E tests are slow → run when needed

### When to Run E2E Tests

✅ **Run E2E when:**
- Before merging to `main`
- After auth changes
- After CRUD operation changes
- Before release

❌ **Don't run E2E:**
- On every commit (too slow)
- For documentation changes
- For minor UI tweaks

### Viewing Logs

1. GitHub → Actions → Select workflow run
2. Click on job name
3. Expand steps to view logs
4. Download artifacts if tests failed

### Artifacts on Failure

- **Component tests**: Screenshots only
- **E2E tests**: Screenshots + Videos
- **Retention**: 7 days
- **Download**: Actions → Run → Artifacts

---

## 7. Cleanup

### Stop Services
```bash
# Stop Supabase (containers keep running)
npm run db:stop
```

### Remove All Data
```bash
# Stop and remove all Docker volumes
npx supabase stop --no-backup

# Remove Supabase data directory
rm -rf supabase/.branches
rm -rf supabase/.temp
```

### Fresh Start
```bash
# Complete clean slate
npm run db:stop
npx supabase stop --no-backup
npm run db:start
```

---

## 7. Tips & Best Practices

### Development Workflow
1. Start Supabase once: `npm run db:start`
2. Keep it running during development
3. Reset only when needed: `npm run db:reset`
4. Stop when done: `npm run db:stop`

### Testing Workflow
1. Ensure Supabase is running
2. Run specific test files during development:
   ```bash
   npx cypress run --spec "cypress/e2e/auth-and-notes.cy.js"
   ```
3. Run full test suite before committing:
   ```bash
   npm run test:all
   ```

### Database Changes
1. Create new migration file:
   ```bash
   npx supabase migration new <migration_name>
   ```
2. Write SQL in the new file
3. Apply migration:
   ```bash
   npm run db:reset
   ```

### Debugging
- Use Supabase Studio to inspect data: http://localhost:54323
- Check email testing UI: http://localhost:54324
- View Supabase logs: `npx supabase logs`
- Use Cypress interactive mode for debugging tests

---

## 8. Quick Reference

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start Supabase local stack |
| `npm run db:stop` | Stop Supabase services |
| `npm run db:reset` | Reset database (re-run migrations + seeds) |
| `npm run db:status` | Show connection info and API keys |
| `npm run db:studio` | Open Supabase Studio |
| `npm run test:all` | Run all tests |
| `npm run test:e2e` | Run E2E tests only |
| `npm run test:component` | Run component tests only |

| URL | Service |
|-----|---------|
| http://localhost:3000 | Next.js Application |
| http://localhost:54323 | Supabase Studio |
| http://localhost:54324 | Email Testing (Inbucket) |
| http://127.0.0.1:54321 | Supabase API |
| localhost:54322 | PostgreSQL Database |

---

**Ready to test!** 🚀
