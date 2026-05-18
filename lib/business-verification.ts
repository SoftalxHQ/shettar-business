export type VerificationDisplayStatus = "unverified" | "pending" | "verified";

export type BusinessVerification = {
  verification_status: string;
  verification_display_status: VerificationDisplayStatus;
  verification_notes?: string | null;
  verification_requested_at?: string | null;
  verified_at?: string | null;
  can_request_verification?: boolean;
};

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
