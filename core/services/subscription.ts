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

  getUserPlan(subscription: UserSubscription | null): Plan {
    // No subscription row means user has never subscribed
    if (!subscription) return "free";

    // Active and past_due subscriptions still grant paid features
    // past_due allows grace period before downgrading
    if (
      subscription.plan === "paid" &&
      (subscription.status === "active" || subscription.status === "past_due")
    ) {
      return "paid";
    }

    // All other statuses (expired, cancelled, paused, unpaid) revert to free tier
    return "free";
  }

  canCreateNote(plan: Plan, currentNoteCount: number): boolean {
    if (plan === "paid") return true;
    return currentNoteCount < FREE_PLAN_NOTE_LIMIT;
  }
}
