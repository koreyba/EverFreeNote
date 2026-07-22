---
phase: deployment
title: Deployment Strategy - TSConfig Architecture Setup
description: CI/CD workflow updates for SonarQube scanner and type checks.
---

# Deployment Strategy - TSConfig Architecture Setup

## Deployment Pipeline
- `.github/workflows/sonar.yml` updated to run `npm ci --ignore-scripts` and `npm --prefix ui/mobile ci --ignore-scripts` before SonarQube scan.
- Sonar properties updated to track canonical tsconfig paths (`tsconfig.json`, `core/tsconfig.json`, `ui/mobile/tsconfig.json`).
