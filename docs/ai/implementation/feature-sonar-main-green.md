---
phase: implementation
title: Main Sonar Quality Gate Implementation
---

# Changes

Based on main 4c734702412c5b948fc268b37a93043d84a61378.
OAuth now awaits NavigationAdapter. Two new tests first demonstrated premature
success and lost rejection; all five adapter cases pass after the change.

Explicit void annotations preserve existing background behavior in note/tag
cache invalidations, FTS refetch, export page loading, auth callback startup
and the audit CLI. The installed QueryClient.refetchQueries uses catch(noop)
when throwOnError is absent; invalidateQueries delegates to that method.
Export/auth/audit functions already catch their own errors. The audit script
is not executed against a real database during validation.

Both Sonar scanner workflows pass sonar.qualitygate.wait=true in addition to
unchanged detected LCOV paths. This makes the job reflect the service gate
instead of only upload success. Rules, thresholds, new-code period, fixtures,
assertions, retries, timeouts and coverage inclusion remain unchanged.

False-positive review remains pending; no issue is accepted as debt or hidden.
