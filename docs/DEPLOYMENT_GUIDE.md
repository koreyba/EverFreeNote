# 🌿 EverFreeNote - Deployment Guide

## 📦 What's Included

This package contains the complete EverFreeNote application - a **Single Page Application (SPA)** optimized for Cloudflare Pages.

### Architecture:
- ✅ **Client-Side Only** - No server-side code required
- ✅ **Direct Supabase Integration** - All operations from browser
- ✅ **Static Export** - Fully static HTML/CSS/JS
- ✅ **Fast & Scalable** - Optimized for edge deployment

### Key Features Implemented:
- ✅ Google OAuth Authentication via Supabase
- ✅ Create, Edit, Delete Notes
- ✅ Tags System (comma-separated tags per note)
- ✅ Real-time Search (by title, description, and tags)
- ✅ Beautiful Evernote-style UI
- ✅ Secure Row-Level Security (RLS) in Supabase

---

## 🚀 Quick Start (Local Testing)

### 1. Extract the Archive
```bash
tar -xzf everfreenote.tar.gz
cd everfreenote
```

### 2. Install Dependencies
```bash
yarn install
# or
npm install
```

### 3. Environment Variables
The `.env` file is already included with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://pmlloiywmuglbjkhrggo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbGxvaXl3bXVnbGJqa2hyZ2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTM5ODksImV4cCI6MjA3NTc4OTk4OX0.w0nQ2o4V2I35NujqOTgAfE3QSU1nYIJqTsTSCGT6UDw
```

### 4. Run Locally
```bash
yarn dev
# or
npm run dev
```

Visit: http://localhost:3000

---

## ☁️ Deploy to Cloudflare Pages

### Method 1: Via GitHub (Recommended)

#### Step 1: Create Git Repository
```bash
git init
git add .
git commit -m "Initial commit - EverFreeNote"
git branch -M main
```

#### Step 2: Push to GitHub
```bash
# Create a new repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/everfreenote.git
git push -u origin main
```

#### Step 3: Deploy on Cloudflare Pages
1. Go to: https://dash.cloudflare.com/
2. Click **Workers & Pages** → **Create application** → **Pages**
3. Click **Connect to Git**
4. Select your repository
5. Configure build settings:
   - **Production branch:** `main`
   - **Framework preset:** Next.js (Static HTML Export)
   - **Build command:** `npm run build` or `yarn build`
   - **Build output directory:** `out`
   - **Node version:** `20` (or 18+)

#### Step 4: Add Environment Variables
In Cloudflare Pages project settings:
- Go to **Settings** → **Environment variables**
- Add (for Production):
  ```
  NEXT_PUBLIC_SUPABASE_URL = https://pmlloiywmuglbjkhrggo.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbGxvaXl3bXVnbGJqa2hyZ2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMTM5ODksImV4cCI6MjA3NTc4OTk4OX0.w0nQ2o4V2I35NujqOTgAfE3QSU1nYIJqTsTSCGT6UDw
  NODE_VERSION = 20
  ```

#### Step 5: Deploy
- Click **Save and Deploy**
- Your app will be live at: `https://your-project.pages.dev`

---

### Method 2: Direct Upload via Wrangler CLI

#### Step 1: Install Wrangler
```bash
npm install -g wrangler
```

#### Step 2: Login to Cloudflare
```bash
wrangler login
```

#### Step 3: Build the Application
```bash
yarn build
# or
npm run build
```

#### Step 4: Deploy
```bash
wrangler pages deploy out --project-name=everfreenote
```

#### Step 5: Set Environment Variables
Via Cloudflare Dashboard:
1. Go to your Pages project
2. Settings → Environment variables
3. Add the Supabase variables (see above)

Or via CLI:
```bash
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🔧 Post-Deployment Configuration

### Update Supabase Redirect URLs

**Important:** After deployment, you must update Supabase with your production URL.

1. Go to: https://supabase.com/dashboard/project/pmlloiywmuglbjkhrggo
2. Navigate to: **Authentication** → **URL Configuration**
3. Update:
   - **Site URL:** `https://your-app.pages.dev`
   - **Redirect URLs** (add these):
     - `https://your-app.pages.dev/**`
     - `https://your-app.pages.dev/auth/callback`
4. Click **Save**

### Enable Google OAuth Provider

Make sure Google OAuth is enabled in Supabase:
1. Go to: **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials (if not already done)

---

## 📁 Project Structure

```
everfreenote/
├── app/
│   ├── auth/callback/page.tsx     # OAuth callback handler
│   ├── page.tsx                   # Main application UI (SPA)
│   ├── layout.tsx                 # Root layout
│   └── globals.css               # Global styles
├── lib/
│   └── supabase/
│       └── client.ts             # Supabase browser client
├── components/ui/                # Shadcn UI components
├── package.json                  # Dependencies
├── next.config.js               # Next.js config (static export)
├── tailwind.config.js           # Tailwind configuration
└── .env                         # Environment variables
```

**Note:** This is a pure client-side application. All database operations are performed directly from the browser to Supabase using their JavaScript SDK.

---

## 🧪 Testing the Deployed App

After deployment, test these features:

### 1. Authentication
- Click "Continue with Google"
- Complete Google OAuth flow
- Verify redirect back to app

### 2. Create Note
- Click "New Note"
- Add title: "My First Note"
- Add description: "This is a test note"
- Add tags: "test, demo"
- Click "Save"

### 3. Search
- Use search bar to find notes
- Try searching by title, description, or tag
- Verify real-time filtering

### 4. Edit Note
- Click on a note to view it
- Click "Edit"
- Modify content
- Click "Save"

### 5. Delete Note
- Click on a note
- Click "Delete"
- Confirm deletion

### 6. Sign Out
- Click logout icon at bottom of sidebar
- Verify redirect to login page

---

## 🔐 Security Features

- ✅ Row-Level Security (RLS) in Supabase
- ✅ User-specific note isolation
- ✅ Secure OAuth flow
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ Proper CORS configuration

---

## 📊 Database Schema

The Supabase `notes` table structure:

```sql
notes (
  id UUID PRIMARY KEY,
  user_id UUID (references auth.users),
  title TEXT,
  description TEXT,
  tags TEXT[],
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

RLS policies ensure users can only access their own notes.

---

## 🐛 Troubleshooting

### OAuth Redirect Not Working
- Verify redirect URLs in Supabase dashboard
- Ensure URLs match exactly (including https://)
- Check browser console for errors

### Notes Not Saving
- Check Supabase credentials in environment variables
- Verify RLS policies are enabled
- Check browser network tab for API errors

### Search Not Working
- Ensure notes exist in database
- Check search query in network tab
- Verify user is authenticated

### Build Fails on Cloudflare
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

---

## 📝 Data Operations

All operations are performed **directly from the browser** to Supabase:

### Authentication (via Supabase SDK)
- `supabase.auth.signInWithOAuth()` - Google OAuth login
- `supabase.auth.signOut()` - Sign out user
- `supabase.auth.getSession()` - Get current session

### Notes (via Supabase SDK)
- `supabase.from('notes').insert()` - Create note
- `supabase.from('notes').select()` - Get all user notes
- `supabase.from('notes').select().or()` - Search notes
- `supabase.from('notes').update()` - Update note
- `supabase.from('notes').delete()` - Delete note

All operations are protected by **Row-Level Security (RLS)** in Supabase, ensuring users can only access their own data.

---

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js` to customize the color scheme.

### Modify UI
The main UI is in `app/page.tsx` - it's a single-file component for easy customization.

### Add Features
- File attachments: Use Supabase Storage (works from browser)
- Rich text editor: Add TipTap or Quill
- Notebooks: Add a parent category system
- Sharing: Implement RLS policies for shared access
- Real-time collaboration: Use Supabase Realtime subscriptions
- Mobile apps: Use the same Supabase backend with React Native/Flutter

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)

---

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review Supabase dashboard logs
3. Check Cloudflare Pages build logs
4. Verify environment variables are set correctly

---

## 📄 License

This project is provided as-is for your personal use.

---

**Happy Note-Taking! 🎉**
