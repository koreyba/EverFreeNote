"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNoteAuth } from "@ui/web/hooks/useNoteAuth";
import { useSubscription } from "@ui/web/hooks/useSubscription";
import {
  FREE_PLAN_NOTE_LIMIT,
  PLAN_DISPLAY_NAMES,
} from "@core/constants/subscription";
import { useNotesQuery } from "@ui/web/hooks/useNotesQuery";
import {
  settingsActionButtonClassName,
  settingsActionRowClassName,
  settingsInsetPanelClassName,
  settingsSectionCardClassName,
} from "@/components/features/settings/settingsLayout";

/**
 * Format a date string for display in the subscription panel.
 * Returns a localized long-form date (e.g., "January 15, 2024").
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function SubscriptionSettingsPanel() {
  const router = useRouter();
  const { user } = useNoteAuth();
  const { plan, isPaid, subscription, isLoading } = useSubscription({
    userId: user?.id,
  });

  const notesQuery = useNotesQuery({ userId: user?.id, enabled: !!user?.id });
  const totalNotes = notesQuery.data?.pages[0]?.totalCount ?? 0;

  const handleUpgrade = () => {
    router.push("/pricing");
  };

  const handleManageSubscription = () => {
    // Opens Lemon Squeezy customer portal for subscription management (cancel, update payment method).
    // Lemon Squeezy doesn't provide per-subscription portal URLs, so we direct users to their orders page.
    window.open(
      "https://app.lemonsqueezy.com/my-orders",
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="space-y-6">
      <Card className={settingsSectionCardClassName}>
        <CardHeader className="space-y-4 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <CardTitle>Current plan</CardTitle>
              <CardDescription>
                Manage your subscription and view plan details
              </CardDescription>
            </div>
            <Badge
              variant={isPaid ? "default" : "outline"}
              className={
                isPaid
                  ? "border-emerald-500/30 bg-emerald-500 text-white"
                  : "border-border/70 bg-background/70 text-muted-foreground"
              }
            >
              {isLoading ? "Loading..." : PLAN_DISPLAY_NAMES[plan]}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Plan Details */}
          <div className={settingsInsetPanelClassName}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plan</span>
                <span className="text-sm text-muted-foreground">
                  {PLAN_DISPLAY_NAMES[plan]}
                </span>
              </div>

              {isPaid && subscription?.current_period_end && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <span className="text-sm capitalize text-muted-foreground">
                      {subscription.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Renewal date</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                </>
              )}

              {!isPaid && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Notes</span>
                  <span className="text-sm text-muted-foreground">
                    {totalNotes} of {FREE_PLAN_NOTE_LIMIT} used
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Message */}
          {isPaid ? (
            <div className="rounded-md border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-600/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              You have unlimited notes on the Pro plan. Thank you for supporting
              EverFreeNote!
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Upgrade to Pro for unlimited notes, AI search, and more features.
            </div>
          )}

          {/* Actions */}
          <div className={settingsActionRowClassName}>
            {isPaid ? (
              <Button
                onClick={handleManageSubscription}
                className={settingsActionButtonClassName}
              >
                Manage subscription
              </Button>
            ) : (
              <Button
                onClick={handleUpgrade}
                className={settingsActionButtonClassName}
              >
                Upgrade to Pro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
