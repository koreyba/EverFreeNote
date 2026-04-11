import * as React from "react";
import { PricingPage } from "@/components/features/subscription/PricingPage";

export const metadata = {
  title: "Pricing - EverFreeNote",
  description: "Choose the plan that's right for you",
};

export default function PricingRoute() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-background" />}>
      <PricingPage />
    </React.Suspense>
  );
}
