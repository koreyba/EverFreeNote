import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useSupabase } from "@ui/web/providers/SupabaseProvider";
import { SubscriptionService } from "@core/services/subscription";
import type { UserSubscription, Plan } from "@core/types/subscription";

interface UseSubscriptionOptions {
  userId?: string;
  enabled?: boolean;
}

interface UseSubscriptionResult {
  subscription: UserSubscription | null;
  plan: Plan;
  isPaid: boolean;
  isFree: boolean;
  canCreateNote: (currentNoteCount: number) => boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook for fetching user subscription status and plan information.
 *
 * Uses React Query for caching with 5-minute stale time to reduce database load
 * while keeping subscription status reasonably fresh for billing changes.
 */
export function useSubscription({
  userId,
  enabled = true,
}: UseSubscriptionOptions = {}): UseSubscriptionResult {
  const { supabase } = useSupabase();
  const subscriptionService = useMemo(
    () => new SubscriptionService(supabase),
    [supabase],
  );

  const result = useQuery<UserSubscription | null>({
    queryKey: ["subscription", userId],
    queryFn: async () => {
      if (!userId) return null;
      return subscriptionService.getSubscription(userId);
    },
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - balances freshness with performance
  });

  const subscription = result.data ?? null;
  const plan = subscriptionService.getUserPlan(subscription);
  const isPaid = plan === "paid";
  const isFree = plan === "free";

  const canCreateNote = (currentNoteCount: number): boolean => {
    return subscriptionService.canCreateNote(plan, currentNoteCount);
  };

  return {
    subscription,
    plan,
    isPaid,
    isFree,
    canCreateNote,
    isLoading: result.isLoading,
    error: result.error ? String(result.error) : null,
    refetch: result.refetch,
  };
}
