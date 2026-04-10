import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserSubscription, Plan } from "@core/types/subscription";
import { FREE_PLAN_NOTE_LIMIT } from "@core/constants/subscription";

export class SubscriptionService {
  constructor(private supabase: SupabaseClient) {}

  async getSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as UserSubscription | null;
  }

  /**
   * Determine effective plan tier from subscription record.
   *
   * Status handling:
   * - active: Full paid access
   * - past_due: Grace period - payment failed but user retains access while we retry
   * - expired/cancelled/paused/unpaid: Revert to free tier
   *
   * No subscription record = never subscribed = free tier
   */
  getUserPlan(subscription: UserSubscription | null): Plan {
    if (!subscription) return "free";

    const hasActivePaidAccess =
      subscription.plan === "paid" &&
      (subscription.status === "active" || subscription.status === "past_due");

    return hasActivePaidAccess ? "paid" : "free";
  }

  /**
   * Check if user can create another note based on plan and current count.
   *
   * Pro users: unlimited notes
   * Free users: limited by FREE_PLAN_NOTE_LIMIT
   */
  canCreateNote(plan: Plan, currentNoteCount: number): boolean {
    if (plan === "paid") return true;
    return currentNoteCount < FREE_PLAN_NOTE_LIMIT;
  }
}
