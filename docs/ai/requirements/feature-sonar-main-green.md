---
phase: requirements
title: Main Sonar Quality Gate Requirements
---

# Main Sonar quality gate

Make the actual SonarCloud main quality gate green, preserving its rules,
thresholds, baseline period, source scope and coverage. The previous-version
period starts 2026-03-05. At main 4c734702412 it reports C reliability/C security,
13 floating-promise findings and two findings requiring evidence-based review.

- Propagate asynchronous OAuth navigation failure and completion to its caller.
- Keep already-handled UI refreshes asynchronous without blocking note saves.
- Review only proven false positives with retained rationale and audit history.
- Make PR/main scanner jobs wait for the remote quality-gate result.
- Merge only after fresh remaining PR checks pass; verify actual main gate OK,
  not just successful report upload. Keep all 1,146 component cases.
