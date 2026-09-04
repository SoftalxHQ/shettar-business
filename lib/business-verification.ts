export type VerificationDisplayStatus = "unverified" | "pending" | "verified";

export type SalesBlockedReason = "suspended" | "unverified_grace_elapsed";

export type BusinessVerification = {
  verification_status: string;
  verification_display_status: VerificationDisplayStatus;
  verification_notes?: string | null;
  verification_requested_at?: string | null;
  verified_at?: string | null;
  can_request_verification?: boolean;
  can_process_sales?: boolean;
  sales_blocked_reason?: SalesBlockedReason | null;
  unverified_sales_block_at?: string | null;
};

export const SALES_BLOCKED_COPY: Record<
  SalesBlockedReason,
  { title: string; description: string }
> = {
  suspended: {
    title: "Sales paused",
    description:
      "This property has been deactivated by Shettar. New bookings and restaurant payments, including cash and POS, are paused. Contact Shettar to restore access.",
  },
  unverified_grace_elapsed: {
    title: "Sales paused",
    description:
      "Sales are paused until this business is verified. You cannot take new bookings or restaurant payments, including cash and POS.",
  },
};

export const SALES_BLOCKED_TOAST: Record<SalesBlockedReason, string> = {
  suspended: "This property is deactivated. Contact Shettar support to restore access.",
  unverified_grace_elapsed: "Sales are paused until this business is verified.",
};

export function salesBlockedToastMessage(
  payload?: { sales_blocked_reason?: unknown; error?: unknown } | null
): string | null {
  const reason = payload?.sales_blocked_reason;
  if (reason === "suspended" || reason === "unverified_grace_elapsed") {
    return SALES_BLOCKED_TOAST[reason];
  }

  const error = typeof payload?.error === "string" ? payload.error : "";
  if (error.includes("deactivated by Shettar")) return SALES_BLOCKED_TOAST.suspended;
  if (error.includes("paused until this business is verified")) {
    return SALES_BLOCKED_TOAST.unverified_grace_elapsed;
  }
  return null;
}

export const VERIFICATION_LABELS: Record<
  VerificationDisplayStatus,
  { label: string; description: string }
> = {
  unverified: {
    label: "Unverified",
    description: "Submit your business for Shettar verification to appear in guest search and unlock full platform features.",
  },
  pending: {
    label: "Pending",
    description: "Your verification request is under review. We will notify you once an admin has completed the review.",
  },
  verified: {
    label: "Verified",
    description: "Your business is verified on Shettar and visible to guests.",
  },
};

export function verificationBadgeClass(status: VerificationDisplayStatus): string {
  switch (status) {
    case "verified":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30";
    case "pending":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

export function salesBlockedBannerClass(): string {
  return "bg-red-50 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-500/30";
}

export function parseBusinessVerification(data: Record<string, unknown>): BusinessVerification {
  const display = data.verification_display_status;
  return {
    verification_status: String(data.verification_status ?? "pending"),
    verification_display_status:
      display === "verified" || display === "pending" || display === "unverified"
        ? display
        : "unverified",
    verification_notes: (data.verification_notes as string | null) ?? null,
    verification_requested_at: (data.verification_requested_at as string | null) ?? null,
    verified_at: (data.verified_at as string | null) ?? null,
    can_request_verification: data.can_request_verification === true,
    can_process_sales: data.can_process_sales !== false,
    sales_blocked_reason:
      data.sales_blocked_reason === "suspended" ||
      data.sales_blocked_reason === "unverified_grace_elapsed"
        ? data.sales_blocked_reason
        : null,
    unverified_sales_block_at: (data.unverified_sales_block_at as string | null) ?? null,
  };
}
