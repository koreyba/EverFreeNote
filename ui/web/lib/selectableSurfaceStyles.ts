export const selectableSurfaceStateClasses = {
  active: "relative border-primary/30 bg-primary/5 dark:bg-primary/10 text-foreground shadow-sm after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary after:rounded-l-lg",
  idleCard: "border-border/30 text-foreground hover:border-border/60 hover:bg-muted/40 transition-all duration-200",
  idlePill: "border-transparent bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-all duration-200",
} as const

export const selectableSurfaceIconClasses = {
  active: "bg-background/80",
  idle: "bg-background",
} as const

