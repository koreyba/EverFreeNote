# Mobile Build Testing Guide

Quick guide for testing mobile app with offline WebView bundle.

## Prerequisites

- Node.js 18+
- Android Studio (for Android) OR Xcode (for iOS, macOS only)
- React Native environment set up

## Build Process

### 1. Build Web Editor Bundle

```bash
# From project root
npm run build
```

**Expected output:**
- ✅ `out/editor-webview/index.html` created (~9 KB)
- ✅ Build completes in ~80s
- ✅ No TypeScript errors

### 2. Copy Bundle to Mobile Assets

```bash
node build/copy-web-bundle.js
```

**Expected output:**
```
📦 Copying web editor bundle to mobile assets...
  Found 13 referenced chunks
  → Android assets
  → iOS bundle
✅ Bundle copied successfully
   Android: 1.56 MB
   iOS: 1.56 MB
```

**Verify:**
```powershell
# Android
Get-ChildItem ui\mobile\android\app\src\main\assets\web-editor\

# iOS  
Get-ChildItem ui\mobile\ios\EverFreeNote\WebEditor\
```

Should see: `index.html` and `_next/` directory with chunks.

### 3. Build Mobile App

#### Android

```bash
cd ui/mobile
npm run android:dev  # or android:prod
```

**Expected:**
- APK builds successfully
- App installs on device/emulator
- Editor loads from local bundle (offline-first)

#### iOS

```bash
cd ui/mobile
npm run ios:dev  # or ios:prod
```

**Expected:**
- IPA builds successfully
- App installs on simulator/device
- Editor loads from local bundle

## Testing Checklist

### ✅ Basic Functionality
- [ ] App launches without errors
- [ ] Editor screen loads
- [ ] Editor is functional (can type, format text)
- [ ] No console errors about missing files

### ✅ Offline Mode
- [ ] Turn off WiFi/mobile data
- [ ] Open editor - should still work
- [ ] Create/edit notes offline
- [ ] Content persists

### ✅ Network Switching
- [ ] Start offline, editor works
- [ ] Turn on network, editor still works
- [ ] Create note, sync to server
- [ ] Verify data integrity

### ✅ Performance
- [ ] Editor loads in < 2 seconds
- [ ] No lag when typing
- [ ] Smooth scrolling
- [ ] Bundle size < 4 MB (check APK size)

## Troubleshooting

### Editor shows blank screen
- Check: Did you run `npm run build` first?
- Check: Is `out/editor-webview/index.html` present?
- Check: Did `copy-web-bundle.js` complete successfully?

### "File not found" errors
- Check Android: `ui/mobile/android/app/src/main/assets/web-editor/index.html` exists
- Check iOS: `ui/mobile/ios/EverFreeNote/WebEditor/index.html` exists
- Rebuild: Run copy script again

### Bundle size too large
- Expected: ~1.56 MB
- If larger: Check that old build artifacts are cleaned
- Solution: `Remove-Item out\ -Recurse -Force` and rebuild

### TypeScript errors
```bash
npm run type-check  # Root
cd ui/mobile && npm run type-check  # Mobile
```

## Quick Test Commands

```powershell
# Run all tests
node build/test-copy-bundle.js
node build/test-edge-cases.js

# Verify bundle integrity (list files)
Get-ChildItem ui\mobile\android\app\src\main\assets\web-editor\ -Recurse | Select-Object FullName, Length

# Calculate bundle size
$size = (Get-ChildItem ui\mobile\android\app\src\main\assets\web-editor\ -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Host "Bundle size: $([math]::Round($size/1MB, 2)) MB"

# Check build output
npm run build; Get-ChildItem out\editor-webview\ | Select-Object Name, Length
```

## Automation (Future)

Currently builds are manual. Potential automation:

1. **Pre-build hook:** Copy bundle automatically before mobile build
2. **GitHub Actions:** CI/CD for APK generation
3. **Gradle/Xcode integration:** Run copy script as build step

For now: **Manual process ensures control and visibility.**

## Success Criteria

- ✅ Web build completes: ~80s
- ✅ Bundle copy completes: ~3s
- ✅ Bundle size: 1.56 MB per platform
- ✅ Offline editing works
- ✅ No TypeScript errors
- ✅ All tests pass (17/17)

If all checks pass: **Ready for production build!** 🚀
