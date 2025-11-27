export type EnexResource = {
  data: string
  mime: string
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
