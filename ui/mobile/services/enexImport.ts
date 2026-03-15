import type { DocumentPickerAsset } from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/supabase/types'
import {
  DEFAULT_IMPORT_SETTINGS,
  resolveExistingTitlesForImport,
} from '@core/enex/import-shared'
import { NoteCreator } from '@core/enex/note-creator'
import type { ImportResult, ImportSettings } from '@core/enex/types'
import { parseEnexXml } from '@ui/mobile/lib/enexMobile'

export const MAX_ENEX_SIZE_BYTES = 100 * 1024 * 1024

export type ImportProgress = {
  processed: number
  total: number
}

export class MobileEnexImportService {
  private readonly supabase: SupabaseClient<Database>
  private readonly noteCreator: NoteCreator

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.noteCreator = new NoteCreator(supabase)
  }

  async importAsset(
    asset: DocumentPickerAsset,
    userId: string,
    settings: ImportSettings = DEFAULT_IMPORT_SETTINGS,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    if (typeof asset.size === 'number' && asset.size > MAX_ENEX_SIZE_BYTES) {
      throw new Error(
        `Selected .enex file is too large to import. Maximum supported size is ${Math.round(
          MAX_ENEX_SIZE_BYTES / 1024 / 1024
        )} MB.`
      )
    }

    const xml = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    return this.importXml(xml, userId, settings, onProgress)
  }

  async importXml(
    xml: string,
    userId: string,
    settings: ImportSettings = DEFAULT_IMPORT_SETTINGS,
    onProgress?: (progress: ImportProgress) => void
  ): Promise<ImportResult> {
    const parsedNotes = parseEnexXml(xml)

    if (parsedNotes.length === 0) {
      throw new Error('No importable notes were found in the selected .enex file')
    }

    const existingByTitle = await resolveExistingTitlesForImport(
      this.supabase,
      userId,
      settings.duplicateStrategy
    )
    const seenTitlesInImport = new Set<string>()

    onProgress?.({ processed: 0, total: parsedNotes.length })

    let success = 0
    let skipped = 0
    let errors = 0
    const failedNotes: ImportResult['failedNotes'] = []

    for (const note of parsedNotes) {
      try {
        const created = await this.noteCreator.create(
          note,
          userId,
          settings.duplicateStrategy,
          {
            skipFileDuplicates: settings.skipFileDuplicates,
            existingByTitle,
            seenTitlesInImport,
          }
        )

        if (created) {
          success += 1
        } else {
          skipped += 1
        }
      } catch (error) {
        errors += 1
        failedNotes.push({
          title: note.title,
          error: error instanceof Error ? error.message : 'Failed to import note',
        })
      } finally {
        onProgress?.({ processed: success + skipped + errors, total: parsedNotes.length })
      }
    }

    const messageParts = [`Imported ${success} note(s)`]
    if (skipped > 0) {
      messageParts.push(`skipped ${skipped} duplicate note(s)`)
    }
    if (errors > 0) {
      messageParts.push(`with ${errors} error(s)`)
    }

    return {
      success,
      errors,
      failedNotes,
      message: `${messageParts.join(', ')}.`,
    }
  }
}
