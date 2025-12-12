---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

**Prerequisites:**
- Node.js и npm уже установлены
- Supabase project уже настроен
- Tiptap уже в проекте

**Install dependencies:**
```bash
npm install @tiptap/extension-image
```

**Supabase Storage setup:**
```bash
# В Supabase Dashboard:
# 1. Storage → Create bucket: "note-images"
# 2. Make bucket public
# 3. Apply RLS policies (see SQL below)
```

**Environment variables:**
```env
# Already configured
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Code Structure
**How is the code organized?**

```
lib/
  enex/
    parser.ts           # XML parsing
    converter.ts        # HTML conversion
    image-processor.ts  # Image upload
    note-creator.ts     # DB operations
    types.ts            # TypeScript types (if needed)
    
components/
  ImportButton\.tsx              # Main import button
  ImportProgressDialog\.tsx      # Progress UI
  UnsupportedFeaturesDialog\.tsx # Warning dialog
  RichTextEditor\.tsx            # Update with Image extension
  
supabase/
  migrations/
    YYYYMMDD_create_note_images_bucket.sql
```

**Naming conventions:**
- Services: PascalCase classes (`EnexParser`, `ImageProcessor`)
- Components: PascalCase (`ImportButton`)
- Files: kebab-case (`image-processor.ts`)
- Functions: camelCase (`parseNote`, `uploadImage`)

## Implementation Notes
**Key technical details to remember:**

### Core Features

#### Feature 1: EnexParser
**File:** `lib/enex/parser.ts`

```javascript
export class EnexParser {
  /**
   * Parse .enex file
   * @param {File} file - .enex file from input
   * @returns {Promise<ParsedNote[]>}
   */
  async parse(file) {
    try {
      const text = await file.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/xml')
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror')
      if (parserError) {
        throw new Error('Invalid XML format')
      }
      
      const notes = doc.querySelectorAll('note')
      return Array.from(notes).map(note => this.parseNote(note))
    } catch (error) {
      throw new Error(`Failed to parse .enex file: ${error.message}`)
    }
  }
  
  parseNote(noteElement) {
    const title = noteElement.querySelector('title')?.textContent || 'Untitled'
    const contentCDATA = noteElement.querySelector('content')?.textContent || ''
    
    // Extract HTML from CDATA
    const content = this.extractContentFromCDATA(contentCDATA)
    
    // Parse dates
    const created = this.parseDate(noteElement.querySelector('created')?.textContent)
    const updated = this.parseDate(noteElement.querySelector('updated')?.textContent)
    
    // Parse tags
    const tags = Array.from(noteElement.querySelectorAll('tag'))
      .map(tag => tag.textContent.trim())
      .filter(Boolean)
    
    // Parse resources (images)
    const resources = this.parseResources(noteElement)
    
    return { title, content, created, updated, tags, resources }
  }
  
  extractContentFromCDATA(cdata) {
    // CDATA contains: <?xml...?><!DOCTYPE...><en-note>content</en-note>
    const match = cdata.match(/<en-note[^>]*>([\s\S]*)<\/en-note>/)
    return match ? match[1] : cdata
  }
  
  parseDate(dateString) {
    if (!dateString) return new Date()
    // Evernote format: 20230101T120000Z
    const year = dateString.substr(0, 4)
    const month = dateString.substr(4, 2)
    const day = dateString.substr(6, 2)
    const hour = dateString.substr(9, 2)
    const minute = dateString.substr(11, 2)
    const second = dateString.substr(13, 2)
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`)
  }
  
  parseResources(noteElement) {
    const resources = noteElement.querySelectorAll('resource')
    return Array.from(resources).map(resource => {
      const data = resource.querySelector('data')?.textContent || ''
      const mime = resource.querySelector('mime')?.textContent || 'image/png'
      const width = resource.querySelector('width')?.textContent
      const height = resource.querySelector('height')?.textContent
      const fileName = resource.querySelector('file-name')?.textContent
      
      return {
        data: data.trim(),
        mime,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        fileName
      }
    })
  }
}
```

#### Feature 2: ContentConverter
**File:** `lib/enex/converter.ts`

```javascript
export class ContentConverter {
  constructor(imageProcessor) {
    this.imageProcessor = imageProcessor
  }
  
  /**
   * Convert ENML to Tiptap-compatible HTML
   * @param {string} html - HTML from .enex
   * @param {ParsedResource[]} resources - Images
   * @param {string} userId - For image upload
   * @param {string} noteId - For image upload
   * @returns {Promise<string>}
   */
  async convert(html, resources, userId, noteId) {
    let converted = html
    
    // Replace unsupported elements with placeholders
    converted = this.replaceUnsupported(converted)
    
    // Process images
    converted = await this.processImages(converted, resources, userId, noteId)
    
    // Clean up ENML-specific tags
    converted = this.cleanupENML(converted)
    
    return converted
  }
  
  replaceUnsupported(html) {
    const replacements = {
      '<table': '[Unsupported content: Table]<div style="display:none"><table',
      '</table>': '</table></div>',
      '<pre': '[Unsupported content: Code Block]<div style="display:none"><pre',
      '</pre>': '</pre></div>',
      '<en-todo': '[Unsupported content: Checkbox]<div style="display:none"><en-todo',
      '</en-todo>': '</en-todo></div>',
      '<en-crypt': '[Unsupported content: Encrypted Text]<div style="display:none"><en-crypt',
      '</en-crypt>': '</en-crypt></div>'
    }
    
    let result = html
    for (const [pattern, replacement] of Object.entries(replacements)) {
      result = result.replace(new RegExp(pattern, 'gi'), replacement)
    }
    
    return result
  }
  
  async processImages(html, resources, userId, noteId) {
    if (!resources || resources.length === 0) return html
    
    // Create resource map by hash (Evernote uses hash to reference images)
    const resourceMap = new Map()
    
    // Upload all images
    const uploadPromises = resources.map(async (resource, index) => {
      try {
        const url = await this.imageProcessor.upload(
          resource.data,
          resource.mime,
          userId,
          noteId,
          `image_${index}`
        )
        resourceMap.set(index, url)
        return url
      } catch (error) {
        console.error('Failed to upload image:', error)
        return null
      }
    })
    
    await Promise.all(uploadPromises)
    
    // Replace <en-media> tags with <img> tags
    let result = html
    const mediaRegex = /<en-media[^>]*hash="([^"]*)"[^>]*\/>/gi
    let match
    let mediaIndex = 0
    
    while ((match = mediaRegex.exec(html)) !== null) {
      const url = resourceMap.get(mediaIndex)
      if (url) {
        const imgTag = `<img src="${url}" alt="Image ${mediaIndex + 1}" />`
        result = result.replace(match[0], imgTag)
      } else {
        result = result.replace(match[0], '[Image failed to upload]')
      }
      mediaIndex++
    }
    
    return result
  }
  
  cleanupENML(html) {
    // Remove ENML-specific attributes
    return html
      .replace(/<en-note[^>]*>/gi, '<div>')
      .replace(/<\/en-note>/gi, '</div>')
      .replace(/style="[^"]*"/gi, '') // Remove inline styles if needed
  }
}
```

#### Feature 3: ImageProcessor
**File:** `lib/enex/image-processor.ts`

```javascript
import { createClient } from '@ui/web/adapters/supabaseClient'

export class ImageProcessor {
  constructor() {
    this.supabase = createClient()
    this.bucket = 'note-images'
  }
  
  /**
   * Upload image to Supabase Storage
   * @param {string} base64 - Base64 encoded image
   * @param {string} mime - MIME type
   * @param {string} userId - User ID
   * @param {string} noteId - Note ID
   * @param {string} fileName - File name
   * @returns {Promise<string>} Public URL
   */
  async upload(base64, mime, userId, noteId, fileName) {
    try {
      // Convert base64 to Blob
      const blob = this.base64ToBlob(base64, mime)
      
      // Generate file path
      const ext = mime.split('/')[1] || 'png'
      const timestamp = Date.now()
      const path = `${userId}/${noteId}/${timestamp}_${fileName}.${ext}`
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, blob, {
          contentType: mime,
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucket)
        .getPublicUrl(path)
      
      return publicUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      throw new Error(`Failed to upload image: ${error.message}`)
    }
  }
  
  base64ToBlob(base64, mime) {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    
    // Decode base64
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return new Blob([bytes], { type: mime })
  }
}
```

#### Feature 4: NoteCreator
**File:** `lib/enex/note-creator.ts`

```javascript
import { createClient } from '@ui/web/adapters/supabaseClient'

export class NoteCreator {
  constructor() {
    this.supabase = createClient()
  }
  
  /**
   * Create note in Supabase
   * @param {ParsedNote} note
   * @param {string} userId
   * @returns {Promise<string>} Note ID
   */
  async create(note, userId) {
    try {
      // Check for duplicates
      const title = await this.checkDuplicate(note.title, userId)
      
      // Insert note
      const { data, error } = await this.supabase
        .from('notes')
        .insert({
          user_id: userId,
          title,
          description: note.content,
          tags: note.tags,
          created_at: note.created.toISOString(),
          updated_at: note.updated.toISOString()
        })
        .select('id')
        .single()
      
      if (error) throw error
      
      return data.id
    } catch (error) {
      console.error('Note creation failed:', error)
      throw new Error(`Failed to create note: ${error.message}`)
    }
  }
  
  async checkDuplicate(title, userId) {
    const { data, error } = await this.supabase
      .from('notes')
      .select('title')
      .eq('user_id', userId)
      .eq('title', title)
      .maybeSingle()
    
    if (error) {
      console.error('Duplicate check failed:', error)
      return title
    }
    
    // If duplicate exists, add [duplicate] prefix
    return data ? `[duplicate] ${title}` : title
  }
}
```

### Patterns & Best Practices

**Pattern 1: Error Handling**
- Always wrap async operations in try-catch
- Provide descriptive error messages
- Don't fail entire import on single note error
- Log errors for debugging

**Pattern 2: Progress Tracking**
- Use React state for progress
- Update UI after each file/note
- Debounce updates for performance

**Pattern 3: Memory Management**
- Process files sequentially
- Clear large variables after use
- Limit concurrent image uploads

**Pattern 4: Graceful Degradation**
- Replace unsupported elements with placeholders
- Continue import even if images fail
- Provide fallback for missing data

## Integration Points
**How do pieces connect?**

**Import Flow:**
```
User clicks Import Button
  → File Input opens
  → User selects .enex files
  → Show Unsupported Features Dialog
  → User confirms
  → For each file:
      → EnexParser.parse(file)
      → For each note:
          → Generate note ID (uuid)
          → ContentConverter.convert(note, userId, noteId)
          → NoteCreator.create(note, userId)
          → Update progress
  → Show success notification
  → Refresh notes list
```

## Error Handling
**How do we handle failures?**

**Error types:**
1. **File reading errors** → Show error toast, skip file
2. **XML parsing errors** → Show error toast, skip file
3. **Image upload errors** → Log error, use placeholder, continue
4. **DB insert errors** → Show error toast, skip note, continue
5. **Network errors** → Retry 3 times, then fail

**Error messages:**
- "Failed to read file: {filename}"
- "Invalid .enex format in {filename}"
- "Failed to import note: {title}"
- "Network error, please try again"

## Performance Considerations
**How do we keep it fast?**

**Optimization strategies:**
- Parse XML once per file
- Batch image uploads (max 5 concurrent)
- Use Web Workers for large files (future)
- Debounce progress updates (every 100ms)

**Memory management:**
- Process files sequentially
- Clear parsed data after processing
- Limit file size (warn at 100MB)

## Security Notes
**What security measures are in place?**

**Input validation:**
- Check file extension (.enex only)
- Validate MIME type
- Sanitize HTML content (prevent XSS)
- Limit file size

**Storage security:**
- RLS policies on note-images bucket
- User can only upload to their own folder
- Public read access for images

**SQL for RLS:**
```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Images are publicly readable
CREATE POLICY "Images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-images');
```

