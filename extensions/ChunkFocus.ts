import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const CHUNK_FOCUS_KEY = new PluginKey<DecorationSet>('chunkFocus')

const chunkFocusPlugin = new Plugin({
  key: CHUNK_FOCUS_KEY,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, decorationSet) {
      const meta = tr.getMeta(CHUNK_FOCUS_KEY)
      if (meta === 'clear') return DecorationSet.empty
      if (meta && typeof meta.from === 'number' && typeof meta.to === 'number') {
        const deco = Decoration.node(meta.from, meta.to, { class: 'chunk-focus' })
        return DecorationSet.create(tr.doc, [deco])
      }
      return decorationSet.map(tr.mapping, tr.doc)
    },
  },
  props: {
    decorations(state) {
      return CHUNK_FOCUS_KEY.getState(state)
    },
    handleDOMEvents: {
      mousedown: (view) => {
        const pluginState = CHUNK_FOCUS_KEY.getState(view.state)
        if (pluginState && pluginState !== DecorationSet.empty) {
          view.dispatch(view.state.tr.setMeta(CHUNK_FOCUS_KEY, 'clear'))
        }
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
