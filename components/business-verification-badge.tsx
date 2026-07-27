"use client";

import { Badge } from "@/components/ui/badge";
import {
  type VerificationDisplayStatus,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/business-verification";
import { cn } from "@/lib/utils";
import { BadgeCheck } from "lucide-react";

export function BusinessVerificationBadge({
  status,
  className,
  compact = false,
}: {
  status: VerificationDisplayStatus;
  className?: string;
  /** Tiny pill for top bars — icon + short label */
  compact?: boolean;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold uppercase tracking-wide border",
        compact
          ? "h-4 gap-0.5 rounded-full px-1.5 py-0 text-[9px] leading-none"
          : "text-[10px]",
        verificationBadgeClass(status),
        className,
      )}
    >
      {status === "verified" && (
        <BadgeCheck className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3", "shrink-0")} />
      )}
      {VERIFICATION_LABELS[status].label}
    </Badge>
  );
}
