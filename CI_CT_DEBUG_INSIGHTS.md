# CI Component Tests Debug Insights
_Last updated: 2026-02-17_

## Confirmed
- Проблема воспроизводится только в GitHub Actions (CT), локально не воспроизводится.
- Симптом нестабилен: случайные spec-файлы дают `Tests: 0`.
- В проблемных spec-файлах тесты реально есть (`describe/it` присутствуют).
- При части `0 tests` webpack-компиляция успешна и JS-ассеты отдаются с `200`.
- `Cannot stat .../Cache/Cache_Data/...` встречается и в успешных спеках; считаем шумом.
- Есть полный прогон с `zero-tests = 11` при `Invalid Host/Origin header = 0`, `Disconnected = 0`, `uncaught:exception (propagated) = 0`.
- В падающих спеках есть `cypress:server:project received runnables null` прямо перед `0 passing`.
- В успешных спеках есть `cypress:server:project received runnables { ... }`.
- В Cypress 15.9.0 `normalizeAll(...)` возвращает `undefined`, если в `runner.suite` нет тестов (`hasTests === false`).
- Следовательно, `runnables null` — это следствие пустого Mocha suite на момент нормализации, а не само по себе сетевой сбой.
- По паре логов (`FontSize` pass vs `Form` zero-tests): в обоих кейсах есть `socket connected`, а в проблемном кейсе нет явного `socket-disconnect/socket-error` вокруг `runnables null`.

## Instrumentation Added
- CI пишет полный лог в `cypress/cypress-run.log` и загружает его артефактом.
- Добавлены маркеры `[ct-debug] before:spec`, `[ct-debug] after:spec`, `[ct-debug] zero-tests`.
- Добавлен шаг `Analyze CT debug markers` в `GITHUB_STEP_SUMMARY`.
- В summary добавлен авто-блок `Zero-Tests Per-Spec Diagnostics` (сжатый срез по каждому zero-tests spec).
- Расширены DEBUG namespace: webpack/server/network + `cypress:server:socket-base`.
- Добавлен CI-only probe в support:
- `[ct-debug] support-loaded`
- `[ct-debug] runtime-config`
- `[ct-debug] runnables-probe` (immediate / t+0ms / t+200ms)
- `[ct-debug] first-test`
- `[ct-debug] window-error`
- `[ct-debug] unhandled-rejection`

## Hypotheses Log
_Statuses: `in_progress` | `confirmed` | `rejected`_

- `rejected` `H-001`: проблема в пустых/невалидных spec-файлах.
- Проверка: в проблемных файлах есть валидные `describe/it`.

- `rejected` `H-002`: проблема из-за глобального подавления ошибок `uncaught:exception`.
- Проверка: подавляются только `ResizeObserver*`; остальные ошибки не подавляются.

- `rejected` `H-003`: корень в `Invalid Host/Origin header` + reconnect.
- Проверка: был прогон с `zero-tests > 0` и нулем по этим маркерам.

- `in_progress` `H-004`: сбой в стадии регистрации/инициализации spec после компиляции.
- Сигнал: compile/network OK, но `tests=0`.

- `in_progress` `H-005`: сбой между `before:spec` и фактической регистрацией Mocha runnables.
- Сигнал: `before:spec` есть, `after:spec tests=0`.

- `confirmed` `H-006`: ключевой симптом — `runnables null` из runner слоя.

- `in_progress` `H-007`: upstream-причина до `normalizeAll` (suite пустой к моменту нормализации).

- `in_progress` `H-008`: spec не исполняется/падает до деклараций тестов.

- `in_progress` `H-009`: spec сначала регистрируется, но suite очищается/фильтруется до `set:runnables:and:maybe:record:tests`.

- `in_progress` `H-010`: проблема не связана с разрывом socket-соединения; основной сбой внутри runner lifecycle/spec evaluation.

## Next Run Checklist
- Сравнить для одних и тех же namespace:
- проблемный spec (`runnables null`)
- успешный spec (`runnables { ... }`)
- Проверить в проблемных спеках последовательность:
- `[ct-debug] runtime-config`
- `[ct-debug] runnables-probe ... tests=...`
- `[ct-debug] first-test` (есть/нет)
- `cypress:server:project received runnables null`
- Проверить `socket-base socket-disconnect/socket-error` рядом по времени с `runnables null`.
