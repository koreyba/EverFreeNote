import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Check } from "lucide-react";
import { cn } from "@ui/web/lib/utils";
import { FREE_PLAN_NOTE_LIMIT } from "@core/constants/subscription";

// Since we can't use jest.mock in Storybook with Vite, we'll create a self-contained
// PricingPage component that doesn't rely on hooks that need mocking

interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCtaClick?: () => void;
  isCurrent?: boolean;
  isRecommended?: boolean;
  className?: string;
}

function PlanCard({
  name,
  price,
  description,
  features,
  ctaLabel,
  ctaDisabled = false,
  onCtaClick,
  isCurrent = false,
  isRecommended = false,
  className,
}: PlanCardProps) {
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isRecommended && "border-primary shadow-lg",
        className
      )}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            Recommended
          </Badge>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{name}</span>
          {isCurrent && (
            <Badge variant="outline" className="ml-2">
              Current plan
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={onCtaClick}
          disabled={ctaDisabled}
          variant={isRecommended ? "default" : "outline"}
        >
          {ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface PricingPageStoryProps {
  isPaid: boolean;
  isLoading?: boolean;
  hasUser?: boolean;
}

function PricingPageStory({ isPaid, isLoading = false, hasUser = true }: PricingPageStoryProps) {
  const freePlanFeatures = [
    `Up to ${FREE_PLAN_NOTE_LIMIT} notes`,
    "Basic note creation and editing",
    "Tag organization",
    "Full-text search",
  ];

  const proPlanFeatures = [
    "Unlimited notes",
    "All Free plan features",
    "AI-powered semantic search",
    "WordPress integration",
    "ENEX import/export",
    "Priority support",
    "Support future development",
  ];

  const handleSubscribe = () => {
    // Mock action - would open Lemon Squeezy checkout
    console.log("Opening checkout...");
  };

  const handleBack = () => {
    // Mock action - would navigate back
    console.log("Going back...");
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
              features={freePlanFeatures}
              ctaLabel={isPaid ? "Downgrade" : "Current plan"}
              ctaDisabled={true}
              isCurrent={!isPaid && !isLoading}
            />

            {/* Pro Plan */}
            <PlanCard
              name="Pro"
              price="$5/mo"
              description="For serious note-takers"
              features={proPlanFeatures}
              ctaLabel={isPaid ? "Manage subscription" : "Subscribe"}
              ctaDisabled={isLoading || !hasUser}
              onCtaClick={handleSubscribe}
              isCurrent={isPaid}
              isRecommended={!isPaid}
            />
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All existing notes remain accessible when downgrading. You just can&apos;t create new notes if you exceed the limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof PricingPageStory> = {
  title: "Features/Subscription/PricingPage",
  component: PricingPageStory,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof PricingPageStory>;

export const FreePlan: Story = {
  name: "Free Plan (Default)",
  args: {
    isPaid: false,
    isLoading: false,
    hasUser: true,
  },
};

export const ProPlan: Story = {
  name: "Pro Plan (Paid)",
  args: {
    isPaid: true,
    isLoading: false,
    hasUser: true,
  },
};
