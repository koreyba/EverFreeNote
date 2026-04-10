import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserSubscription, Plan } from '@core/types/subscription'
import { FREE_PLAN_NOTE_LIMIT } from '@core/constants/subscription'

export class SubscriptionService {
  constructor(private supabase: SupabaseClient) {}

  async getSubscription(userId: string): Promise<UserSubscription | null> {
    const { data, error } = await this.supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as UserSubscription | null
  }

  getUserPlan(subscription: UserSubscription | null): Plan {
    // No subscription row → free plan
    if (!subscription) return 'free'

    // Has paid subscription with active status → paid
    if (
      subscription.plan === 'paid' &&
      (subscription.status === 'active' || subscription.status === 'past_due')
    ) {
      return 'paid'
    }

    // All other cases (expired, cancelled, paused, unpaid) → free
    return 'free'
  }

  canCreateNote(plan: Plan, currentNoteCount: number): boolean {
    if (plan === 'paid') return true
    return currentNoteCount < FREE_PLAN_NOTE_LIMIT
  }
}
