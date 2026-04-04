import * as FileSystem from 'expo-file-system/legacy'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '@/supabase/types'
import { EnexBuilder } from '@core/enex/enex-builder'
import { NoteService } from '@core/services/notes'
import { buildEnexExportFileName, toEnexExportNotes } from '@ui/mobile/lib/enexMobile'

type NoteRow = Tables<'notes'>

export type ExportProgress =
  | { stage: 'loading'; loaded: number; total: number }
  | { stage: 'building'; noteCount: number }
  | { stage: 'writing'; noteCount: number; fileName: string }

export class MobileEnexExportService {
  private readonly noteService: NoteService
  private readonly enexBuilder: EnexBuilder

  constructor(supabase: SupabaseClient<Database>) {
    this.noteService = new NoteService(supabase)
    this.enexBuilder = new EnexBuilder()
  }

  async exportAllNotes(
    userId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<{ fileUri: string; fileName: string; noteCount: number }> {
    const allNotes: NoteRow[] = []
    const pageSize = 200
    let page = 0
    let totalCount = 0

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      const result = await this.noteService.getNotes(userId, { page, pageSize })
      totalCount = result.totalCount
      allNotes.push(...result.notes)
      onProgress?.({ stage: 'loading', loaded: allNotes.length, total: totalCount })

      if (!result.hasMore) {
        break
      }

      page += 1
    }

    const fileName = buildEnexExportFileName()
    const baseDirectory = FileSystem.documentDirectory ?? FileSystem.cacheDirectory

    if (!baseDirectory) {
      throw new Error('Export directory is unavailable on this device')
    }

    const fileUri = `${baseDirectory}${fileName}`
    onProgress?.({ stage: 'building', noteCount: allNotes.length })
    const xml = this.enexBuilder.build(toEnexExportNotes(allNotes))

    onProgress?.({ stage: 'writing', noteCount: allNotes.length, fileName })
    await FileSystem.writeAsStringAsync(fileUri, xml, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    return {
      fileUri,
      fileName,
      noteCount: allNotes.length,
    }
  }
}
