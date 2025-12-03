export type EnexResource = {
  data: string
  mime: string
  width?: number
  height?: number
  fileName?: string
  // Calculated MD5 hash (Evernote uses md5 in en-media hash attr)
  hash?: string
}

export type ParsedNote = {
  title: string
  content: string
  created: Date
  updated: Date
  tags: string[]
  resources: EnexResource[]
}

export type DuplicateStrategy = 'skip' | 'replace' | 'prefix'

export type ImportSettings = {
  duplicateStrategy: DuplicateStrategy
  skipFileDuplicates: boolean
}

export type ImportProgress = {
  currentFile: number
  totalFiles: number
  currentNote: number
  totalNotes: number
  fileName: string
}

export type FailedImportNote = {
  title: string
  error: string
}

export type ImportResult = {
  success: number
  errors: number
  failedNotes: FailedImportNote[]
  message: string
}

export type ImportStatus = 'success' | 'partial'
