import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { imageAspectRatio, isValidImageDimension } from "@core/utils/imageDimensions"

const imageAccessibilityKey = new PluginKey<DecorationSet>("imageAccessibility")

function imageNames(document: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = []
  document.descendants((node, position) => {
    if (node.type.name !== "image") return
    const attributes: Record<string, string> = {}
    if (node.attrs.alt == null) attributes.alt = "Image without description"
    const width = node.attrs.width == null ? null : String(node.attrs.width)
    const height = node.attrs.height == null ? null : String(node.attrs.height)
    const ratio = imageAspectRatio(width, height)
    if (ratio) attributes.style = `aspect-ratio: ${ratio}`
    else if (!isValidImageDimension(width) && isValidImageDimension(height)) attributes.style = `height: ${height}px; object-fit: contain`
    if (Object.keys(attributes).length) decorations.push(Decoration.node(position, position + node.nodeSize, attributes))
  })
  return DecorationSet.create(document, decorations)
}

/** View-only image names and ratios never change the note document. */
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
