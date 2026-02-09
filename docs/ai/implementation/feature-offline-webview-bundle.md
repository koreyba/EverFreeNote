---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide: Offline WebView Bundle

## Development Setup
**How do we get started?**

### Prerequisites and Dependencies
- **Node.js**: 18+ (check with `node --version`)
- **npm/yarn**: Latest version
- **Next.js**: 14+ (already in project)
- **React Native**: Version in `ui/mobile/package.json`
- **Android Studio**: For Android builds and testing
- **Xcode**: For iOS builds and testing (macOS only)
- **Physical Devices**: Android phone + iPhone for offline testing

### Environment Setup Steps

1. **Clone and Install Dependencies**
   ```bash
   # Root (web)
   npm install
   
   # Mobile
   cd ui/mobile
   npm install
   ```

2. **Verify Web Build Works**
   ```bash
   # From root
   npm run build
   # Check that out/ directory is created
   ```

3. **Verify Mobile Dev Mode**
   ```bash
   # Terminal 1: Start web dev server
   npm run dev
   
   # Terminal 2: Start mobile
   cd ui/mobile
   npm run start
   npm run android  # or npm run ios
   ```

4. **Test Static Export**
   ```bash
   npm run build
   npx serve out/
   # Visit http://localhost:3000/editor-webview
   # Should see Tiptap editor load
   ```

### Configuration Needed

**`next.config.js`** - Add static export configuration:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static export
  trailingSlash: true,
  images: {
    unoptimized: true,  // Required for static export
  },
  // Optional: Configure specific routes to export
  // exportPathMap: async function (defaultPathMap) {
  //   return {
  //     '/editor-webview': { page: '/editor-webview' },
  //   }
  // },
}

module.exports = nextConfig
```

**Environment Variables** - Ensure these are set in `ui/mobile/.env`:
```env
EXPO_PUBLIC_WEB_URL=https://your-production-domain.com
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Code Structure
**How is the code organized?**

### Directory Structure

```
c:\Projects\EverFreeNote\
├── app/
│   └── editor-webview/
│       ├── page.tsx              # Main editor page (to be exported)
│       └── layout.tsx            # Layout wrapper
│
├── ui/
│   ├── web/
│   │   └── components/
│   │       └── RichTextEditorWebView.tsx  # Tiptap editor component
│   │
│   └── mobile/
│       ├── components/
│       │   └── EditorWebView.tsx          # WebView wrapper (modify here)
│       ├── app/
│       │   └── note/
│       │       └── [id].tsx               # Note editor screen
│       └── android/
│           └── app/
│               └── src/
│                   └── main/
│                       └── assets/
│                           └── web-editor/  # Bundle destination (Android)
│                               ├── index.html
│                               └── _next/
│                                   └── static/
│                                       ├── chunks/  # Only used JS/CSS
│                                       └── [buildId]/  # Manifest files
│
├── core/
│   └── utils/
│       └── editorWebViewBridge.ts   # Message bridge logic
│
├── scripts/
│   ├── copy-web-bundle.js           # Copy script (create this)
│   └── build-mobile-with-editor.sh  # Build script (create this)
│
├── out/                             # Next.js export output
│   ├── editor-webview/              # Editor page
│   │   ├── index.html                (~9KB)
│   │   └── __next.editor-webview/
│   │
│   └── _next/                       # Shared resources for ALL pages
│       └── static/
│           ├── chunks/              # All JS/CSS chunks (17 files, ~5MB)
│           │                         # ⚠️  Copy only 12 files used by editor!
│           └── [buildId]/           # Build manifests
│
└── .github/
    └── workflows/
        └── mobile-build.yml         # CI pipeline (update this)
```
│
├── scripts/
│   ├── copy-web-bundle.js           # Copy script (create this)
│   └── build-mobile-with-editor.sh  # Build script (create this)
│
├── out/                             # Next.js export output
│   └── editor-webview/              # Editor bundle source
│       ├── index.html
│       ├── _next/
│       │   ├── static/
│       │   └── ...
│       └── bundle-metadata.json     # Version info (create this)
│
└── .github/
    └── workflows/
        └── mobile-build.yml         # CI pipeline (update this)
```

### Module Organization

1. **Web Editor Module** (`app/editor-webview/`)
   - Self-contained page for WYSIWYG editing
   - No server-side dependencies
   - Communicates via `postMessage`

2. **Mobile WebView Module** (`ui/mobile/components/`)
   - Wraps `react-native-webview`
   - Handles URL selection and fallback
   - Manages message bridge

3. **Shared Bridge Module** (`core/utils/`)
   - Platform-agnostic message protocol
   - Chunking for large messages
   - Used by both web and mobile

4. **Build Tools Module** (`scripts/`)
   - Automation for bundling and copying
   - CI integration helpers

### Naming Conventions

- **Files**: `kebab-case.ts` or `PascalCase.tsx` for components
- **Components**: `PascalCase` (e.g., `EditorWebView`)
- **Functions**: `camelCase` (e.g., `getEditorUrl`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MOBILE_CONFIG`)
- **Scripts**: `kebab-case.js/.sh` (e.g., `copy-web-bundle.js`)

## Implementation Notes
**Key technical details to remember:**

### Core Feature 1: Static Export Configuration

**File**: `next.config.js`

```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}
```

**Key Points**:
- `output: 'export'` generates static HTML/CSS/JS
- `trailingSlash: true` ensures consistent URLs
- `images: { unoptimized: true }` required because Image Optimization API unavailable in static export
- Verify no `getServerSideProps` or API routes in editor page

**Testing**: Run `npm run build` and check `out/` directory

---

### Core Feature 2: Bundle Copy Script

**File**: `scripts/copy-web-bundle.js` (CREATE THIS)

```javascript
const fs = require('fs-extra');
const path = require('path');

const SOURCE_HTML = path.join(__dirname, '../out/editor-webview/index.html');
const SOURCE_NEXT = path.join(__dirname, '../out/_next');
const ANDROID_DEST = path.join(__dirname, '../ui/mobile/android/app/src/main/assets/web-editor');
const IOS_DEST = path.join(__dirname, '../ui/mobile/ios/EverFreeNote/WebEditor');

async function copyBundle() {
  console.log('📦 Copying web editor bundle to mobile assets...');
  
  // Verify source exists
  if (!fs.existsSync(SOURCE_HTML)) {
    throw new Error(`Source not found: ${SOURCE_HTML}\nRun 'npm run build' first.`);
  }
  
  // Parse index.html to extract referenced files
  const html = await fs.readFile(SOURCE_HTML, 'utf-8');
  const usedChunks = extractUsedChunks(html);
  
  console.log(`  Found ${usedChunks.length} referenced chunks`);
  
  // Copy to Android
  console.log('  → Android assets');
  await copyBundleToDestination(ANDROID_DEST, html, usedChunks);
  
  // Copy to iOS
  console.log('  → iOS bundle');
  await copyBundleToDestination(IOS_DEST, html, usedChunks);
  
  // Log bundle size
  const size = await getFolderSize(ANDROID_DEST);
  console.log(`✅ Bundle copied successfully (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

function extractUsedChunks(html) {
  const regex = /\/_next\/static\/chunks\/([a-f0-9]+\.(?:js|css))/g;
  const chunks = new Set();
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    chunks.add(match[1]);
  }
  
  // Also extract build ID for manifest files
  const buildIdMatch = html.match(/<!--([a-zA-Z0-9_-]+)-->/);
  if (buildIdMatch) {
    chunks.add(`_buildId:${buildIdMatch[1]}`);
  }
  
  return Array.from(chunks);
}

async function copyBundleToDestination(dest, html, usedChunks) {
  // Clean destination
  await fs.remove(dest);
  await fs.ensureDir(dest);
  
  // Copy index.html
  await fs.writeFile(path.join(dest, 'index.html'), html);
  
  // Copy _next directory structure
  const nextDest = path.join(dest, '_next');
  await fs.ensureDir(path.join(nextDest, 'static', 'chunks'));
  
  // Copy only used chunks
  for (const chunk of usedChunks) {
    if (chunk.startsWith('_buildId:')) {
      // Copy build manifest files
      const buildId = chunk.split(':')[1];
      const buildDir = path.join(SOURCE_NEXT, 'static', buildId);
      if (fs.existsSync(buildDir)) {
        await fs.copy(buildDir, path.join(nextDest, 'static', buildId));
      }
    } else {
      // Copy chunk file
      const srcChunk = path.join(SOURCE_NEXT, 'static', 'chunks', chunk);
      const destChunk = path.join(nextDest, 'static', 'chunks', chunk);
      
      if (fs.existsSync(srcChunk)) {
        await fs.copy(srcChunk, destChunk);
      } else {
        console.warn(`  ⚠️  Chunk not found: ${chunk}`);
      }
    }
  }
}

async function getFolderSize(folderPath) {
  let size = 0;
  const files = await fs.readdir(folderPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(folderPath, file.name);
    if (file.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      size += stats.size;
    }
  }
  
  return size;
}

copyBundle().catch(error => {
  console.error('❌ Error copying bundle:', error);
  process.exit(1);
});
```

**Usage**: `node scripts/copy-web-bundle.js`

**Key Features**:
- Парсит `index.html` для извлечения реально используемых chunks
- Копирует **только** необходимые файлы (~3MB вместо ~5MB+)
- Предупреждает о недостающих файлах
- Логирует итоговый размер

---

### Core Feature 3: EditorWebView URL Selection

**File**: `ui/mobile/components/EditorWebView.tsx` (MODIFY)

**Before** (simplified):
```typescript
const editorUrl = __DEV__ 
  ? 'http://localhost:3000/editor-webview'
  : `${process.env.EXPO_PUBLIC_WEB_URL}/editor-webview`;
```

**After**:
```typescript
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system'; // or use react-native-fs

function getLocalBundlePath(): string | null {
  if (Platform.OS === 'android') {
    return 'file:///android_asset/web-editor/index.html';
  } else if (Platform.OS === 'ios') {
    // iOS uses relative path from main bundle
    return 'web-editor/index.html';
  }
  return null;
}

async function checkLocalBundleExists(path: string | null): Promise<boolean> {
  if (!path) return false;
  
  try {
    if (Platform.OS === 'android') {
      // Android asset check - we assume it exists if bundled
      // Could use native module to verify, but asset:// always succeeds if file present
      return true; // Trust build process
    } else if (Platform.OS === 'ios') {
      const bundlePath = `${FileSystem.bundleDirectory}${path}`;
      const info = await FileSystem.getInfoAsync(bundlePath);
      return info.exists;
    }
  } catch (error) {
    console.log('Local bundle check failed:', error);
    return false;
  }
  
  return false;
}

async function getEditorUrl(): Promise<string> {
  // Priority 1: Try local bundle
  const localPath = getLocalBundlePath();
  if (localPath && await checkLocalBundleExists(localPath)) {
    console.log('✅ Using local editor bundle:', localPath);
    return localPath;
  }
  
  // Priority 2: Dev mode
  if (__DEV__) {
    console.log('🔧 Dev mode: using localhost');
    return 'http://10.0.2.2:3000/editor-webview'; // Android emulator
    // For iOS simulator: 'http://localhost:3000/editor-webview'
  }
  
  // Priority 3: Remote production URL
  const remoteUrl = `${process.env.EXPO_PUBLIC_WEB_URL}/editor-webview`;
  console.log('🌐 Fallback to remote URL:', remoteUrl);
  return remoteUrl;
}

// In component
const [editorUrl, setEditorUrl] = useState<string>('');

useEffect(() => {
  getEditorUrl().then(setEditorUrl);
}, []);
```

**Key Points**:
- Always try local first (offline-first approach)
- Android: `file:///android_asset/` scheme
- iOS: Relative path from bundle, resolved with `FileSystem.bundleDirectory`
- Fallback chain ensures graceful degradation
- Log selection for debugging

---

### Core Feature 4: JavaScript Injection (Verify Works with Local)

**File**: `ui/mobile/components/EditorWebView.tsx` (VERIFY)

```typescript
const injectedJavaScriptBeforeContentLoaded = `
  (function() {
    window.MOBILE_CONFIG = {
      supabaseUrl: '${process.env.EXPO_PUBLIC_SUPABASE_URL}',
      supabaseAnonKey: '${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}',
      theme: '${colorScheme}',
      platform: 'mobile',
      offlineMode: ${!isConnected},
    };
    console.log('✅ Mobile config injected:', window.MOBILE_CONFIG);
  })();
  true;
`;

<WebView
  source={{ uri: editorUrl }}
  injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
  // ... other props
/>
```

**Testing Checklist**:
- [ ] Config available in web page: `console.log(window.MOBILE_CONFIG)`
- [ ] Theme applied correctly
- [ ] Supabase client initializes
- [ ] Works with both `file://` and `https://` URLs

---

### Core Feature 5: Message Bridge (No Changes Expected)

**Files**: 
- `core/utils/editorWebViewBridge.ts`
- `app/editor-webview/page.tsx`

**Verify Unchanged Behavior**:
- `READY` message sent when editor mounts
- `SET_CONTENT` message received and applied
- `CONTENT_CHANGED` sent on typing (debounced)
- `CONTENT_ON_BLUR` sent on blur
- Chunked messages work for large content

**Debugging**:
```typescript
// In app/editor-webview/page.tsx
useEffect(() => {
  console.log('📱 Editor page loaded');
  sendMessage({ type: 'READY' });
}, []);

// In ui/mobile/components/EditorWebView.tsx
const handleMessage = (event: WebViewMessageEvent) => {
  const message = JSON.parse(event.nativeEvent.data);
  console.log('📨 Message from WebView:', message.type);
  // ... handle message
};
```

---

### Core Feature 6: Image URL Rewriting (Existing Logic)

**File**: `app/editor-webview/page.tsx` (VERIFY)

```typescript
// Existing code - verify still works with local bundle
const rewriteImageUrls = (html: string): string => {
  const supabaseUrl = window.MOBILE_CONFIG?.supabaseUrl;
  const devHost = window.MOBILE_CONFIG?.devHost;
  
  let rewritten = html;
  
  // Rewrite Supabase storage paths
  if (supabaseUrl) {
    rewritten = rewritten.replace(
      /src="(\/storage\/v1\/[^"]+)"/g,
      `src="${supabaseUrl}$1"`
    );
  }
  
  // Rewrite localhost URLs in dev
  if (devHost) {
    rewritten = rewritten.replace(
      /src="(http:\/\/localhost:[^"]+)"/g,
      `src="${devHost}$1"`
    );
  }
  
  return rewritten;
};
```

**Note**: CORS may block external images from `file://` origin. Document this limitation.

---

## Patterns & Best Practices

### Pattern 1: Graceful Fallback
Always provide a fallback chain:
```typescript
const resource = await tryOption1() 
  ?? await tryOption2() 
  ?? defaultOption;
```

### Pattern 2: Logging for Debugging
Use clear, prefixed logs:
```typescript
console.log('✅ Success:', detail);
console.log('🔧 Dev mode:', detail);
console.log('⚠️  Warning:', detail);
console.log('❌ Error:', detail);
```

### Pattern 3: Platform-Specific Code
Use `Platform.select` for clarity:
```typescript
const bundlePath = Platform.select({
  android: 'file:///android_asset/web-editor/index.html',
  ios: 'web-editor/index.html',
  default: null,
});
```

### Pattern 4: Fail-Fast Validation
Validate early in scripts:
```javascript
if (!fs.existsSync(SOURCE)) {
  throw new Error('Source not found. Run build first.');
}
```

## Integration Points
**How do pieces connect?**

### Web Build → Mobile Assets
```
npm run build (Next.js)
  → out/editor-webview/
  → node scripts/copy-web-bundle.js
  → ui/mobile/android/app/src/main/assets/web-editor/
  → ui/mobile/ios/[App]/WebEditor/
```

### Mobile Runtime → WebView → Editor
```
EditorWebView.tsx (React Native)
  → getEditorUrl() determines source
  → WebView loads from file:// or https://
  → injectedJavaScript sets window.MOBILE_CONFIG
  → app/editor-webview/page.tsx initializes
  → Tiptap editor mounts
  → sendMessage({ type: 'READY' })
  → Mobile receives message and loads content
```

### Message Flow
```
User types in editor
  → Tiptap onUpdate
  → sendMessage({ type: 'CONTENT_CHANGED', content })
  → Chunked if large (editorWebViewBridge)
  → WebView.postMessage
  → React Native onMessage
  → Save to local storage
```

## Error Handling
**How do we handle failures?**

### Error Handling Strategy

1. **Bundle Not Found**
   ```typescript
   if (!await checkLocalBundleExists(localPath)) {
     console.warn('⚠️  Local bundle not found, using remote URL');
     return getRemoteUrl();
   }
   ```

2. **WebView Load Error**
   ```typescript
   <WebView
     onError={(syntheticEvent) => {
       const { nativeEvent } = syntheticEvent;
       console.error('❌ WebView error:', nativeEvent);
       // Show error UI or retry
     }}
     onHttpError={(syntheticEvent) => {
       console.error('❌ HTTP error:', syntheticEvent.nativeEvent.statusCode);
     }}
   />
   ```

3. **Message Bridge Timeout**
   ```typescript
   const READY_TIMEOUT = 5000; // 5 seconds
   
   useEffect(() => {
     const timeout = setTimeout(() => {
       if (!editorReady) {
         console.error('❌ Editor READY timeout');
         // Show error, retry, or fallback
       }
     }, READY_TIMEOUT);
     
     return () => clearTimeout(timeout);
   }, [editorReady]);
   ```

4. **Build Script Errors**
   ```javascript
   try {
     await fs.copy(SOURCE, DEST);
   } catch (error) {
     console.error('❌ Copy failed:', error.message);
     process.exit(1); // Fail build
   }
   ```

### Logging Approach
- Use structured logs with prefixes
- Log to console in dev, optionally to Sentry in production
- Include context (URLs, file paths, message types)

### Retry/Fallback Mechanisms
- Local bundle → Remote URL (automatic)
- Failed message → Retry with exponential backoff
- Large content → Chunk automatically

## Performance Considerations
**How do we keep it fast?**

### Optimization Strategies

1. **Bundle Size**
   - Tree-shake unused code
   - Minify with `next build`
   - Compress assets (images, fonts)
   - Target: < 5MB total

2. **Load Time**
   - Use local bundle (faster than network)
   - Preload critical resources
   - Lazy load non-critical features

3. **Runtime Performance**
   - Debounce autosave (300ms)
   - Throttle scroll/input events
   - Virtualize long lists (not applicable to editor)

### Caching Approach
- Mobile app bundles editor at build time (ultimate cache)
- No runtime caching needed for bundle itself
- Consider caching images separately for offline

### Resource Management
- Clean up event listeners on unmount
- Avoid memory leaks in message bridge
- Monitor WebView memory usage

## Security Notes
**What security measures are in place?**

### Authentication/Authorization
- Supabase credentials injected via `MOBILE_CONFIG`
- Never hardcode secrets in bundle
- Use environment variables

### Input Validation
- Sanitize HTML content (existing `sanitizer.ts`)
- Validate message types before processing
- Escape user input in injected JavaScript

### Data Encryption
- Content stored in local SQLite (encrypted at rest if configured)
- HTTPS for remote URLs
- File system encryption (OS-level)

### Secrets Management
- Environment variables for Supabase keys
- Never commit `.env` files
- Rotate keys regularly

### CORS Considerations
- `file://` origin may have CORS restrictions
- External resources (Supabase Storage) may be blocked
- Document limitations; consider proxy for critical resources
