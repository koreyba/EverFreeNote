import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

const imageAccessibilityKey = new PluginKey<DecorationSet>("imageAccessibility")

function imageNames(document: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  document.descendants((node, position) => {
    if (node.type.name === "image" && node.attrs.alt == null) {
      decorations.push(Decoration.node(position, position + node.nodeSize, { alt: "Image without description" }))
    }
  })
  return DecorationSet.create(document, decorations)
}

/** A view-only name for legacy images, without changing the note document. */
export const ImageAccessibility = Extension.create({
  name: "imageAccessibility",
  addProseMirrorPlugins() {
    return [new Plugin<DecorationSet>({
      key: imageAccessibilityKey,
      state: {
        init: (_, state) => imageNames(state.doc),
        apply: (transaction, previous) => transaction.docChanged ? imageNames(transaction.doc) : previous,
      },
      props: {
        decorations: (state) => imageAccessibilityKey.getState(state) ?? null,
      },
    })]
  },
})
