"use client";
import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@ui/web/lib/utils"

type ChartConfigItem = {
  label?: string
  color?: string
  icon?: React.ComponentType
  theme?: Record<"light" | "dark", string | undefined>
}

type ChartConfig = Record<string, ChartConfigItem>

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES: Record<"light" | "dark", string> = {
  light: "",
  dark: ".dark",
}

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

type ChartContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  config: ChartConfig
  id?: string
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId()
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

    return (
      <ChartContext.Provider value={{ config }}>
        <div
          data-chart={chartId}
          ref={ref}
          className={cn(
            "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
            className
          )}
          {...props}
        >
          <ChartStyle id={chartId} config={config} />
          <RechartsPrimitive.ResponsiveContainer>
            {children}
          </RechartsPrimitive.ResponsiveContainer>
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "Chart"

type ChartStyleProps = {
  id: string
  config: ChartConfig
}

const ChartStyle = ({ id, config }: ChartStyleProps) => {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.theme || itemConfig.color)

  if (!colorConfig.length) {
    return null
  }

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
        .map(([key, itemConfig]) => {
          const color = itemConfig.theme?.[theme as keyof typeof THEMES] || itemConfig.color
          return color ? `  --color-${key}: ${color};` : null
        })
        .filter(Boolean)
        .join("\n")}
}
`)
    .join("\n")

  return <style dangerouslySetInnerHTML={{ __html: css }} />
}

const ChartTooltip = RechartsPrimitive.Tooltip

type ChartTooltipContentProps = React.ComponentPropsWithoutRef<typeof RechartsPrimitive.Tooltip> & {
  indicator?: "dot" | "line" | "dashed"
  hideLabel?: boolean
  hideIndicator?: boolean
  labelClassName?: string
  nameKey?: string
  labelKey?: string
  color?: string
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  label?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (...args: any[]) => React.ReactNode
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      ...props
    }: ChartTooltipContentProps,
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item?.dataKey || item?.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return (
          <div className={cn("font-medium", labelClassName)}>
            {labelFormatter(value, payload)}
          </div>
        )
      }

      if (!value) {
        return null
      }

      return <div className={cn("font-medium", labelClassName)}>{value}</div>
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {!nestLabel ? tooltipLabel : null}
        <div className="grid gap-1.5">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {payload.map((item: any, index: number) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const indicatorColor = color || (item.payload as any)?.fill || item.color

            return (
              <div
                key={item.dataKey ?? index}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value as number, item.name as string, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn("shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]", {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          })}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        {nestLabel ? tooltipLabel : null}
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {(item.value as number).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = RechartsPrimitive.Legend

type ChartLegendContentProps = React.ComponentPropsWithoutRef<typeof RechartsPrimitive.Legend> & {
  hideIcon?: boolean
  nameKey?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formatter?: (...args: any[]) => React.ReactNode
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey, ...legendProps },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
        {...(legendProps as React.HTMLAttributes<HTMLDivElement>)}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((item: any, index: number) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  key: string
): ChartConfigItem | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload && typeof payload.payload === "object" && payload.payload !== null
      ? (payload.payload as Record<string, unknown>)
      : undefined

  let configLabelKey = key

  if (key in payload && typeof payload[key] === "string") {
    configLabelKey = payload[key]
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key] === "string"
  ) {
    configLabelKey = payloadPayload[key] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  type ChartConfig,
  type ChartConfigItem,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
