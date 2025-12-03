export type EnexResource = {
  data: string
  mime: string
  hash?: string
  width?: number
  height?: number
  fileName?: string
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
