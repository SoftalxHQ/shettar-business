"use client";

import { Badge } from "@/components/ui/badge";
import {
  type VerificationDisplayStatus,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/business-verification";
import { cn } from "@/lib/utils";

export function BusinessVerificationBadge({
  status,
  className,
}: {
  status: VerificationDisplayStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-[10px] uppercase tracking-wide border",
        verificationBadgeClass(status),
        className,
      )}
    >
      {VERIFICATION_LABELS[status].label}
    </Badge>
  );
}
