"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@ui/web/lib/utils"

interface PlanCardProps {
  name: string
  price: string
  description: string
  features: string[]
  ctaLabel: string
  ctaDisabled?: boolean
  onCtaClick?: () => void
  isCurrent?: boolean
  isRecommended?: boolean
  className?: string
}

export function PlanCard({
  name,
  price,
  description,
  features,
  ctaLabel,
  ctaDisabled = false,
  onCtaClick,
  isCurrent = false,
  isRecommended = false,
  className,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isRecommended && "border-primary shadow-lg",
        className
      )}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            Recommended
          </Badge>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
          {isCurrent && (
            <Badge variant="outline" className="ml-2">
              Current plan
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={onCtaClick}
          disabled={ctaDisabled}
          variant={isRecommended ? "default" : "outline"}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  )
}
