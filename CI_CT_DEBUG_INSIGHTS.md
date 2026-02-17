# CI Component Tests Debug Insights
_Last updated: 2026-02-17_

## Confirmed
- Проблема воспроизводится в GitHub Actions (CT), локально не воспроизводится.
- Симптом нестабилен: разные spec-файлы случайно дают `Tests: 0`.
- В проблемных файлах тесты реально есть (`describe/it`), это не пустые спеки.
- В части кейсов перед `0 tests` webpack успешно компилирует spec, а запросы к JS-ассетам возвращают `200`.
- Есть кейсы `0 tests` без `uncaught:exception` в логе.
- `Invalid Host/Origin header` + `Disconnected/Reconnect` встречается рядом с частью `0 tests`, но не со всеми.
- `Cannot stat .../Cache/Cache_Data/...` встречается и в успешных спеках; считаем это шумом.
- Глобальный `uncaught:exception` подавляет только `ResizeObserver*`; остальные ошибки не подавляются.
- По итогам полного CI-прогона: `zero-tests = 11`, при этом `Invalid Host/Origin header = 0`, `Disconnected = 0`, `uncaught:exception (propagated) = 0`.

## Instrumentation Added
- В CI включен расширенный `DEBUG` для webpack/server/network.
- Полный вывод раннера сохраняется в `cypress/cypress-run.log` и загружается как artifact.
- Добавлены маркеры `[ct-debug] before:spec` / `[ct-debug] after:spec` + явный `[ct-debug] zero-tests`.
- Добавлен шаг `Analyze CT debug markers` в `GITHUB_STEP_SUMMARY`.

## Hypotheses Log
_Statuses: `in_progress` | `confirmed` | `rejected`_

- `rejected` `H-001`: Проблема вызвана пустыми/невалидными spec-файлами.
  - Проверка: в проблемных spec-файлах есть валидные `describe/it`.
- `rejected` `H-002`: Проблема вызвана глобальным подавлением ошибок (`uncaught:exception`).
  - Проверка: глобально подавляются только `ResizeObserver*`; остальные ошибки не подавляются.
- `rejected` `H-003`: Корень в `Invalid Host/Origin header` и последующем reconnect.
  - Проверка: есть полный прогон с `zero-tests = 11` и нулем по `Invalid Host/Origin`/`Disconnected`.
- `in_progress` `H-004`: Сбой в стадии регистрации/инициализации spec в Cypress CT runtime после успешной компиляции.
  - Наблюдение: есть `0 tests` при успешной сборке и `200` по JS-ассетам.
- `in_progress` `H-005`: Сбой происходит между `before:spec` и выполнением spec-кода (runner-ct / spec controller / iframe handshake).
  - Наблюдение: `before:spec` есть, compile OK, сетевые запросы 200, но `after:spec tests=0`.

## Next
- Дождаться полного прогона и сверить `CT Debug Markers` со списком `zero-tests`.
- При необходимости добавить более узкие debug namespaces (`runner-ct`, `controllers:spec`, `iframes`, `socket-ct`, `open_project`).
