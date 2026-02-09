# Build Scripts

Build automation scripts for mobile app bundles.

## Scripts

### `copy-web-bundle.js`
Copies Next.js static export to mobile app assets with smart chunk filtering.

**Usage:**
```bash
node build/copy-web-bundle.js
```

**What it does:**
1. Parses `out/editor-webview/index.html`
2. Extracts referenced chunks (JS/CSS)
3. Copies only used files to:
   - `ui/mobile/android/app/src/main/assets/web-editor/`
   - `ui/mobile/ios/EverFreeNote/WebEditor/`
4. Optimizes bundle size (~31% reduction)

**Requirements:**
- Run `npm run build` first to generate `out/` directory
- Requires `fs-extra` package

### Test Scripts

- `test-copy-bundle.js` - Unit tests (6 tests)
- `test-edge-cases.js` - Integration tests (11 scenarios)

**Run tests:**
```bash
node build/test-copy-bundle.js
node build/test-edge-cases.js
```

## Build Process

1. **Web build:** `npm run build` (generates `out/`)
2. **Copy bundle:** `node build/copy-web-bundle.js`
3. **Mobile build:** Build Android/iOS app with bundled editor

## Output

- **Android:** `ui/mobile/android/app/src/main/assets/web-editor/`
- **iOS:** `ui/mobile/ios/EverFreeNote/WebEditor/`
- **Size:** ~1.56 MB per platform
- **Files:** 16 files (12 JS + 1 CSS + 3 manifests)

## Notes

- Bundle files are **not committed to git** (see `.gitignore`)
- Always regenerate bundles before mobile builds
- Test scripts verify integrity and performance
