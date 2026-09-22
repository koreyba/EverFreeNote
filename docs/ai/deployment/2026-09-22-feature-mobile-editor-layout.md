---
phase: deployment
title: Deployment Strategy
description: Define deployment process, infrastructure, and release procedures
---

# Mobile editor layout deployment

## Infrastructure
Shared Next.js bundle delivered to the existing web host and Capacitor Android shell. No new infrastructure or environment configuration.

## Deployment Pipeline
Run the existing type/lint/component checks and web build. Publish/build through the existing project workflows when release is requested. Local preview is running at http://localhost:3147 with test auth enabled only in ignored local environment configuration. A development APK was built and installed on the Android 36 emulator for keyboard validation. PR and merge publication use the existing repository workflows; this local APK is not a production release.

## Rollback
Revert this isolated UI change and rebuild the shared bundle. No data migration or irreversible operation.
