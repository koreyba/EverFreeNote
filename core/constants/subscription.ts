import type { Plan } from "@core/types/subscription";

export const FREE_PLAN_NOTE_LIMIT = 5;

export const PLAN_DISPLAY_NAMES: Record<Plan, string> = {
  free: "Free",
  paid: "Pro",
} as const;
