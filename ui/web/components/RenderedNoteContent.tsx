"use client"

import * as React from "react"
import { imageWidthForHeight, isValidImageDimension } from "@core/utils/imageDimensions"

/** Displays sanitized note HTML without writing view-only image sizing into the note. */
export const RenderedNoteContent = React.forwardRef<HTMLDivElement, { html: string; className: string }>(
  function RenderedNoteContent({ html, className }, forwardedRef) {
    const rootRef = React.useRef<HTMLDivElement>(null)
    React.useImperativeHandle(forwardedRef, () => rootRef.current!, [])

    React.useEffect(() => {
      const root = rootRef.current
      if (!root) return
      const sizeImage = (image: HTMLImageElement) => {
        if (isValidImageDimension(image.getAttribute("width")) || image.style.width || image.style.height || !image.complete) return
        const width = imageWidthForHeight(image.getAttribute("height"), image.naturalWidth, image.naturalHeight)
        if (width) image.style.width = width
      }
      const onLoad = (event: Event) => {
        if (event.target instanceof HTMLImageElement) sizeImage(event.target)
      }
      root.addEventListener("load", onLoad, true)
      root.querySelectorAll("img").forEach(sizeImage)
      return () => root.removeEventListener("load", onLoad, true)
    }, [html])

    return (
      <div
        ref={rootRef}
        className={className}
        // nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  },
)
