---
phase: deployment
title: Deployment Strategy
description: Define deployment process, infrastructure, and release procedures for the modern editor redesign.
---

# Deployment Strategy

## Infrastructure
- **Hosting Platform**: Vercel/Next.js deployment.
- **Environments**: Standard dev, preview (staging), and production.

## Deployment Pipeline
- **Build Process**: Standard `npm run build` compiling Tailwind CSS v4 and Next.js static and dynamic routes.
- **CI/CD Pipeline**: GitHub Actions running lint, type checks, and Cypress component tests on pull request.

## Database Migrations
- **Schema changes**: None. This is a purely visual/frontend change.

## Secrets Management
- **Environment variables**: No new variables needed.

## Rollback Plan
- Reverting the Git commit on the main branch will trigger an automatic clean redeployment of the previous stable styles.
