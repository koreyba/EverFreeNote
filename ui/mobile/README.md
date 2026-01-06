# Mobile UI layer (React Native / Expo)

## Quick Start

### 1. Start backend services (for dev builds)
```bash
# In project root - start Supabase (database, auth)
supabase start

# In ui/web folder - start Next.js (editor WebView)
cd ui/web
npm run dev
```
The mobile app needs:
- **Supabase** — database and authentication
- **Next.js on port 3000** — the note editor runs inside a WebView that loads from your local web server

### 2. Install dependencies
```bash
cd ui/mobile
npm install
```

### 3. Configure environment
Edit `.env` file:
```env
# Your computer's local IP (not 127.0.0.1!)
# Find it with: ipconfig | grep IPv4
EXPO_PUBLIC_SUPABASE_URL=http://192.168.x.x:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-supabase-anon-key
```

### 4. Connect your phone
- Enable **Developer Options** and **USB Debugging** on your Android phone
- Connect via USB cable
- Verify connection: `adb devices`

### 5. Build and run
```bash
# Dev build (local Supabase)
npm run android:dev

# Stage build (staging Supabase)
npm run android:stage

# Prod build (production Supabase)
npm run android:prod
```

> **Note:** For **stage** and **prod** builds, Next.js is NOT needed — they use cloud-hosted editor. Only **dev** builds require local Next.js.

---

## App Variants

Three separate apps can be installed side-by-side on Android:

| Variant | Package ID | App Name | Supabase |
|---------|------------|----------|----------|
| dev | `com.everfreenote.app.dev` | EverFreeNote Dev | Local (from `.env`) |
| stage | `com.everfreenote.app.stage` | EverFreeNote Stage | Staging cloud |
| prod | `com.everfreenote.app` | EverFreeNote | Production cloud |

---

## Available Scripts

### Build & Install
```bash
npm run android:dev      # Build and install dev variant
npm run android:stage    # Build and install stage variant
npm run android:prod     # Build and install prod variant
```

### Start Metro bundler (if app is already installed)
```bash
npm run dev              # Start Metro for dev variant
npm run start:dev        # Same as above
npm run start:stage      # Start Metro for stage variant
npm run start:prod       # Start Metro for prod variant
```

### Code quality
```bash
npm run validate         # TypeScript + ESLint check
npm run test             # Run tests
npm run test:coverage    # Run tests with coverage
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Dev environment variables (local Supabase URL) |
| `app.config.ts` | Expo config with all variants (dev/stage/prod) |
| `android/app/build.gradle` | Android product flavors |

---

## Troubleshooting

### "Cannot connect to Supabase"
1. Check your IP: `ipconfig | grep IPv4`
2. Update `.env` with correct IP (use `192.168.x.x`, not `127.0.0.1`)
3. Make sure local Supabase is running: `supabase start`
4. Phone and computer must be on the same WiFi network

### "Editor failed to load" (dev build)
1. Make sure Next.js is running: `cd ui/web && npm run dev`
2. Next.js must be on port 3000
3. Phone must reach your computer's IP on port 3000

### "Device not found"
1. Enable USB Debugging on phone
2. Run `adb devices` to verify connection
3. Accept USB debugging prompt on phone

### Build fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android:dev
```

---

## Project Structure

```
ui/mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/             # Auth screens
│   ├── (tabs)/             # Main tab screens
│   └── _layout.tsx         # Root layout
├── components/             # React Native components
├── adapters/               # Platform adapters (storage, oauth, etc.)
├── providers/              # Context providers
├── hooks/                  # Custom hooks
├── assets/                 # Icons, images, fonts
├── android/                # Native Android code
├── .env                    # Environment variables (dev only)
├── app.config.ts           # Expo configuration
└── package.json            # Dependencies and scripts
```

---

## Documentation

- [LAUNCH_GUIDE.md](./LAUNCH_GUIDE.md) - Detailed launch instructions
- [VALIDATION_RULES.md](./VALIDATION_RULES.md) - Code quality rules
- [TESTING_PLAN.md](./TESTING_PLAN.md) - Testing strategy
