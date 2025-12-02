---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide: Evernote Export (.enex)

## Development Setup
**How do we get started?**

- Prerequisites and dependencies
  - Существующий проект EverFreeNote
  - Доступ к Supabase проекту
  - Node.js и npm установлены

- Environment setup steps
  - Убедиться, что все зависимости установлены (`npm install`)
  - Проверить доступность Supabase Storage bucket `note-images`

- Configuration needed
  - Настройки Supabase клиента уже должны быть настроены
  - Проверить RLS политики для доступа к заметкам и изображениям

## Code Structure
**How is the code organized?**

- Directory structure
  ```
  lib/enex/
    ├── export-types.ts          # Types for export functionality
    ├── date-formatter.ts        # Date conversion utilities
    ├── enex-builder.ts         # XML generation for .enex
    ├── image-downloader.ts     # Image downloading and conversion
    └── export-service.ts       # Main export service

  components/
    ├── ExportButton.tsx              # Export button component (in Sidebar)
    ├── ExportSelectionDialog.tsx     # Note selection dialog with cards
    └── ExportProgressDialog.tsx      # Progress dialog component
  ```

- Module organization
  - Все экспортные функции в `lib/enex/`
  - UI компоненты в `components/`
  - Переиспользование существующих типов из `lib/enex/types.ts` где возможно

- Naming conventions
  - Сервисы: PascalCase с суффиксом Service (ExportService)
  - Компоненты: PascalCase (ExportButton)
  - Утилиты: camelCase (dateFormatter)
  - Типы: PascalCase (ExportNote, ExportProgress)

## Implementation Notes
**Key technical details to remember:**

### Core Features

#### Feature 1: Date Formatting
**File:** `lib/enex/date-formatter.ts`

**Implementation approach:**
- Конвертация ISO 8601 timestamp в формат Evernote: `YYYYMMDDTHHMMSSZ`
- Пример: `2023-01-01T12:00:00Z` → `20230101T120000Z`
- Использовать встроенные Date методы для парсинга и форматирования

**Code pattern:**
```typescript
export function formatEvernoteDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}
```

#### Feature 2: XML Generation
**File:** `lib/enex/enex-builder.ts`

**Implementation approach:**
- Использовать строковую конкатенацию для генерации XML (проще и быстрее, чем DOMParser)
- Правильное экранирование XML специальных символов (`<`, `>`, `&`, `"`, `'`)
- Обертка ENML контента в CDATA (<en-note> + <en-media>)
- Встраивание ресурсов с md5-хэшами и линковка через `<en-media type="..." hash="...">`
- Детерминированный порядок тегов/ресурсов для идемпотентности (повторный экспорт ≈ исходный .enex)

**Code pattern:**
```typescript
private escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

private buildNote(note: ExportNote): string {
  const title = this.escapeXml(note.title)
  const content = `<![CDATA[<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note>${note.content}</en-note>
]]>`
  // ... остальная структура
}
```

#### Feature 3: Image Downloading
**File:** `lib/enex/image-downloader.ts`

**Implementation approach:**
- Использовать `fetch()` для скачивания изображений
- Конвертация Response в Blob, затем в ArrayBuffer → md5 → base64 через FileReader
- Определение MIME типа из Content-Type заголовка или расширения файла
- Извлечение размеров (через Image/OffscreenCanvas) при возможности
- Обработка ошибок с возвратом null (graceful degradation)

**Code pattern:**
```typescript
async downloadImage(url: string): Promise<ExportResource | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const hash = md5(arrayBuffer) // md5 в нижнем регистре, hex
    const base64 = await this.blobToBase64(blob)
    const mime = blob.type || this.getMimeFromUrl(url)
    const { width, height } = await this.getImageSize(blob)
    
    return {
      data: base64,
      mime,
      hash,
      width,
      height,
      fileName: this.getFileNameFromUrl(url)
    }
  } catch (error) {
    console.error('Failed to download image:', url, error)
    return null
  }
}
```

#### Feature 4: Export Service
**File:** `lib/enex/export-service.ts`

**Implementation approach:**
- Получение выбранных заметок по их ID через NoteService
- Последовательная обработка заметок с параллельной обработкой изображений внутри каждой заметки
- Batch processing изображений для ограничения параллельных запросов
- Конвертация HTML → ENML: замена <img> на `<en-media type="..." hash="...">` (hash = md5 бинарных данных)
- Graceful degradation при ошибках скачивания изображений
- Детерминированный порядок ресурсов/тегов/заметок для идемпотентности экспорта/импорта
- Генерация XML через EnexBuilder
- Создание Blob с правильным MIME типом (`application/xml`)

**Code pattern:**
```typescript
async exportNotes(
  noteIds: string[],
  userId: string,
  onProgress?: (progress: ExportProgress) => void
): Promise<{ blob: Blob; skippedImages: number }> {
  // 1. Fetch selected notes
  const notes = await this.noteService.getNotesByIds(noteIds, userId)
  let skippedImages = 0
  
  // 2. Process each note
  const exportNotes: ExportNote[] = []
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i]
    onProgress?.({ currentNote: i + 1, totalNotes: notes.length, ... })
    
    // Extract/download images -> resources with md5 hashes, build ENML
    const { resources, skipped, enmlContent } = await this.processImages(
      note.description,
      userId,
      note.id
    )
    skippedImages += skipped
    
    exportNotes.push({
      title: note.title,
      content: enmlContent,
      created: new Date(note.created_at),
      updated: new Date(note.updated_at),
      tags: note.tags || [],
      resources
    })
  }
  
  // 3. Build XML
  const xml = this.enexBuilder.build(exportNotes)
  
  // 4. Create Blob
  return {
    blob: new Blob([xml], { type: 'application/xml' }),
    skippedImages
  }
}
```

#### Feature 5: Export Selection Dialog
**File:** `components/ExportSelectionDialog.tsx`

**Implementation approach:**
- Использование существующего компонента NoteCard с variant="compact"
- Добавление чекбоксов к карточкам
- State для отслеживания выбранных заметок
- Кнопка "Выбрать все" / "Снять выделение"
- Отображение количества выбранных заметок

**Code pattern:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

const handleSelectAll = () => {
  if (selectedIds.size === notes.length) {
    setSelectedIds(new Set())
  } else {
    setSelectedIds(new Set(notes.map(n => n.id)))
  }
}

const handleToggleNote = (noteId: string) => {
  const newSelected = new Set(selectedIds)
  if (newSelected.has(noteId)) {
    newSelected.delete(noteId)
  } else {
    newSelected.add(noteId)
  }
  setSelectedIds(newSelected)
}
```

### Patterns & Best Practices

- **Error Handling:**
  - Использовать try-catch для всех асинхронных операций
  - Логировать ошибки, но не прерывать экспорт из-за отдельных проблем
  - Возвращать понятные сообщения об ошибках пользователю

- **Progress Tracking:**
  - Вызывать callback прогресса после каждой заметки
  - Включать информацию о текущем этапе (fetching, downloading-images, building-xml)
  - Обновлять прогресс после каждого батча изображений

- **Memory Management:**
  - Обрабатывать заметки последовательно, а не загружать все в память
  - Очищать base64 данные после добавления в XML (если используется потоковая обработка)
  - Использовать batch processing для изображений

- **Idempotency & ENML:**
  - Использовать детерминированный порядок (заметки, ресурсы в порядке появления, теги отсортированы) и единый формат дат
  - Хэшировать бинарные данные (md5, hex в нижнем регистре) и подставлять в `<en-media hash="...">`
  - Генерировать ENML одинаковым образом при повторных экспортах, отличия только в `export-date`

- **Testing focus:**
  - Юнит/интеграционные тесты на соответствие md5-хэшей `<en-media>` ↔ `<resource>` и детерминированный вывод
  - Round-trip тест: экспорт → импорт → повторный экспорт ≈ исходный .enex (за исключением `export-date`)

- **Code Style:**
  - Следовать существующим конвенциям проекта
  - Использовать TypeScript строгий режим
  - Добавлять JSDoc комментарии для публичных методов

## Integration Points
**How do pieces connect?**

- API integration details
  - Использование существующего `NoteService` из `lib/services/notes.ts`
  - Добавление нового метода `getNotesByIds()` в NoteService для получения выбранных заметок
  - Использование Supabase Client для доступа к Storage (через ImageDownloader)
  - Использование существующих типов из `lib/enex/types.ts` где возможно

**New NoteService method:**
```typescript
// В lib/services/notes.ts
async getNotesByIds(noteIds: string[], userId: string): Promise<Note[]> {
  if (noteIds.length === 0) return []
  
  const { data, error } = await this.supabase
    .from('notes')
    .select('id, title, description, tags, created_at, updated_at')
    .eq('user_id', userId)
    .in('id', noteIds)
    .order('updated_at', { ascending: false })
  
  if (error) throw error
  return (data as Note[]) || []
}
```

- Database connections
  - Заметки получаются через NoteService (который использует Supabase)
  - RLS политики гарантируют доступ только к собственным заметкам пользователя

- Third-party service setup
  - Supabase Storage уже настроен
  - Публичные URL изображений доступны через `getPublicUrl()`

## Error Handling
**How do we handle failures?**

- Error handling strategy
  - **Сетевые ошибки:** Retry с экспоненциальной задержкой (максимум 3 попытки)
  - **Ошибки скачивания изображений:** Пропускать проблемные изображения, продолжать экспорт
  - **Ошибки генерации XML:** Прерывать экспорт, показывать ошибку пользователю
  - **Ошибки создания файла:** Показывать понятное сообщение об ошибке

- Logging approach
  - Использовать `console.error()` для ошибок
  - Логировать URL проблемных изображений с контекстом (noteId, imageUrl)
  - Логировать количество успешно экспортированных заметок
  - Логировать количество пропущенных изображений
  - Возвращать информацию о пропущенных изображениях для отображения пользователю

- Retry/fallback mechanisms
  - Retry для сетевых ошибок (3 попытки с задержкой)
  - Fallback на пропуск изображений при ошибках
  - Fallback на пустой массив тегов, если теги отсутствуют

## Performance Considerations
**How do we keep it fast?**

- Optimization strategies
  - **Batch processing изображений:** Обрабатывать до 5 изображений параллельно
  - **Последовательная обработка заметок:** Избегать загрузки всех заметок в память одновременно
  - **Ленивая генерация XML:** Генерировать XML по мере обработки заметок (если возможно)

- Caching approach
  - Не кэшировать изображения (они могут измениться)
  - Кэшировать список заметок только на время экспорта

- Query optimization
  - Использовать существующие оптимизированные запросы NoteService
  - Загружать только необходимые поля заметок

- Resource management
  - Освобождать память после обработки каждой заметки
  - Использовать `URL.createObjectURL()` для больших Blob файлов
  - Освобождать объектные URL после скачивания

## Security Notes
**What security measures are in place?**

- Authentication/authorization
  - Экспорт только для аутентифицированных пользователей
  - RLS политики гарантируют доступ только к собственным заметкам
  - Проверка `userId` перед экспортом

- Input validation
  - Валидация данных заметок перед экспортом
  - Санитизация HTML контента (использовать существующий sanitizer)

- Data encryption
  - Изображения передаются через HTTPS
  - Base64 кодирование не является шифрованием, но это стандарт для .enex

- Secrets management
  - Использование существующего Supabase Client (секреты уже настроены)
  - Не хранить чувствительные данные в экспортируемом файле
