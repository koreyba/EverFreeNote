# Локальное тестирование GitHub Actions с помощью Act

Проект использует [act](https://github.com/nektos/act) для локального тестирования GitHub Actions пайплайнов.

## Установка

```bash
# Установка через npm (рекомендуется для Node.js проектов)
npm install -g @nektos/act

# Или установка через brew (macOS)
brew install act

# Или скачайте бинарный файл с GitHub releases
```

## Команды для запуска workflows

### Посмотреть список всех jobs
```bash
act --list
```

### Запустить все workflow_dispatch workflows
```bash
act workflow_dispatch
```

### Запустить конкретные jobs

```bash
# Build
act workflow_dispatch -j build

# Component Tests
act workflow_dispatch -j test-component

# E2E Tests
act workflow_dispatch -j test-e2e
```

### С дополнительными опциями

```bash
# С подробным выводом
act workflow_dispatch -j build --verbose

# Dry-run (показать что будет выполнено)
act workflow_dispatch -j build --dry-run

# С секретами (если нужны)
act workflow_dispatch -j test-e2e --secret-file .secrets
```

## Важно

- Все 3 workflow используют `workflow_dispatch` триггер (ручной запуск)
- Имена jobs: `build`, `test-component`, `test-e2e`
- Для E2E нужен Docker (для Supabase контейнера)
- Act использует Docker для запуска контейнеров. Убедитесь, что Docker запущен.

## Troubleshooting

- Если возникают проблемы с Docker, проверьте что Docker Desktop запущен
- Для больших проектов может потребоваться увеличить ресурсы Docker
