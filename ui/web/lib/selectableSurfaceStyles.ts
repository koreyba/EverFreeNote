export const selectableSurfaceStateClasses = {
  active: "border-primary/60 bg-accent text-foreground",
  idleCard: "border-transparent text-foreground hover:border-border hover:bg-muted/50",
  idlePill: "border-transparent bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
} as const

export const selectableSurfaceIconClasses = {
  active: "bg-background/80",
  idle: "bg-background",
} as const

