export interface TagWithCount {
  name: string
  count: number
}

export interface AlphabeticalTagGroup {
  letter: string // 'A'-'Z', 'А'-'Я', or '#' for non-alphabetic
  tags: TagWithCount[]
}
