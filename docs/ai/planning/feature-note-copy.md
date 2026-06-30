---
phase: planning
title: Project Planning & Task Breakdown - Note Copy Button
description: Break down work into actionable tasks for the shared-core note copy action.
---

# Project Planning & Task Breakdown

> Status: to be filled after design is reviewed (`/review-design` → `/execute-plan`).

## Milestones
- [ ] Milestone 1: Core payload service (html + plain + self-copy marker) with unit tests
- [ ] Milestone 2: Web copy adapter wired to reading + editing buttons
- [ ] Milestone 3: Mobile WebView→native bridge + expo-clipboard write, validated on real devices

## Task Breakdown

### Phase 1: Foundation
- [ ] Task 1.1: Core clipboard payload service in `core/`
- [ ] Task 1.2: Plain-text degradation rules + self-copy marker

### Phase 2: Web
- [ ] Task 2.1: Clipboard write adapter (ClipboardItem + writeText fallback)
- [ ] Task 2.2: Wire Copy button in reading and editing modes

### Phase 3: Mobile
- [ ] Task 3.1: Add expo-clipboard; native clipboard write module
- [ ] Task 3.2: WebView builds payload + bridge message (chunked) → native write
- [ ] Task 3.3: Real-device validation (Android/iOS, online/offline, cross-app)

## Dependencies
- Self-copy HTML must stay compatible with existing `smartPaste`.
- Mobile depends on the existing chunked postMessage bridge.

## Timeline & Estimates
- To be estimated during planning.

## Risks & Mitigation
- Mobile rich HTML on system clipboard may degrade per-OS → always ship plain-text fallback.
- Large notes exceed bridge limits → define max size / fallback behavior.

## Resources Needed
- Real Android + iOS test devices.
