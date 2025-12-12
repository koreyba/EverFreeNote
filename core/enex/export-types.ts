export type ExportResource = {
  data: string // base64 encoded image data
  mime: string
  hash: string // md5 hex (lowercase) of binary data
  width?: number
  height?: number
  fileName: string
}

export type ExportNote = {
  title: string
  content: string // ENML with <en-media> referencing resources by hash
  created: Date
  updated: Date
  tags: string[]
  resources: ExportResource[]
}

export type ExportProgress = {
  currentNote: number
  totalNotes: number
  currentStep: 'fetching' | 'downloading-images' | 'building-xml' | 'complete'
  message: string
}
