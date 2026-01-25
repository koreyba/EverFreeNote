# Development Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Supabase Local
```bash
npx supabase start
```

This will:
- Start PostgreSQL database
- Start Supabase Auth service
- Start Supabase Storage service
- Apply all migrations
- **Automatically create test users** via `supabase/seed.sql`

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Test Users

After running `npx supabase start`, two test users are automatically created:

### 1. Test User (Persistent)
- **Email:** `test@example.com`
- **Password:** `<test-password>`
- **Purpose:** For testing with persistent data
- **Button:** 🧪 Test Login (Persistent)

### 2. Skip Auth User (Quick Test)
- **Email:** `skip-auth@example.com`
- **Password:** `<test-password>`
- **Purpose:** For quick testing without worrying about data
- **Button:** 🚀 Skip Authentication (Quick Test)
- **Has sample notes** for immediate testing

---

## Database Management

### Reset Database (Fresh Start)
```bash
npx supabase db reset
```

This will:
1. Drop all tables
2. Re-apply all migrations from `supabase/migrations/`
3. Run `supabase/seed.sql` to create test users and sample data

**⚠️ Warning:** This deletes ALL local data!

### Apply New Migrations Only
```bash
npx supabase migration up
```

### Create New Migration
```bash
npx supabase migration new migration_name
```

---

## User Management

### How Test Users Are Created

Test users are created in `supabase/seed.sql` which runs automatically after migrations.

**Why seed.sql instead of migrations?**
- ✅ Seed data is separate from schema changes
- ✅ Easy to reset without affecting migrations
- ✅ Idempotent (can run multiple times safely)
- ✅ Includes sample notes for testing

### Manually Create Users (Alternative Methods)

#### Method 1: Via Supabase Studio UI (Recommended)
1. Open [http://127.0.0.1:54323](http://127.0.0.1:54323)
2. Go to **Authentication → Users**
3. Click **Add user**
4. Enter email and password
5. Check "Auto Confirm User"

#### Method 2: Via Auth API (Programmatic)
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'http://127.0.0.1:54321',
  'SERVICE_ROLE_KEY' // Get from `npx supabase status`
)

await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'password123',
  email_confirm: true
})
```

#### Method 3: Via Browser Console (Quick)
Open browser console on [http://localhost:3000](http://localhost:3000) and run:

```javascript
const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'YOUR_SERVICE_ROLE_KEY'; // From `npx supabase status`

await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceRoleKey}`,
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'password123',
    email_confirm: true
  })
});
```

---

## Troubleshooting

### "Could not find the table 'public.notes'"
**Solution:** Database needs to be reset
```bash
npx supabase stop
npx supabase start
```

### "Invalid credentials" when logging in
**Solution:** Test users might not exist. Reset database:
```bash
npx supabase db reset
```

### Lost all test data after `db reset`
**Expected behavior.** `db reset` is meant for a fresh start.

To preserve data during development:
- Use `npx supabase migration up` instead of `db reset`
- Or backup data before reset:
  ```bash
  npx supabase db dump -f backup.sql
  # After reset:
  psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f backup.sql
  ```

### Images not uploading (404 error)
**Solution:** Storage bucket might not be created
```bash
npx supabase db reset
```

This will re-apply the migration that creates the `note-images` bucket.

---

## Environment Variables

The app uses Supabase local development by default. No `.env` file needed!

When deploying to production, create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Useful Commands

### Check Supabase Status
```bash
npx supabase status
```

Shows:
- API URL
- Database URL
- Studio URL
- Anon Key
- Service Role Key

### View Logs
```bash
npx supabase logs
```

### Stop Supabase
```bash
npx supabase stop
```

**Note:** Data is preserved in Docker volumes. Use `--no-backup` to delete data:
```bash
npx supabase stop --no-backup
```

---

## Project Structure

```
supabase/
├── config.toml              # Supabase configuration
├── migrations/              # Database schema migrations
│   ├── 20250101000000_initial_schema.sql
│   ├── 20250101000001_enable_rls.sql
│   └── 20250120000000_create_note_images_bucket.sql
└── seed.sql                 # Test users and sample data (runs after migrations)
```

---

## Best Practices

### ✅ DO
- Use `npx supabase db reset` for a fresh start
- Keep test users in `seed.sql`, not in migrations
- Use fixed UUIDs for test users (makes testing easier)
- Add sample data to `seed.sql` for better testing experience

### ❌ DON'T
- Don't create users directly in `auth.users` table in migrations
  - Supabase schema changes between versions
  - Use `seed.sql` or Auth API instead
- Don't commit `.env.local` to git
- Don't use test credentials in production

---

## Next Steps

- Read [Architecture Documentation](./ARCHITECTURE.md)
- Check [Testing Guide](./run_test.md)
- Review [API Documentation](./API.md)

---

**Last Updated:** 2025-01-20

