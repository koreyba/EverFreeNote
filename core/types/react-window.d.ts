declare module 'react-window' {
  import * as React from 'react'

  export interface ListOnScrollProps {
    scrollDirection: 'forward' | 'backward'
    scrollOffset: number
    scrollUpdateWasRequested: boolean
  }

  export interface FixedSizeListProps<T = unknown> {
    height: number | string
    width: number | string
    itemCount: number
    itemSize: number
    itemData?: T
    className?: string
    overscanCount?: number
    onScroll?: (props: ListOnScrollProps) => void
    children: React.ComponentType<ListChildComponentProps<T>>
    ref?: React.Ref<FixedSizeList>
  }

  export interface ListChildComponentProps<T = unknown> {
    data: T
    index: number
    style: React.CSSProperties
  }

  export const FixedSizeList: React.ComponentType<FixedSizeListProps>
  export type FixedSizeListComponent = typeof FixedSizeList
  export type FixedSizeList = React.ComponentType<FixedSizeListProps<unknown>>

  export interface VariableSizeListProps<T = unknown>
    extends Omit<FixedSizeListProps<T>, 'itemSize'> {
    itemSize: (index: number) => number
  }

  export const VariableSizeList: React.ComponentType<VariableSizeListProps>

  // Common alias used by some wrappers
  export const List: React.ComponentType<FixedSizeListProps<unknown>>
}
