---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown: Offline WebView Bundle

## Milestones
**What are the major checkpoints?**

- [x] Milestone 0: Requirements and design documentation completed
- [ ] Milestone 1: Web static export working and validated locally
- [ ] Milestone 2: Mobile integration with local bundle loading
- [ ] Milestone 3: CI/CD pipeline automation and testing
- [ ] Milestone 4: Production release with offline capability

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Web Static Export Setup (Est: 8-12 hours)

#### Task 1.1: Configure Next.js for Static Export
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Modify `next.config.js` to enable static export for `/editor-webview` route
- [ ] Test that `output: 'export'` doesn't break other routes
- [ ] Configure `trailingSlash` and `images` settings for static export
- [ ] Verify no server-side dependencies in editor page

**Acceptance**: `npm run build` produces `out/editor-webview/` with HTML/CSS/JS

#### Task 1.2: Test Static Export Locally
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Build static export: `npm run build`
- [ ] Serve from local HTTP server: `npx serve out/`
- [ ] Verify editor loads and renders correctly
- [ ] Test message bridge sends `READY` signal
- [ ] Verify Tiptap functionality (typing, formatting, images)
- [ ] Check that all assets (fonts, CSS) load correctly

**Acceptance**: Static bundle works identically to dev server version

#### Task 1.3: Optimize Bundle Size
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: Medium

- [ ] Enable Next.js optimizations (minification, tree-shaking)
- [ ] Analyze bundle size with `@next/bundle-analyzer`
- [ ] Identify and filter unused chunks (only copy files referenced in index.html)
- [ ] Optimize images and fonts
- [ ] Target: ~3MB total (index.html + used chunks + assets)

**Acceptance**: Bundle size ~3MB после фильтрации неиспользуемых файлов

#### ~~Task 1.4: Add Bundle Version Metadata~~ ❌ REMOVED FROM MVP
**Rationale**: Overengineering. Bundle version = app version. Git commit in CI logs is sufficient.

---

### Phase 2: Mobile Integration (Est: 12-16 hours)

#### Task 2.1: Create Bundle Copy Script
**Estimate**: 3-4 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Create `scripts/copy-web-bundle.js`
- [ ] Parse `out/editor-webview/index.html` to extract используемые chunks
- [ ] Copy только необходимые файлы:
  - `out/editor-webview/index.html` → `web-editor/index.html`
  - Используемые JS chunks из `out/_next/static/chunks/`
  - Используемый CSS из `out/_next/static/chunks/`
  - Build manifest из `out/_next/static/[buildId]/`
- [ ] Copy to Android: `ui/mobile/android/app/src/main/assets/web-editor/`
- [ ] Copy to iOS: `ui/mobile/ios/[AppName]/WebEditor/`
- [ ] Add validation: check all referenced files exist
- [ ] Handle errors (missing source, target dirs)
- [ ] Log bundle size and file count

**Acceptance**: Script copies ~3MB bundle with only necessary files to both platforms

#### Task 2.2: Implement Local Bundle Detection
**Estimate**: 3-4 hours  
**Assignee**: TBD  
**Priority**: High

**Files to modify**: `ui/mobile/components/EditorWebView.tsx`

- [ ] Add function `checkLocalBundleExists()` for Android/iOS
- [ ] Implement platform-specific file existence checks
- [ ] Add logging for bundle detection (found/not found)
- [ ] Handle permissions issues gracefully

**Acceptance**: Function correctly detects presence of local bundle

#### Task 2.3: Update EditorWebView URL Logic
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

**Files to modify**: `ui/mobile/components/EditorWebView.tsx`

- [ ] Implement simplified `getEditorUrl()` with clear dev/prod separation:
  1. Dev mode (`__DEV__=true`) → ALWAYS localhost
  2. Production → Try local bundle
  3. Fallback → Remote URL
- [ ] Add NetInfo integration for `isConnected` state
- [ ] Add platform-specific URL formatting:
  - Android: `file:///android_asset/web-editor/index.html`
  - iOS: Relative path from bundle
- [ ] Add clear logging for each decision
- [ ] Remove complex conditional logic (KISS principle)

**Acceptance**: WebView loads correct URL based on simple rules, logs explain decisions

#### Task 2.4: Verify JavaScript Injection
**Estimate**: 2 hours  
**Assignee**: TBD  
**Priority**: High

**Files to modify**: `ui/mobile/components/EditorWebView.tsx`

- [ ] Add `@react-native-community/netinfo` dependency
- [ ] Implement NetInfo listener for `isConnected` state
- [ ] Update `injectedJavaScriptBeforeContentLoaded` to use `JSON.stringify()` (XSS prevention)
- [ ] Test injection with local `file://` URLs
- [ ] Verify `window.MOBILE_CONFIG` is set before page loads
- [ ] Test theme injection (light/dark)
- [ ] Validate Supabase config injection
- [ ] Check offline mode flag updates on network change

**Acceptance**: Config injection secure and works identically for local and remote URLs

#### Task 2.5: Test Message Bridge with Local Bundle
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

**Files to check**: `core/utils/editorWebViewBridge.ts`, `app/editor-webview/page.tsx`

- [ ] Verify `READY` message sent from local bundle
- [ ] Test `SET_CONTENT` message from native to WebView
- [ ] Test `CONTENT_CHANGED` on typing
- [ ] Test `CONTENT_ON_BLUR` on focus loss
- [ ] Verify chunked messages work (large content > 1MB)
- [ ] Check message timing and latency

**Acceptance**: All message types work correctly with local bundle

---

### Phase 3: Asset and Resource Handling (Est: 6-8 hours)

#### Task 3.1: Validate Relative Paths in Bundle
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: Medium

- [ ] Check CSS/JS/font relative paths in exported HTML
- [ ] Test image assets load from correct paths
- [ ] Verify no hard-coded `http://localhost` URLs in bundle
- [ ] Fix any broken asset references

**Acceptance**: All bundle assets load correctly from local file system

#### Task 3.2: Document Image Behavior & CORS Limitation
**Estimate**: 1 hour  
**Assignee**: TBD  
**Priority**: Medium

**Files to review**: `app/editor-webview/page.tsx`

- [ ] Verify existing image URL rewriting logic works with local bundle
- [ ] Test images with `/storage/v1/...` paths (Supabase)
- [ ] **Accept limitation**: Uncached external images may not load offline (CORS)
- [ ] Document known limitation in user-facing docs
- [ ] Verify WebView HTTP cache works for previously viewed images
- [ ] Add placeholder/error handling for broken images

**Acceptance**: Image rewriting works; CORS limitation documented as known issue for MVP

#### Task 3.3: Handle CORS and Security Policies
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Test external resource loading from `file://` origin
- [ ] Configure WebView to allow mixed content if needed
- [ ] Set appropriate Content Security Policy
- [ ] Handle Supabase Storage CORS (may need proxy)
- [ ] Document CORS limitations in offline mode

**Acceptance**: No CORS errors for essential functionality; documented limitations

---

### Phase 4: Build Process & CI/CD (Est: 8-10 hours)

#### Task 4.1: Create Build Script
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Create `scripts/build-mobile-with-editor.sh` (or `.js`)
- [ ] Steps:
  1. `npm run build` (web)
  2. `node scripts/copy-web-bundle.js`
  3. `cd ui/mobile && npm run build:android`
  4. `cd ui/mobile && npm run build:ios`
- [ ] Add validation checkpoints
- [ ] Log bundle metadata
- [ ] Exit on errors

**Acceptance**: Single script builds entire mobile app with bundled editor

#### Task 4.2: Update GitHub Actions Pipeline
**Estimate**: 3-4 hours  
**Assignee**: TBD  
**Priority**: High

**Files to modify**: `.github/workflows/mobile-build.yml` (or equivalent)

- [ ] Add step: Build web static export
- [ ] Add step: Copy bundle to mobile assets
- [ ] Add step: Verify bundle integrity
- [ ] Add step: Build mobile (Android/iOS)
- [ ] Cache `out/` directory between steps
- [ ] Upload bundle metadata as artifact

**Acceptance**: CI builds mobile app with bundled editor automatically

#### ~~Task 4.3: Add Bundle Version Tracking~~ ❌ REMOVED FROM MVP
**Rationale**: Bundle version = app version. No separate metadata file needed.

#### Task 4.4: Test CI/CD End-to-End
**Estimate**: 1-2 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Trigger full CI build
- [ ] Download APK/IPA artifacts
- [ ] Extract and inspect bundle contents
- [ ] Verify metadata is correct
- [ ] Install on device and test offline

**Acceptance**: CI produces working mobile builds with correct bundle

---

### Phase 5: Testing & Validation (Est: 10-12 hours)

#### Task 5.1: Manual Testing - Android
**Estimate**: 3-4 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Install APK with bundled editor
- [ ] Disable network completely
- [ ] Create new note → verify editor loads
- [ ] Type and format text → verify autosave
- [ ] Test image insertion (if cached)
- [ ] Switch theme (dark/light)
- [ ] Test focus/blur events
- [ ] Verify fallback when bundle missing

**Acceptance**: All offline scenarios work on Android

#### Task 5.2: Manual Testing - iOS
**Estimate**: 3-4 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Install IPA with bundled editor
- [ ] Disable network completely
- [ ] Create new note → verify editor loads
- [ ] Type and format text → verify autosave
- [ ] Test image insertion (if cached)
- [ ] Switch theme (dark/light)
- [ ] Test focus/blur events
- [ ] Verify fallback when bundle missing

**Acceptance**: All offline scenarios work on iOS

#### Task 5.3: Dev Mode Regression Testing
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Run `npm run dev` (web)
- [ ] Run `npm run start` (mobile)
- [ ] Verify mobile connects to dev server
- [ ] Test hot reload works
- [ ] Verify no bundle required in dev
- [ ] Check logs for errors

**Acceptance**: Dev workflow unaffected by changes

#### Task 5.4: Performance Testing
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: Medium

- [ ] Measure editor load time (local bundle)
- [ ] Measure message latency (READY, SET_CONTENT)
- [ ] Test large note content (5MB+)
- [ ] Profile memory usage
- [ ] Compare performance: local vs remote

**Acceptance**: Performance meets targets (< 1s load, < 100ms latency)

---

### Phase 6: Documentation & Deployment (Est: 4-6 hours)

#### Task 6.1: Update README and Dev Docs
**Estimate**: 2-3 hours  
**Assignee**: TBD  
**Priority**: Medium

**Files to update**:
- `ui/mobile/README.md`
- `docs/DEVELOPMENT_SETUP.md`

- [ ] Document offline editor feature
- [ ] Explain build process with bundled editor
- [ ] Add troubleshooting section (bundle not found, etc.)
- [ ] Update dev setup instructions
- [ ] Document bundle versioning

**Acceptance**: Docs reflect new offline capability and build process

#### Task 6.2: Create Migration Guide
**Estimate**: 1-2 hours  
**Assignee**: TBD  
**Priority**: Low

- [ ] Document changes for existing developers
- [ ] Explain new build steps
- [ ] Note any breaking changes
- [ ] Provide rollback instructions if needed

**Acceptance**: Clear migration path for team members

#### Task 6.3: Production Deployment
**Estimate**: 1-2 hours  
**Assignee**: TBD  
**Priority**: High

- [ ] Trigger production build via CI
- [ ] Validate bundle in production artifacts
- [ ] Deploy to internal testing track (TestFlight/Internal Testing)
- [ ] Smoke test on real devices
- [ ] Promote to production if successful

**Acceptance**: Production app includes working offline editor

---

## Dependencies
**What needs to happen in what order?**

### Critical Path
1. Phase 1 (Web Export) must complete before Phase 2 (Mobile Integration)
2. Task 2.1 (Copy Script) must complete before Task 4.1 (Build Script)
3. Phase 2 must complete before Phase 3 (Asset Handling)
4. Phases 1-3 must complete before Phase 4 (CI/CD)
5. Phase 4 must complete before Phase 5 (Testing)

### External Dependencies
- **Next.js static export**: Must support all features used in `/editor-webview`
- **React Native WebView**: Must support local file loading on target platforms
- **CI Environment**: Must have access to build both web and mobile
- **EAS Build / Fastlane**: Mobile build tools must be configured

### Parallel Work Opportunities
- Task 1.4 (Metadata) can be done in parallel with Phase 2
- Task 3.3 (CORS) can be researched in parallel with Phase 2
- Documentation (Phase 6.1-6.2) can be drafted in parallel with testing

## Timeline & Estimates
**When will things be done?**

### Effort Summary
- **Phase 1**: 6-9 hours (Web Export - уже работает, только оптимизация)
- **Phase 2**: 10-14 hours (Mobile Integration - упрощено без metadata)
- **Phase 3**: 3-4 hours (Asset Handling - CORS принято как limitation)
- **Phase 4**: 6-8 hours (CI/CD - без metadata tracking)
- **Phase 5**: 10-12 hours (Testing)
- **Phase 6**: 4-6 hours (Documentation)

**Total Estimated Effort**: 39-53 hours (5-7 working days)

**Removed from MVP** (экономия ~6-8 часов):
- Bundle metadata file and infrastructure
- CORS proxy implementation
- Complex CSP configuration

### Milestones Timeline (with 1 developer)
- **Week 1**: Phase 1 + Phase 2 (complete web export and basic mobile integration)
- **Week 2**: Phase 3 + Phase 4 (asset handling and CI automation)
- **Week 3**: Phase 5 + Phase 6 (testing, documentation, deployment)

### Buffer
- Add 20% buffer for unknowns: ~10-12 hours
- **Realistic Timeline**: 3-4 weeks for 1 developer

## Risks & Mitigation
**What could go wrong?**

### Risk 1: Next.js Static Export Limitations
**Likelihood**: Medium | **Impact**: High

**Description**: `/editor-webview` page may use features incompatible with static export (server components, API routes, dynamic imports)

**Mitigation**:
- Early validation in Task 1.1
- Refactor page to client-side only if needed
- Test thoroughly in Task 1.2

**Contingency**: Use different bundler (Vite, Webpack) if Next.js export fails

---

### Risk 2: WebView File Loading Restrictions
**Likelihood**: Medium | **Impact**: High

**Description**: Platform restrictions may prevent loading local files in WebView (especially iOS)

**Mitigation**:
- Research platform documentation early (Task 2.2)
- Test on real devices, not just simulators
- Prepare alternative approaches (embedded server, different URL scheme)

**Contingency**: Use embedded HTTP server serving from memory if `file://` doesn't work

---

### Risk 3: CORS Blocking External Resources
**Likelihood**: High | **Impact**: Medium

**Description**: Loading Supabase Storage images from `file://` origin may fail due to CORS

**Mitigation**:
- Identify issue early in Task 3.2
- Implement proxy or caching strategy for images
- Document offline limitations clearly

**Contingency**: Accept that uncached external images won't load offline; improve image caching separately

---

### Risk 4: Bundle Size Too Large
**Likelihood**: Low | **Impact**: Medium

**Description**: Static bundle causes APK size concerns

**Current Status**: ✅ Measured ~3MB after filtering unused chunks

**Mitigation**:
- Copy only files referenced in index.html (smart filtering)
- Monitor size after each optimization
- Compress assets where possible

**Contingency**: Further split bundle or use lazy loading for non-critical parts

---

### Risk 5: Message Bridge Incompatibility
**Likelihood**: Low | **Impact**: High

**Description**: Chunked message bridge behaves differently with local files

**Mitigation**:
- Test thoroughly in Task 2.5
- Add logging to debug message flow
- Compare behavior: local vs remote

**Contingency**: Adjust bridge logic if needed; well-isolated code should make this manageable

---

### Risk 6: CI/CD Complexity
**Likelihood**: Medium | **Impact**: Medium

**Description**: CI pipeline becomes fragile or slow with multi-step build

**Mitigation**:
- Modular build scripts with clear checkpoints
- Good error messages and logging
- Cache intermediate artifacts

**Contingency**: Manual build process as fallback; invest in CI stability iteratively

---

## Resources Needed
**What do we need to succeed?**

### Team Members and Roles
- **1 Full-Stack Developer**: Web + Mobile integration + CI (primary)
- **1 QA Tester**: Manual testing on Android/iOS (Phase 5)
- **DevOps Support**: CI/CD pipeline configuration (advisory, ~2-4 hours)

### Tools and Services
- **Development**:
  - Node.js 18+, npm/yarn
  - Android Studio + Android SDK
  - Xcode + iOS SDK
  - Physical Android and iOS devices for testing

- **CI/CD**:
  - GitHub Actions or equivalent
  - EAS Build (Expo) or Fastlane (React Native CLI)

- **Monitoring**:
  - Bundle size analyzer: `@next/bundle-analyzer`
  - Sentry or similar for error tracking (optional)

### Infrastructure
- **Storage**: Space for build artifacts in CI (~500MB per build)
- **Compute**: CI runners capable of mobile builds (macOS for iOS)

### Documentation/Knowledge
- Next.js static export guide
- React Native WebView documentation (Android/iOS)
- Platform-specific file loading guides
- Existing codebase knowledge (`editorWebViewBridge`, `EditorWebView` component)
