"use client"

import * as React from "react"
import { FileText, Tag, Search, Settings, PanelLeftClose, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"

export type MainNavView = "notes" | "tags" | "settings"

interface NavRailProps {
  readonly activeView: MainNavView
  readonly onSelectView: (MainNavView) => void
  readonly onOpenSearch: () => void
  readonly onOpenSettings: () => void
  readonly className?: string
  readonly "data-testid"?: string
}

const STORAGE_KEY = "everfreenote_nav_rail_expanded"

export function NavRail({
  activeView,
  onSelectView,
  onOpenSearch,
  onOpenSettings,
  className,
  "data-testid": dataTestId,
}: NavRailProps) {
  // Read the persisted state during the first render so navigation opens without a collapsed flash.
  const [isExpanded, setIsExpanded] = React.useState<boolean>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(STORAGE_KEY)
        if (saved !== null) {
          return saved === "true"
        }
      }
    } catch {
      // Fall back to the collapsed default when storage is unavailable.
    }
    return false
  })

  const handleToggleExpand = React.useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, String(next))
        }
      } catch {
        // Keep the in-memory toggle working when storage is unavailable.
      }
      return next
    })
  }, [])

  const navItems = [
    {
      id: "notes" as MainNavView,
      label: "Notes",
      icon: FileText,
      onClick: () => onSelectView("notes"),
      active: activeView === "notes",
    },
    {
      id: "tags" as MainNavView,
      label: "Tags",
      icon: Tag,
      onClick: () => onSelectView("tags"),
      active: activeView === "tags",
    },
  ]

  const actionItems = [
    {
      id: "search",
      label: "Search",
      icon: Search,
      onClick: onOpenSearch,
      active: false,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      onClick: onOpenSettings,
      active: activeView === "settings",
    },
  ]

  return (
    <>
      {/* Desktop Navigation Rail (Visible on md and larger) */}
      <nav
        aria-label="Main Navigation"
        data-testid={dataTestId ?? "desktop-nav-rail"}
        className={cn(
          "hidden md:flex flex-col justify-between border-r border-sidebar-border bg-sidebar-background transition-all duration-300 z-20 shrink-0 h-screen sticky top-0 py-3",
          isExpanded ? "w-48 px-3" : "w-16 items-center px-2",
          className
        )}
      >
        <div className="space-y-4 w-full">
          {/* Collapse/Expand Toggle */}
          <div className={cn("flex items-center", isExpanded ? "justify-between px-1" : "justify-center")}>
            {isExpanded && <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={handleToggleExpand}
              aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
              title={isExpanded ? "Collapse panel" : "Expand panel"}
            >
              {isExpanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </Button>
          </div>

          {/* Main Navigation Views */}
          <div className="space-y-1 w-full">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "secondary" : "ghost"}
                  onClick={item.onClick}
                  data-testid={`nav-item-${item.id}`}
                  className={cn(
                    "w-full justify-start rounded-lg font-medium transition-colors",
                    isExpanded ? "px-3 py-2 h-10 gap-3" : "px-0 py-2 h-10 justify-center",
                    item.active && "bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                  )}
                  title={item.label}
                  aria-current={item.active ? "page" : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {isExpanded && <span className="text-sm truncate">{item.label}</span>}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Quick Actions (Search & Settings Triggers) */}
        <div className="space-y-1 w-full pt-3 border-t border-sidebar-border/60">
          {actionItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={item.active ? "secondary" : "ghost"}
                onClick={item.onClick}
                data-testid={`nav-action-${item.id}`}
                className={cn(
                  "w-full justify-start rounded-lg transition-colors",
                  isExpanded ? "px-3 py-2 h-10 gap-3" : "px-0 py-2 h-10 justify-center",
                  item.active ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
                title={item.label}
                aria-current={item.active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {isExpanded && <span className="text-sm truncate">{item.label}</span>}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (Visible on small screens) */}
      <nav
        aria-label="Mobile Navigation"
        data-testid={dataTestId ? `${dataTestId}-mobile` : "mobile-bottom-nav"}
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-md border-t border-border flex items-center justify-around z-40 px-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              data-testid={`mobile-nav-${item.id}`}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors text-xs font-medium gap-1",
                item.active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        })}

        {actionItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              data-testid={`mobile-action-${item.id}`}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-colors text-xs font-medium gap-1",
                item.active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
