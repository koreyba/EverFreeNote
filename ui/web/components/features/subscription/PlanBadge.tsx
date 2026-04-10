"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@ui/web/lib/utils";
import type { Plan } from "@core/types/subscription";

interface PlanBadgeProps {
  plan: Plan;
  className?: string;
  onClick?: () => void;
}

export function PlanBadge({ plan, className, onClick }: PlanBadgeProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default behavior: navigate to pricing page to encourage upgrades
      router.push("/pricing");
    }
  };

  const isPaid = plan === "paid";

  return (
    <Badge
      variant={isPaid ? "default" : "outline"}
      className={cn(
        "cursor-pointer transition-opacity hover:opacity-80",
        // Emerald color for Pro plan creates positive association and differentiates from error states
        isPaid
          ? "border-emerald-500/30 bg-emerald-500 text-white hover:bg-emerald-500/90"
          : "border-border/70 bg-background/70 text-muted-foreground",
        className,
      )}
      onClick={handleClick}
    >
      {isPaid ? "Pro" : "Free"}
    </Badge>
  );
}
