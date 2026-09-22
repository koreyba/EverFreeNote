"use client"

import * as React from "react"
import { useIsMobile } from "@ui/web/hooks/use-mobile"
import { useMobileViewport } from "@ui/web/hooks/useMobileViewport"
import { cn } from "@ui/web/lib/utils"

const MobileNavigationContext = React.createContext(false)
const MobileEditorContext = React.createContext<{ expanded: boolean; setExpanded: React.Dispatch<React.SetStateAction<boolean>> }>({
  expanded: false, setExpanded: () => undefined,
})

export const useMobileNavigationHidden = () => React.useContext(MobileNavigationContext)
export const useMobileEditorExpansion = () => React.useContext(MobileEditorContext)

type ScrollPosition = { previous: number; anchor: number; direction: number; view: string }

type MobileWorkspaceProps = React.HTMLAttributes<HTMLDivElement> & { viewKey: string }

export function MobileWorkspace({ viewKey, className, children, style, ...props }: MobileWorkspaceProps) {
  const isMobile = useIsMobile()
  const viewport = useMobileViewport(isMobile)
  const [navigation, setNavigation] = React.useState({ view: viewKey, hidden: false })
  const [editorExpanded, setExpanded] = React.useState(false)
  const expanded = isMobile && editorExpanded
  const editorContext = React.useMemo(() => ({ expanded, setExpanded }), [expanded, setExpanded])
  const positions = React.useRef(new WeakMap<HTMLElement, ScrollPosition>())
  const hidden = isMobile && (expanded || viewport?.keyboardOpen || (navigation.view === viewKey && navigation.hidden))

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target
    if (!isMobile || !(target instanceof HTMLElement) || !event.currentTarget.contains(target)) return
    if (target.closest('[role="menu"], [role="listbox"], [data-mobile-scroll-ignore]')) return
    const maximum = target.scrollHeight - target.clientHeight
    if (maximum <= 0) return

    // Clamp rubber-band scrolling and ignore horizontal-only motion. Keep a
    // separate anchor for each vertical surface (notes, tags, search, settings).
    const top = Math.max(0, Math.min(target.scrollTop, maximum))
    const saved = positions.current.get(target)
    const position = saved?.view === viewKey
      ? saved
      : { previous: 0, anchor: 0, direction: 0, view: viewKey }
    const direction = Math.sign(top - position.previous)

    // Releasing navigation space expands the scroller. Its resulting bottom
    // clamp is a layout adjustment, not an upward gesture to reopen the bar.
    if (position.previous > maximum && top === maximum) {
      positions.current.set(target, { ...position, previous: top, anchor: top })
      return
    }
    if (direction === 0) return
    if (direction !== position.direction) position.anchor = position.previous
    position.previous = top
    position.direction = direction
    positions.current.set(target, position)

    if (top <= 8 || Math.abs(top - position.anchor) >= (direction > 0 ? 16 : 8)) {
      const nextHidden = top > 8 && direction > 0
      setNavigation(current => current.view === viewKey && current.hidden === nextHidden
        ? current
        : { view: viewKey, hidden: nextHidden })
    }
  }

  return (
    <MobileNavigationContext.Provider value={hidden}>
      <MobileEditorContext.Provider value={editorContext}>
        <div
          {...props}
          className={cn("relative mobile-workspace", className)}
          data-navigation-hidden={hidden}
          data-keyboard-open={viewport?.keyboardOpen || false}
          data-editor-expanded={expanded}
          style={{
            ...style,
            ...(viewport && {
              "--mobile-viewport-height": `${viewport.height}px`,
              "--mobile-viewport-top": `${viewport.offsetTop}px`,
            }),
          } as React.CSSProperties}
          onScrollCapture={handleScroll}
        >
          {children}
        </div>
      </MobileEditorContext.Provider>
    </MobileNavigationContext.Provider>
  )
}
