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

## Основные команды

### Запуск всех воркфлоу
```bash
act
```

### Запуск конкретного воркфлоу
```bash
act -j <job-name>
```

### Просмотр доступных воркфлоу и джобов
```bash
act --list
```

### Запуск с секретами
```bash
act --secret-file .secrets
```

### Запуск воркфлоу с событием workflow_dispatch
```bash
act workflow_dispatch
```

Или с указанием конкретного джоба:
```bash
act workflow_dispatch -j <job-name>
```

Эта команда симулирует ручной запуск воркфлоу через GitHub UI (workflow_dispatch событие). Полезно для тестирования воркфлоу, которые запускаются вручную или по расписанию.

## Что такое workflow_dispatch триггер

`workflow_dispatch` - это триггер GitHub Actions, который позволяет запускать workflow **вручную**:

- Через GitHub UI: в разделе "Actions" репозитория есть кнопка "Run workflow"
- Через GitHub API: программным способом
- С возможностью передачи входных параметров при запуске

### Пример использования в workflow файле:
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
        - staging
        - production
```

В вашем проекте все workflow (build, component-tests, e2e) используют только `workflow_dispatch`, то есть запускаются только вручную, а не автоматически на push/PR.

**Отличие от `act -j <job-name>`:**
- `act -j <job-name>` запускает конкретный job из любого workflow файла (игнорируя триггеры)
- `act workflow_dispatch` запускает все jobs в workflow'ах, которые имеют триггер `workflow_dispatch`
- `act workflow_dispatch -j <job-name>` запускает только указанный job из workflow'ов с триггером `workflow_dispatch`

## Доступные воркфлоу в проекте

Проект содержит следующие GitHub Actions воркфлоу:

- **build.yml** - Сборка и тестирование
- **component-tests.yml** - Тестирование компонентов
- **e2e.yml** - End-to-end тесты

## Примеры использования

### Тестирование сборки
```bash
act -j build
```

### Тестирование компонентных тестов
```bash
act -j component-tests
```

### Тестирование e2e
```bash
act -j e2e
```

## Конфигурация

Act использует Docker для запуска контейнеров. Убедитесь, что Docker запущен.

Для работы с секретами создайте файл `.secrets`:
```
GITHUB_TOKEN=your_token_here
SUPABASE_URL=your_url_here
SUPABASE_ANON_KEY=your_key_here
```

## Полезные опции

- `--verbose` - Подробный вывод
- `--dry-run` - Показать что будет выполнено без запуска
- `--container-architecture linux/amd64` - Архитектура контейнера
- `--artifact-server-path /tmp/artifacts` - Путь для артефактов

## Troubleshooting

- Если возникают проблемы с Docker, проверьте что Docker Desktop запущен
- Для больших проектов может потребоваться увеличить ресурсы Docker
- Некоторые действия могут требовать специфических секретов или переменных окружения
