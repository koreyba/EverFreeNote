"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Download, Globe, KeyRound, Upload, UserRound, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@ui/web/lib/utils"
import { selectableSurfaceIconClasses, selectableSurfaceStateClasses } from "@ui/web/lib/selectableSurfaceStyles"
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth"
import { ImportButton } from "@/components/ImportButton"
import { ExportButton } from "@/components/ExportButton"
import { ApiKeysSettingsPanel } from "@/components/features/settings/ApiKeysSettingsPanel"
import { DeleteAccountPanel } from "@/components/features/settings/DeleteAccountPanel"
import { WordPressSettingsPanel } from "@/components/features/settings/WordPressSettingsPanel"
import {
  clearSettingsReturnState,
  readSettingsReturnState,
  sanitizeSettingsReturnPath,
} from "@ui/web/lib/settingsNavigationState"

type SettingsTabId = "wordpress" | "api-keys" | "import" | "export" | "account"

type SettingsTabDefinition = {
  id: SettingsTabId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const SETTINGS_TABS: SettingsTabDefinition[] = [
  {
    id: "account",
    label: "My Account",
    description: "Email and account management.",
    icon: UserRound,
  },
  {
    id: "import",
    label: "Import .enex file",
    description: "Bring notes in from Evernote exports.",
    icon: Upload,
  },
  {
    id: "export",
    label: "Export .enex file",
    description: "Download your notes as an archive.",
    icon: Download,
  },
  {
    id: "wordpress",
    label: "WordPress settings",
    description: "Site URL, account, and publishing access.",
    icon: Globe,
  },
  {
    id: "api-keys",
    label: "Indexing (RAG)",
    description: "Gemini API key plus indexing and retrieval settings.",
    icon: KeyRound,
  },
]

function isSettingsTabId(value: string | null): value is SettingsTabId {
  return SETTINGS_TABS.some((tab) => tab.id === value)
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, deleteAccountLoading, handleDeleteAccount } = useNoteAuth()
  const mobileTabsRef = React.useRef<HTMLDivElement | null>(null)
  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mobileTabsScrollable, setMobileTabsScrollable] = React.useState(false)
  const [mobileTabsIndicator, setMobileTabsIndicator] = React.useState({ width: 0, left: 0, visible: false })

  const activeTabParam = searchParams.get("tab")
  const activeTab = isSettingsTabId(activeTabParam) ? activeTabParam : "account"

  React.useEffect(() => {
    if (loading || user) return
    router.replace("/")
  }, [loading, router, user])

  const handleSelectTab = React.useCallback((tabId: SettingsTabId) => {
    router.replace(`/settings?tab=${tabId}`, { scroll: false })
  }, [router])

  const handleExit = React.useCallback(() => {
    const returnState = readSettingsReturnState()
    const safeReturnPath = sanitizeSettingsReturnPath(returnState?.returnPath) ?? "/"
    router.push(safeReturnPath)
  }, [router])

  const handleImportComplete = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notes"] })
  }, [queryClient])

  const activeDefinition = SETTINGS_TABS.find((tab) => tab.id === activeTab) ?? SETTINGS_TABS[0]
  const ActiveIcon = activeDefinition.icon

  const updateMobileTabsIndicator = React.useCallback((showIndicator: boolean) => {
    const element = mobileTabsRef.current
    if (!element) return

    const { scrollWidth, clientWidth, scrollLeft } = element
    const isScrollable = scrollWidth > clientWidth + 1
    setMobileTabsScrollable(isScrollable)

    if (!isScrollable) {
      setMobileTabsIndicator((current) => ({ ...current, visible: false, width: 0, left: 0 }))
      return
    }

    const thumbWidth = Math.max((clientWidth / scrollWidth) * clientWidth, 48)
    const maxScrollLeft = Math.max(scrollWidth - clientWidth, 1)
    const maxThumbTravel = Math.max(clientWidth - thumbWidth, 0)
    const thumbLeft = (scrollLeft / maxScrollLeft) * maxThumbTravel

    setMobileTabsIndicator({
      width: thumbWidth,
      left: thumbLeft,
      visible: showIndicator,
    })
  }, [])

  React.useEffect(() => {
    const handleResize = () => updateMobileTabsIndicator(false)

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateMobileTabsIndicator])

  React.useEffect(() => {
    updateMobileTabsIndicator(false)
  }, [activeTab, updateMobileTabsIndicator])

  React.useEffect(() => () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  const handleMobileTabsScroll = React.useCallback(() => {
    updateMobileTabsIndicator(true)

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    scrollTimeoutRef.current = setTimeout(() => {
      updateMobileTabsIndicator(false)
    }, 700)
  }, [updateMobileTabsIndicator])

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/20 px-3 py-3 sm:px-4 sm:py-5 md:px-6 md:py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:gap-4">
        <div className="rounded-3xl border bg-background/95 shadow-sm">
          <div className="border-b px-4 py-4 sm:px-5 md:px-6">
            <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 md:items-center">
              <Button
                variant="outline"
                size="icon"
                onClick={handleExit}
                aria-label="Back"
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0">
                <h1 className="text-[2rem] font-semibold tracking-tight">Settings</h1>
              </div>

              <div className="flex items-center gap-2 justify-self-end">
                <ThemeToggle />
                <Button variant="outline" size="icon" onClick={handleExit} aria-label="Close settings">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden border-b p-3 md:block md:border-b-0 md:border-r md:p-4">
              <div className="flex gap-2 pb-0 md:flex-col">
                {SETTINGS_TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = tab.id === activeDefinition.id

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                        isActive ? selectableSurfaceStateClasses.active : selectableSurfaceStateClasses.idleCard
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            isActive ? selectableSurfaceIconClasses.active : selectableSurfaceIconClasses.idle
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-medium leading-tight">{tab.label}</div>
                          <div
                            className={cn(
                              "mt-1 text-xs",
                              isActive ? "text-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            <section className="min-w-0 p-4 sm:p-5 md:p-8">
              <div className="max-w-3xl">
                <div className="mb-5 md:hidden">
                  <div
                    ref={mobileTabsRef}
                    onScroll={handleMobileTabsScroll}
                    className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {SETTINGS_TABS.map((tab) => {
                      const isActive = tab.id === activeDefinition.id

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => handleSelectTab(tab.id)}
                          className={cn(
                            "shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                            isActive ? selectableSurfaceStateClasses.active : selectableSurfaceStateClasses.idlePill
                          )}
                        >
                          {tab.label.replace(" settings", "")}
                        </button>
                      )
                    })}
                  </div>
                  {mobileTabsScrollable ? (
                    <div
                      className={cn(
                        "mt-2 h-1 rounded-full bg-border/50 transition-opacity duration-200",
                        mobileTabsIndicator.visible ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <div
                        className="h-full rounded-full bg-foreground/35 transition-transform duration-150"
                        style={{
                          width: `${mobileTabsIndicator.width}px`,
                          transform: `translateX(${mobileTabsIndicator.left}px)`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mb-5 md:mb-8">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
                      <ActiveIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{activeDefinition.label}</h2>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{activeDefinition.description}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border bg-card p-4 shadow-sm sm:p-5 md:p-6">
                  {activeDefinition.id === "wordpress" ? (
                    <WordPressSettingsPanel />
                  ) : null}
                  {activeDefinition.id === "api-keys" ? (
                    <ApiKeysSettingsPanel />
                  ) : null}
                  {activeDefinition.id === "import" ? (
                    <ActionSection
                      title="Import notes from an Evernote export"
                      description="Choose one or more .enex files, review duplicate handling, and import notes into your workspace."
                    >
                      <ImportButton onImportComplete={handleImportComplete} />
                    </ActionSection>
                  ) : null}
                  {activeDefinition.id === "export" ? (
                    <ActionSection
                      title="Export your notes"
                      description="Create an .enex archive for backup, migration, or account cleanup before destructive actions."
                    >
                      <ExportButton />
                    </ActionSection>
                  ) : null}
                  {activeDefinition.id === "account" ? (
                    <DeleteAccountPanel
                      email={user.email}
                      onConfirm={() => handleDeleteAccount(() => {
                        clearSettingsReturnState()
                        router.push("/")
                      })}
                      loading={deleteAccountLoading}
                    />
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function ActionSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
