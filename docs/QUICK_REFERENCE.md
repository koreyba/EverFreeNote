# Quick Reference

## Test Users (Local Development)

### Credentials
```
Email: test@example.com
Password: testpassword123

Email: skip-auth@example.com  
Password: testpassword123
```

### How to Create/Restore Test Users

If you lost test users or starting fresh:

```bash
npm run db:init-users
```

This will:
- ✅ Create test users with correct password hashes
- ✅ Add sample notes for testing
- ✅ Skip if users already exist (idempotent)

**Why not use seed.sql?**
- Password hashing must be done by Supabase Auth service
- SQL cannot create proper bcrypt hashes
- Admin API is the correct way to create users

---

## Common Commands

```bash
# Start Supabase
npx supabase start

# Create test users (run after start)
npm run db:init-users

# Reset database
npx supabase db reset
# Then run: npm run db:init-users

# Check status (get API keys)
npx supabase status

# View logs
npx supabase logs

# Stop Supabase
npx supabase stop
```

---

## Where Test Users Are Defined

**File:** `scripts/init-test-users.ts`

This script uses Supabase Admin API to create:
- 2 test users with known credentials
- Sample notes for testing
- All necessary auth records (users + identities)

**Why a script instead of seed.sql?**
- Password hashing requires Supabase Auth service
- SQL cannot generate proper bcrypt hashes
- Admin API ensures compatibility
- Idempotent (safe to run multiple times)

---

## Manual User Creation (Alternative)

### Via Supabase Studio
1. Open http://127.0.0.1:54323
2. Authentication → Users → Add user
3. Enter email/password, check "Auto Confirm"

### Via Browser Console
```javascript
const url = 'http://127.0.0.1:54321';
const key = 'SERVICE_ROLE_KEY'; // From `npx supabase status`

await fetch(`${url}/auth/v1/admin/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
    'apikey': key
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    email_confirm: true
  })
});
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Invalid credentials" | Run `npx supabase db reset` |
| "Table not found" | Run `npx supabase stop` then `npx supabase start` |
| Lost test data | Expected after `db reset`. Use seed.sql to recreate |
| Images not uploading | Run `npx supabase db reset` to recreate storage bucket |

---

**See also:** [Development Setup Guide](./DEVELOPMENT_SETUP.md)

