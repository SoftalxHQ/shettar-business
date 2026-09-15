"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { PartnerAgreementDocument } from "@/components/legal/partner-agreement-document"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/lib/auth-context"
import { isAdminOrOwner } from "@/lib/guest-policies-access"
import {
  acceptPartnerAgreement,
  fetchBusinessPartnerAgreement,
  notifyPartnerAgreementUpdated,
  type PartnerAgreement,
} from "@/lib/partner-agreement"
import { downloadPartnerAgreementPdf } from "@/lib/partner-agreement-pdf"
import { format } from "date-fns"
import { CheckCircle2, Download, FileText, Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

function formatAgreementDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return format(date, "d MMMM yyyy")
}

export default function CompliancePage() {
  const { user, businessId, businessName } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [businessLabel, setBusinessLabel] = useState("")
  const [address, setAddress] = useState<string | null>(null)
  const [uniqueId, setUniqueId] = useState("")
  const [agreement, setAgreement] = useState<PartnerAgreement | null>(null)
  const [todayTick, setTodayTick] = useState(() => new Date())
  const [draftFullName, setDraftFullName] = useState("")
  const [draftRole, setDraftRole] = useState("")
  const [isDownloading, setIsDownloading] = useState(false)

  const canAccept = isAdminOrOwner(user)

  const load = useCallback(async () => {
    if (!businessId) return
    setIsLoading(true)
    try {
      const business = await fetchBusinessPartnerAgreement(businessId)
      setBusinessLabel(business.name || businessName || user?.hotelName || "")
      setAddress(business.address || null)
      setUniqueId(business.business_unique_id || String(businessId))
      setAgreement(
        business.partner_agreement || {
          version: "1.0",
          signed_at: null,
          signed_by_name: null,
          signed_by_role: null,
          signed: false,
        }
      )
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to load agreement")
      setBusinessLabel(businessName || user?.hotelName || "")
      setUniqueId(String(businessId))
      setAgreement({
        version: "1.0",
        signed_at: null,
        signed_by_name: null,
        signed_by_role: null,
        signed: false,
      })
    } finally {
      setIsLoading(false)
    }
  }, [businessId, businessName, user?.hotelName])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (agreement?.signed && !agreement?.needs_signer_details) return
    const id = window.setInterval(() => setTodayTick(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [agreement?.signed, agreement?.needs_signer_details])

  const signed = !!agreement?.signed && !!agreement?.signed_at
  const needsSignerDetails = !!agreement?.needs_signer_details
  const signatureComplete =
    signed && !!agreement?.signed_by_name?.trim() && !!agreement?.signed_by_role?.trim()

  const effectiveDateLabel = useMemo(() => {
    if (signed && agreement?.signed_at) return formatAgreementDate(agreement.signed_at)
    return formatAgreementDate(todayTick)
  }, [signed, agreement?.signed_at, todayTick])

  const signedAtLabel = signed && agreement?.signed_at
    ? formatAgreementDate(agreement.signed_at)
    : null

  const showSignInputs = canAccept && (!signed || needsSignerDetails || !signatureComplete)

  const canSubmit =
    canAccept &&
    showSignInputs &&
    draftFullName.trim().length > 0 &&
    draftRole.trim().length > 0

  const handleAccept = async () => {
    if (!businessId || !canSubmit) return
    setIsAccepting(true)
    try {
      const updated = await acceptPartnerAgreement(businessId, {
        full_name: draftFullName.trim(),
        role: draftRole.trim(),
      })
      setAgreement(updated)
      setDraftFullName("")
      setDraftRole("")
      setConfirmOpen(false)
      notifyPartnerAgreementUpdated()
      toast.success(
        needsSignerDetails ? "Signature details saved" : "Partner agreement accepted"
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept agreement")
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (isLoading) {
      toast.error("Agreement is still loading")
      return
    }
    setIsDownloading(true)
    try {
      await downloadPartnerAgreementPdf({
        businessName: businessLabel || user?.hotelName || "business",
        businessId: uniqueId || String(businessId || ""),
        address,
        effectiveDateLabel,
        agreementId: uniqueId || String(businessId || ""),
        signed: signatureComplete,
        signedByName: agreement?.signed_by_name,
        signedByRole: agreement?.signed_by_role,
        commissionRate: agreement?.commission_rate,
        maximumWithdrawalCommission: agreement?.maximum_withdrawal_commission,
        primaryContactName: agreement?.primary_contact_name,
        primaryContactTitle: agreement?.primary_contact_title,
        primaryContactEmail: agreement?.primary_contact_email,
        primaryContactPhone: agreement?.primary_contact_phone,
      })
      toast.success("Agreement PDF downloaded")
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to download PDF")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Compliance</h1>
                {signatureComplete ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-800"
                  >
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                    Signed on {signedAtLabel}
                  </Badge>
                ) : signed ? (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                    Complete signature
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
                    Unsigned
                  </Badge>
                )}
              </div>
              <p className="max-w-2xl text-sm text-slate-500">
                Review the Shettar Business Partner Agreement for{" "}
                <span className="font-medium text-slate-700">
                  {businessLabel || user?.hotelName || "your property"}
                </span>
                . Accepting locks the effective date to the day you sign.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isLoading || isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Download PDF
            </Button>
          </div>

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-slate-200 bg-white">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-8">
              <PartnerAgreementDocument
                businessName={businessLabel || user?.hotelName || ""}
                businessId={uniqueId || String(businessId || "")}
                address={address}
                effectiveDateLabel={effectiveDateLabel}
                agreementId={uniqueId || String(businessId || "")}
                signed={signatureComplete}
                signedByName={agreement?.signed_by_name}
                signedByRole={agreement?.signed_by_role}
                showSignInputs={showSignInputs}
                draftFullName={draftFullName}
                draftRole={draftRole}
                onDraftFullNameChange={setDraftFullName}
                onDraftRoleChange={setDraftRole}
                commissionRate={agreement?.commission_rate}
                maximumWithdrawalCommission={agreement?.maximum_withdrawal_commission}
                primaryContactName={agreement?.primary_contact_name}
                primaryContactTitle={agreement?.primary_contact_title}
                primaryContactEmail={agreement?.primary_contact_email}
                primaryContactPhone={agreement?.primary_contact_phone}
                signAction={
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => setConfirmOpen(true)}
                    disabled={!canSubmit || isAccepting}
                  >
                    {isAccepting ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-1.5 h-4 w-4" />
                    )}
                    {needsSignerDetails || (signed && !signatureComplete)
                      ? "Save signature"
                      : "Accept agreement"}
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          needsSignerDetails || (signed && !signatureComplete)
            ? "Save signature details?"
            : "Accept Business Partner Agreement?"
        }
        description={`You are signing as ${draftFullName.trim()} (${draftRole.trim()}) for ${businessLabel || "this business"}.${
          signed && agreement?.signed_at
            ? ""
            : ` The effective date will be fixed to today (${formatAgreementDate(new Date())}).`
        }`}
        confirmText={
          needsSignerDetails || (signed && !signatureComplete)
            ? "Save signature"
            : "Accept agreement"
        }
        cancelText="Cancel"
        isDestructive={false}
        loading={isAccepting}
        confirmDisabled={!canSubmit}
        onConfirm={handleAccept}
      />
    </DashboardLayout>
  )
}
