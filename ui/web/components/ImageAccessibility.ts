import { Extension } from "@tiptap/core"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { imageAspectRatio, imageWidthForHeight, isValidImageDimension } from "@core/utils/imageDimensions"

type NaturalSize = { src: string; width: number; height: number }
type ImageViewState = { decorations: DecorationSet; naturalSizes: Map<number, NaturalSize> }
const imageAccessibilityKey = new PluginKey<ImageViewState>("imageAccessibility")

function imageNames(document: ProseMirrorNode, naturalSizes: Map<number, NaturalSize>): DecorationSet {
  const decorations: Decoration[] = []
  document.descendants((node, position) => {
    if (node.type.name !== "image") return
    const attributes: Record<string, string> = {}
    if (node.attrs.alt == null) attributes.alt = "Image without description"
    const width = node.attrs.width == null ? null : String(node.attrs.width)
    const height = node.attrs.height == null ? null : String(node.attrs.height)
    const ratio = imageAspectRatio(width, height)
    if (ratio) attributes.style = `aspect-ratio: ${ratio}`
    else if (!isValidImageDimension(width) && typeof node.attrs.src === "string") {
      const naturalSize = naturalSizes.get(position)
      const sizedWidth = naturalSize?.src === node.attrs.src && imageWidthForHeight(height, naturalSize.width, naturalSize.height)
      if (sizedWidth) attributes.style = `width: ${sizedWidth}`
    }
    if (Object.keys(attributes).length) decorations.push(Decoration.node(position, position + node.nodeSize, attributes))
  })
  return DecorationSet.create(document, decorations)
}

/** View-only image names and ratios never change the note document. */
export const ImageAccessibility = Extension.create({
  name: "imageAccessibility",
  addProseMirrorPlugins() {
    return [new Plugin<ImageViewState>({
      key: imageAccessibilityKey,
      state: {
        init: (_, state) => ({ decorations: imageNames(state.doc, new Map()), naturalSizes: new Map() }),
        apply: (transaction, previous) => {
          const updates = transaction.getMeta(imageAccessibilityKey) as Array<[number, NaturalSize]> | undefined
          if (!transaction.docChanged && !updates) return previous
          const naturalSizes = new Map<number, NaturalSize>()
          previous.naturalSizes.forEach((size, position) => {
            const mapped = transaction.mapping.mapResult(position, 1)
            const node = transaction.doc.nodeAt(mapped.pos)
            if (!mapped.deleted && node?.type.name === "image" && node.attrs.src === size.src) naturalSizes.set(mapped.pos, size)
          })
          updates?.forEach(([position, size]) => naturalSizes.set(position, size))
          return { decorations: imageNames(transaction.doc, naturalSizes), naturalSizes }
        },
      },
      props: {
        decorations: (state) => imageAccessibilityKey.getState(state)?.decorations ?? null,
      },
      view: (view) => {
        let pending = false
        let destroyed = false
        const scheduleImageScan = () => {
          if (pending || destroyed) return
          pending = true
          queueMicrotask(() => {
            pending = false
            if (destroyed) return
            const previous = imageAccessibilityKey.getState(view.state)?.naturalSizes
            const updates = new Map<number, NaturalSize>()
            view.dom.querySelectorAll("img").forEach((image) => {
              const src = image.getAttribute("src")
              const height = image.getAttribute("height")
              if (!src || isValidImageDimension(image.getAttribute("width")) || !image.complete ||
                !imageWidthForHeight(height, image.naturalWidth, image.naturalHeight)) return
              const position = view.posAtDOM(image, 0)
              const node = view.state.doc.nodeAt(position)
              if (node?.type.name !== "image" || node.attrs.src !== src) return
              const size = { src, width: image.naturalWidth, height: image.naturalHeight }
              const known = previous?.get(position)
              if (!known || known.src !== src || known.width !== size.width || known.height !== size.height) updates.set(position, size)
            })
            if (updates.size) view.dispatch(view.state.tr.setMeta(imageAccessibilityKey, Array.from(updates)).setMeta("addToHistory", false))
          })
        }
        view.dom.addEventListener("load", scheduleImageScan, true)
        scheduleImageScan()
        return {
          update: (_view, previousState) => {
            if (previousState.doc !== view.state.doc) scheduleImageScan()
          },
          destroy: () => {
            destroyed = true
            view.dom.removeEventListener("load", scheduleImageScan, true)
          },
        }
      },
    })]
  },
})
