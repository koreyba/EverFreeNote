-- User subscription records (managed by Lemon Squeezy webhook)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'paid')),
  ls_subscription_id TEXT,
  ls_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'paused', 'unpaid')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_subscriptions_ls_subscription_id_idx
  ON public.user_subscriptions(ls_subscription_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_ls_customer_id_idx
  ON public.user_subscriptions(ls_customer_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON public.user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only read their own subscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND policyname = 'Users can view own subscription'
  ) THEN
    CREATE POLICY "Users can view own subscription"
      ON public.user_subscriptions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Service role manages subscriptions (webhook writes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_subscriptions'
      AND policyname = 'Service role manages subscriptions'
  ) THEN
    CREATE POLICY "Service role manages subscriptions"
      ON public.user_subscriptions
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
