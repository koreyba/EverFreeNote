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
- Доп. падение `ui/ExportProgressDialog.cy.tsx` подтверждает тот же паттерн: `socket connected` + успешные asset requests + `received runnables null` + `Tests: 0`.
- Причина отсутствия новых browser-маркеров (`support-loaded`, `runnables-probe`) в прошлом ране: gating был через `Cypress.env('CI')`, который в browser runtime часто пустой.
- В следующем прогоне: `zero-tests = 5`, но `support-loaded/runtime-config/runnables-probe/first-test = 0` и `received runnables null = 0`.
- Вывод: этот прогон нельзя использовать для проверки browser-probe гипотез; либо изменения не попали в ран, либо browser-side probe не печатался.
- Также выявлен дефект парсера summary: per-spec срез фильтровал только строки с полным путём spec, из-за этого `received runnables null` мог не попасть в блок даже если был в логе.

## Instrumentation Added
- CI пишет полный лог в `cypress/cypress-run.log` и загружает его артефактом.
- Добавлены маркеры `[ct-debug] before:spec`, `[ct-debug] after:spec`, `[ct-debug] zero-tests`.
- Добавлен маркер версии инструментирования: `[ct-debug] instrumentation-version ct-debug-2026-02-17-v3`.
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
- Probe gating removed: browser-side probe now logs unconditionally to avoid false negatives in CI.
- Summary now warns when `zero-tests > 0` but `support-loaded = 0`.
- Summary also warns when instrumentation version marker is missing (stale run safeguard).
- Summary per-spec parser fixed: now extracts full `Running: <spec>` block and then filters markers inside it.
- Workflow switched to focused debug mode: runs only known flaky specs via `CT_DEBUG_SPEC_LIST`.

## Focused Spec List (Current)
- `cypress/component/features/notes/NoteView.cy.tsx`
- `cypress/component/ui/ExportProgressDialog.cy.tsx`
- `cypress/component/ui/Tabs.cy.tsx`
- `cypress/component/ui/web/adapters/storage.cy.ts`
- `cypress/component/unit/searchUtils.cy.ts`
- `cypress/component/editor/Form.cy.tsx`
- `cypress/component/editor/Input.cy.tsx`
- `cypress/component/editor/RichTextEditorPaste.cy.tsx`
- `cypress/component/VirtualNoteList.cy.tsx`
- `cypress/component/core/utils/search.cy.ts`

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
- `in_progress` `H-011`: some runs produce zero-tests while low-level debug markers are absent; instrumentation capture path itself is flaky/stale between runs.
- `confirmed` `H-012`: summary parser bug could hide `received runnables null` despite its presence in raw log.

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
