"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/features/subscription/PlanCard";
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth";
import { useSubscription } from "@ui/web/hooks/useSubscription";
import { openCheckout } from "@ui/web/lib/lemonsqueezy";
import { FREE_PLAN_NOTE_LIMIT } from "@core/constants/subscription";

// Feature lists for each tier - defined at module level for clarity and potential reuse
const FREE_PLAN_FEATURES = [
  `Up to ${FREE_PLAN_NOTE_LIMIT} notes`,
  "Basic note creation and editing",
  "Tag organization",
  "Full-text search",
];

const PRO_PLAN_FEATURES = [
  "Unlimited notes",
  "All Free plan features",
  "AI-powered semantic search",
  "WordPress integration",
  "ENEX import/export",
  "Priority support",
  "Support future development",
];

export function PricingPage() {
  const router = useRouter();
  const { user } = useNoteAuth();
  const { isPaid, isLoading } = useSubscription({ userId: user?.id });

  const handleSubscribe = () => {
    // Guard: only authenticated users can start checkout flow
    // Prevents opening payment window for logged-out users
    if (!user) return;

    openCheckout({
      email: user.email ?? undefined,
      userId: user.id,
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">EverFreeNote</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-5xl">
          {/* Page Header */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Choose your plan
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free, upgrade anytime for unlimited notes
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Free Plan */}
            <PlanCard
              name="Free"
              price="$0"
              description="Perfect for getting started"
              features={FREE_PLAN_FEATURES}
              ctaLabel={isPaid ? "Downgrade" : "Current plan"}
              ctaDisabled={true}
              isCurrent={!isPaid && !isLoading}
            />

            {/* Pro Plan */}
            <PlanCard
              name="Pro"
              price="$5/mo"
              description="For serious note-takers"
              features={PRO_PLAN_FEATURES}
              ctaLabel={isPaid ? "Manage subscription" : "Subscribe"}
              ctaDisabled={isLoading || !user}
              onCtaClick={handleSubscribe}
              isCurrent={isPaid}
              isRecommended={!isPaid}
            />
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All existing notes remain accessible when downgrading. You just
              can&apos;t create new notes if you exceed the limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
