"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { getAuthToken } from "@/lib/storage";
import {
  type BusinessVerification,
  type VerificationDisplayStatus,
  VERIFICATION_LABELS,
  verificationBadgeClass,
} from "@/lib/business-verification";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function BusinessVerificationBanner({
  onStatusChange,
}: {
  onStatusChange?: (status: VerificationDisplayStatus) => void;
}) {
  const { businessId, user } = useAuth();
  const [verification, setVerification] = useState<BusinessVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const v: BusinessVerification = {
        verification_status: data.verification_status,
        verification_display_status: data.verification_display_status || "unverified",
        verification_notes: data.verification_notes,
        verification_requested_at: data.verification_requested_at,
        verified_at: data.verified_at,
        can_request_verification: data.can_request_verification,
      };
      setVerification(v);
      onStatusChange?.(v.verification_display_status);
    } catch {
      // silent — banner is supplementary
    } finally {
      setLoading(false);
    }
  }, [businessId, onStatusChange]);

  useEffect(() => {
    load();
  }, [load]);

  const requestVerification = async () => {
    if (!businessId) return;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/request_verification`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Business-Id": businessId,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not submit verification request");
        return;
      }
      toast.success(data.message || "Verification request submitted");
      await load();
    } catch {
      toast.error("Unable to connect to the server");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !verification || user?.role === "staff") {
    return null;
  }

  const status = verification.verification_display_status;
  if (status === "verified") {
    return null;
  }

  const { label, description } = VERIFICATION_LABELS[status];
  const isRejected =
    verification.verification_status === "rejected" && !!verification.verification_notes;

  const Icon =
    status === "pending" ? Clock : isRejected ? AlertCircle : ShieldCheck;

  return (
    <div className={cn(
      "mb-6 rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4",
      verificationBadgeClass(status),
    )}>
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            Business verification: {label}
          </p>
          <p className="text-sm opacity-90 mt-0.5">{description}</p>
          {isRejected && (
            <p className="text-sm mt-2 font-medium">
              Admin note: {verification.verification_notes}
            </p>
          )}
        </div>
      </div>

      {verification.can_request_verification && (
        <Button
          size="sm"
          onClick={requestVerification}
          disabled={submitting}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Submitting…
            </>
          ) : status === "unverified" && isRejected ? (
            "Resubmit for verification"
          ) : (
            "Request verification"
          )}
        </Button>
      )}

      {status === "pending" && (
        <div className="flex items-center gap-2 text-sm font-medium shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          Submitted — awaiting review
        </div>
      )}
    </div>
  );
}
