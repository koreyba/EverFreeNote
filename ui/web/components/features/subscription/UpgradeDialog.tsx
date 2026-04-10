"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCount: number;
  limit: number;
}

export function UpgradeDialog({
  open,
  onOpenChange,
  currentCount,
  limit,
}: UpgradeDialogProps) {
  const router = useRouter();

  const handleViewPlans = () => {
    onOpenChange(false);
    router.push("/pricing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Note limit reached</DialogTitle>
          </div>
          <DialogDescription className="pt-4 text-base">
            {/* Show current usage to help user understand their situation */}
            You&apos;ve used{" "}
            <span className="font-semibold">
              {currentCount} of {limit} notes
            </span>{" "}
            on the Free plan. Upgrade to Pro for unlimited notes and support
            future development.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button onClick={handleViewPlans}>View plans</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
