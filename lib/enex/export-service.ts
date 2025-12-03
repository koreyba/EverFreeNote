import { EnexBuilder } from './enex-builder'
import { ImageDownloader } from './image-downloader'
import type { ExportNote, ExportProgress, ExportResource } from './export-types'
import { NoteService } from '../services/notes'

export class ExportService {
  private readonly noteService: NoteService
  private readonly enexBuilder: EnexBuilder
  private readonly imageDownloader: ImageDownloader
  private readonly CONCURRENCY_LIMIT = 5
  private readonly FETCH_BATCH_SIZE = 150

  constructor(noteService: NoteService, enexBuilder: EnexBuilder, imageDownloader: ImageDownloader) {
    this.noteService = noteService
    this.enexBuilder = enexBuilder
    this.imageDownloader = imageDownloader
  }

  async exportNotes(
    noteIds: string[],
    userId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<{ blob: Blob; fileName: string; skippedImages: number }> {
    onProgress?.({
      currentNote: 0,
      totalNotes: noteIds.length,
      currentStep: 'fetching',
      message: 'Загрузка заметок',
    })

    const notes = await this.fetchNotesInBatches(noteIds, userId)
    if (!notes.length) {
      const emptyXml = this.enexBuilder.build([])
      return {
        blob: new Blob([emptyXml], { type: 'application/xml' }),
        fileName: this.generateFileName(),
        skippedImages: 0,
      }
    }
    const exportNotes: ExportNote[] = notes.map((note, index) => {
      onProgress?.({
        currentNote: index + 1,
        totalNotes: notes.length,
        currentStep: 'fetching',
        message: `Preparing note "${note.title}"`,
      })

      return {
        title: note.title ?? 'Untitled',
        content: note.description ?? '',
        created: new Date(note.created_at),
        updated: new Date(note.updated_at ?? note.created_at),
        tags: note.tags ?? [],
        resources: [],
      }
    })

    let skippedImages = 0

    const processedNotes: ExportNote[] = []
    for (let i = 0; i < exportNotes.length; i++) {
      const note = exportNotes[i]

      onProgress?.({
        currentNote: i + 1,
        totalNotes: exportNotes.length,
        currentStep: 'downloading-images',
        message: `Обработка изображений (${i + 1}/${exportNotes.length})`,
      })

      const { resources, enmlContent, skipped } = await this.processImages(note.content)
      skippedImages += skipped

      processedNotes.push({
        ...note,
        content: enmlContent,
        resources,
      })
    }

    onProgress?.({
      currentNote: notes.length,
      totalNotes: notes.length,
      currentStep: 'building-xml',
      message: 'Формирование .enex',
    })

    const xml = this.enexBuilder.build(processedNotes)
    const blob = new Blob([xml], { type: 'application/xml' })
    const fileName = this.generateFileName()

    onProgress?.({
      currentNote: notes.length,
      totalNotes: notes.length,
      currentStep: 'complete',
      message: 'Экспорт завершён',
    })

    return {
      blob,
      fileName,
      skippedImages,
    }
  }

  private async fetchNotesInBatches(noteIds: string[], userId: string) {
    if (!noteIds.length) return []

    const batches: string[][] = []
    for (let i = 0; i < noteIds.length; i += this.FETCH_BATCH_SIZE) {
      batches.push(noteIds.slice(i, i + this.FETCH_BATCH_SIZE))
    }

    const results: Awaited<ReturnType<NoteService['getNotesByIds']>>[] = []
    for (const batch of batches) {
      const chunk = await this.noteService.getNotesByIds(batch, userId)
      results.push(chunk)
    }

    // Preserve input order
    const order = new Map(noteIds.map((id, index) => [id, index]))
    return results
      .flat()
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  }

  private async processImages(html: string): Promise<{ resources: ExportResource[]; enmlContent: string; skipped: number }> {
    const urls = this.imageDownloader.extractImageUrls(html)
    if (urls.length === 0) {
      return { resources: [], enmlContent: html, skipped: 0 }
    }

    console.info('[export-service] processing images', { count: urls.length, sample: urls.slice(0, 3) })

    const downloaded: Array<{ resource: ExportResource | null }> = []
    for (let i = 0; i < urls.length; i += this.CONCURRENCY_LIMIT) {
      const batch = urls.slice(i, i + this.CONCURRENCY_LIMIT)
      const results = await Promise.all(
        batch.map(async (url) => {
          const resource = await this.imageDownloader.downloadImage(url)
          return { resource }
        })
      )
      downloaded.push(...results)
    }

    let skipped = 0
    const resources: ExportResource[] = []

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const images = Array.from(doc.querySelectorAll('img'))

    images.forEach((img, index) => {
      const downloadResult = downloaded[index]
      const resource = downloadResult?.resource

      if (resource) {
        resources.push(resource)
        const enMedia = doc.createElement('en-media')
        enMedia.setAttribute('type', resource.mime)
        enMedia.setAttribute('hash', resource.hash)
        img.replaceWith(enMedia)
      } else {
        skipped += 1
        // keep original <img> so at least external link remains
      }
    })

    let enmlContent = doc.body.innerHTML
    enmlContent = enmlContent.replace(/<en-media([^>]*)><\/en-media>/gi, '<en-media$1/>')

    return { resources, enmlContent, skipped }
  }

  private generateFileName(date: Date = new Date()): string {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `everfreenote-export-${year}${month}${day}-${hours}${minutes}${seconds}.enex`
  }
}
