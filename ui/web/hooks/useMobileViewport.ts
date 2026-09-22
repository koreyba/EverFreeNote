import * as React from "react"

type MobileViewport = { height: number; offsetTop: number; keyboardOpen: boolean }

/** The layout viewport can stay full-height while a mobile keyboard covers it. */
export function useMobileViewport(enabled: boolean) {
  const [viewport, setViewport] = React.useState<MobileViewport | null>(null)

  React.useEffect(() => {
    const visualViewport = window.visualViewport
    if (!enabled || !visualViewport) return

    const update = () => {
      // Pinch zoom should magnify the layout, not resize it or hide navigation.
      if (visualViewport.scale !== 1) return
      const next = {
        height: visualViewport.height,
        offsetTop: visualViewport.offsetTop,
        keyboardOpen: window.innerHeight - visualViewport.height > 120,
      }
      setViewport(current => current?.height === next.height && current.offsetTop === next.offsetTop && current.keyboardOpen === next.keyboardOpen
        ? current
        : next)
    }

    update()
    visualViewport.addEventListener("resize", update)
    visualViewport.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    return () => {
      visualViewport.removeEventListener("resize", update)
      visualViewport.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [enabled])

  return enabled ? viewport : null
}
