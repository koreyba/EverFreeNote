export type Plan = 'free' | 'paid'

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'past_due'
  | 'paused'
  | 'unpaid'

export type UserSubscription = {
  user_id: string
  plan: Plan
  ls_subscription_id: string | null
  ls_customer_id: string | null
  status: SubscriptionStatus
  current_period_end: string | null
  created_at: string
  updated_at: string
}
