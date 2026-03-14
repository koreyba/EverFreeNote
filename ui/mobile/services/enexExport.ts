import * as FileSystem from 'expo-file-system/legacy'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '@/supabase/types'
import { EnexBuilder } from '@core/enex/enex-builder'
import { NoteService } from '@core/services/notes'
import { buildEnexExportFileName, toEnexExportNotes } from '@ui/mobile/lib/enexMobile'

type NoteRow = Tables<'notes'>

export class MobileEnexExportService {
  private readonly noteService: NoteService
  private readonly enexBuilder: EnexBuilder

  constructor(supabase: SupabaseClient<Database>) {
    this.noteService = new NoteService(supabase)
    this.enexBuilder = new EnexBuilder()
  }

  async exportAllNotes(userId: string): Promise<{ fileUri: string; fileName: string; noteCount: number }> {
    const allNotes: NoteRow[] = []
    const pageSize = 200
    let page = 0

    while (true) {
      const result = await this.noteService.getNotes(userId, { page, pageSize })
      allNotes.push(...result.notes)

      if (!result.hasMore) {
        break
      }

      page += 1
    }

    const fileName = buildEnexExportFileName()
    const baseDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory

    if (!baseDirectory) {
      throw new Error('Export directory is unavailable on this device')
    }

    const fileUri = `${baseDirectory}${fileName}`
    const xml = this.enexBuilder.build(toEnexExportNotes(allNotes))

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
