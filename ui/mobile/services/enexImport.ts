import type { DocumentPickerAsset } from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'
import { NoteCreator } from '@core/enex/note-creator'
import type { ImportResult } from '@core/enex/types'
import { parseEnexXml } from '@ui/mobile/lib/enexMobile'

export class MobileEnexImportService {
  private readonly noteCreator: NoteCreator

  constructor(supabase: SupabaseClient<Database>) {
    this.noteCreator = new NoteCreator(supabase)
  }

  async importAsset(asset: DocumentPickerAsset, userId: string): Promise<ImportResult> {
    const xml = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    return this.importXml(xml, userId)
  }

  async importXml(xml: string, userId: string): Promise<ImportResult> {
    const parsedNotes = parseEnexXml(xml)

    if (parsedNotes.length === 0) {
      throw new Error('No importable notes were found in the selected .enex file')
    }

    let success = 0
    let errors = 0
    const failedNotes: ImportResult['failedNotes'] = []

    for (const note of parsedNotes) {
      try {
        const created = await this.noteCreator.create(note, userId, 'prefix')
        if (created) {
          success += 1
        }
      } catch (error) {
        errors += 1
        failedNotes.push({
          title: note.title,
          error: error instanceof Error ? error.message : 'Failed to import note',
        })
      }
    }

    return {
      success,
      errors,
      failedNotes,
      message:
        errors > 0
          ? `Imported ${success} note(s) with ${errors} error(s).`
          : `Imported ${success} note(s).`,
    }
  }
}
