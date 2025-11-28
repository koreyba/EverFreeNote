# 🔧 GitHub MCP Server Setup для Cursor

## ✅ Что сделано

Установлен **GitHub MCP Server** в режиме **remote** (через Docker).

---

## 📋 Следующие шаги

### 1. Создай GitHub Personal Access Token

1. Открой [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Нажми **"Generate new token (classic)"**
3. Дай название: `Cursor MCP Server`
4. Выбери срок действия: `No expiration` (или на свой выбор)
5. Выбери scopes (разрешения):

   **Минимальные (read-only):**
   - ✅ `repo` (Full control of private repositories)
     - `repo:status`
     - `repo_deployment`
     - `public_repo`
     - `repo:invite`
   - ✅ `read:org` (Read org and team membership)
   - ✅ `read:user` (Read user profile data)
   - ✅ `user:email` (Access user email addresses)

   **Для полного функционала (write):**
   - ✅ Всё выше +
   - ✅ `workflow` (Update GitHub Action workflows)
   - ✅ `write:discussion` (Write team discussions)

6. Нажми **"Generate token"**
7. **Скопируй токен** (он больше не будет показан!)

---

### 2. Добавь токен в конфиг

Файл уже создан: `C:\Users\denys.koreiba\AppData\Roaming\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`

**Замени `YOUR_GITHUB_TOKEN_HERE` на свой токен:**

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server:latest"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_ваш_токен_здесь"
      }
    }
  }
}
```

---

### 3. Перезапусти Cursor

1. Закрой Cursor полностью
2. Открой снова
3. GitHub MCP Server должен подключиться автоматически

---

## 🎯 Что можно делать с GitHub MCP Server

### Repositories
- Создавать, обновлять, удалять репозитории
- Клонировать репозитории
- Искать репозитории
- Управлять ветками, тегами

### Issues & Pull Requests
- Создавать, обновлять, закрывать issues
- Создавать, обновлять, мержить PR
- Добавлять комментарии
- Управлять labels, assignees

### Code
- Создавать, обновлять, удалять файлы
- Искать код
- Получать содержимое файлов
- Создавать коммиты

### Actions
- Просматривать workflow runs
- Запускать workflows
- Скачивать артефакты

### И многое другое!
- Stargazers
- Forks
- Security advisories
- Discussions
- Projects

---

## 🔍 Проверка установки

После перезапуска Cursor, попробуй спросить:

```
"Покажи мои последние репозитории на GitHub"
"Создай новый issue в репозитории EverFreeNote"
"Покажи открытые PR в моих репозиториях"
```

Если MCP Server работает, я смогу выполнить эти команды!

---

## 🐛 Troubleshooting

### MCP Server не подключается

1. **Проверь Docker:**
   ```powershell
   docker --version
   docker ps
   ```

2. **Проверь токен:**
   - Убедись что токен скопирован правильно
   - Проверь что токен не истёк
   - Проверь что выбраны нужные scopes

3. **Проверь конфиг:**
   - Путь: `%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
   - Проверь что JSON валидный (нет лишних запятых, кавычки закрыты)

4. **Проверь логи Cursor:**
   - Открой Cursor
   - View → Output → выбери "Claude Dev" или "MCP"

### Docker образ не скачивается

```powershell
# Скачай образ вручную
docker pull ghcr.io/github/github-mcp-server:latest

# Проверь что скачался
docker images | Select-String "github-mcp-server"
```

---

## 📝 Альтернативная конфигурация (read-only)

Если хочешь только читать данные (без изменений):

```json
{
  "mcpServers": {
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "-e",
        "GITHUB_READ_ONLY=1",
        "ghcr.io/github/github-mcp-server:latest"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_ваш_токен_здесь"
      }
    }
  }
}
```

---

## 🔐 Безопасность

**Важно:**
- ❌ Не коммить токен в git!
- ❌ Не делиться токеном!
- ✅ Используй токен с минимальными необходимыми правами
- ✅ Регулярно обновляй токены
- ✅ Удаляй неиспользуемые токены

---

## 📚 Дополнительные ресурсы

- [GitHub MCP Server Repository](https://github.com/github/github-mcp-server)
- [Installation Guide for Cursor](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-cursor.md)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

---

**После настройки токена перезапусти Cursor и я смогу работать с твоими GitHub репозиториями! 🚀**

