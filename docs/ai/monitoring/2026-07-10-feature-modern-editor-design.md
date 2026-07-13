---
phase: monitoring
title: Monitoring & Observability
description: Define monitoring strategy, metrics, and observability for the modern editor redesign.
---

# Monitoring & Observability

## Key Metrics
- **Performance Metrics**: Monitor Next.js core web vitals (Largest Contentful Paint, Cumulative Layout Shift, Interaction to Next Paint) to ensure the redesigned layout does not degrade client performance.
- **Error Metrics**: Monitor client-side JS crash rates (via Sentry or equivalent console log tracker) to capture any component-level rendering issues.

## Monitoring Tools
- **Vercel Analytics / Speed Insights**: For core web vitals.
- **Sentry**: For exception tracking and runtime error monitoring.

## Logging Strategy
- Log client-side exceptions and editor initialization failures. Avoid logging sensitive note content or user emails.
