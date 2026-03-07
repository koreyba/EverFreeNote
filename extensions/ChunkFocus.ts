import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const CHUNK_FOCUS_KEY = new PluginKey<DecorationSet>('chunkFocus')

type ChunkFocusRange = { from: number; to: number }
type ChunkFocusMeta = 'clear' | { ranges: ChunkFocusRange[] }

const chunkFocusPlugin = new Plugin({
  key: CHUNK_FOCUS_KEY,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, decorationSet) {
      const meta = tr.getMeta(CHUNK_FOCUS_KEY) as ChunkFocusMeta | undefined
      if (meta === 'clear') return DecorationSet.empty
      if (meta && Array.isArray(meta.ranges) && meta.ranges.length > 0) {
        const decorations = meta.ranges
          .filter((range) => range.to > range.from)
          .map((range, index, allRanges) =>
            Decoration.node(range.from, range.to, {
              class: [
                'chunk-focus-block',
                index === 0 ? 'chunk-focus-block-start' : '',
                index === allRanges.length - 1 ? 'chunk-focus-block-end' : '',
              ]
                .filter(Boolean)
                .join(' '),
            })
          )

        return DecorationSet.create(tr.doc, decorations)
      }
      // Editing content should drop stale chunk highlight.
      if (tr.docChanged) return DecorationSet.empty
      return decorationSet.map(tr.mapping, tr.doc)
    },
  },
  props: {
    decorations(state) {
      return CHUNK_FOCUS_KEY.getState(state)
    },
    handleDOMEvents: {
      mousedown(view) {
        const decorations = CHUNK_FOCUS_KEY.getState(view.state)
        if (!decorations || decorations.find().length === 0) return false
        view.dispatch(view.state.tr.setMeta(CHUNK_FOCUS_KEY, 'clear'))
        return false
      },
    },
  },
})

export const ChunkFocusExtension = Extension.create({
  name: 'chunkFocus',
  addProseMirrorPlugins() {
    return [chunkFocusPlugin]
  },
})
