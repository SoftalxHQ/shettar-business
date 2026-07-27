"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { ArrowLeft, Save, Loader2, CreditCard, Building, Pencil, Plus, CheckCircle2, AlertCircle, Trash2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getAuthToken } from "@/lib/storage"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface BankAccount {
  id?: number
  bank_name: string
  account_name: string
  account_number: string
  bank_code?: string
  currency: string
  is_active?: boolean
  rejected?: boolean
  rejection_reason?: string | null
  recipient_code?: string | null
  status: string
  ban_reason?: string | null
  banned_at?: string | null
}

interface Bank {
  id: number
  name: string
  code: string
  active: boolean
}

export default function BankSettingsPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "verified" | "manual">("idle")

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null)
  const [deleteReason, setDeleteReason] = useState("")
  const [isActioning, setIsActioning] = useState(false)

  const initialFormState: BankAccount = {
    bank_name: "",
    account_name: "",
    account_number: "",
    bank_code: "",
    currency: "NGN",
  }

  const [formData, setFormData] = useState<BankAccount>(initialFormState)

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  // Fetch Banks List
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const response = await fetch(`${API_URL}/api/v1/banks`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const uniqueBanks = Array.from(
              new Map(data.data.map((item: Bank) => [item.code, item])).values()
            ) as Bank[]
            setBanks(uniqueBanks)
          }
        }
      } catch (error) {
        console.error("Failed to fetch banks", error)
      }
    }
    fetchBanks()
  }, [])

  // Fetch existing bank accounts
  const fetchBankAccounts = async () => {
    if (!businessId) return
    setIsLoading(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error("Failed to load bank details", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBankAccounts()
  }, [businessId])

  const handleVerifyAccount = async () => {
    if (formData.account_number.length < 10 || !formData.bank_code) {
      toast.error("Please select a bank and enter a valid 10-digit account number.")
      return
    }

    setIsVerifying(true)
    setVerifyStatus("idle")
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const response = await fetch(`${API_URL}/api/v1/banks/resolve_account?account_number=${formData.account_number}&bank_code=${formData.bank_code}`)
      const data = await response.json()

      if (data.success && data.data?.account_name) {
        setFormData(prev => ({ ...prev, account_name: data.data.account_name }))
        setVerifyStatus("verified")
        toast.success(`Account verified: ${data.data.account_name}`)
      } else {
        // Paystack couldn't resolve — common for business/fintech accounts
        setFormData(prev => ({ ...prev, account_name: "" }))
        setVerifyStatus("manual")
        toast.info("Auto-verification unavailable for this account. Please enter the account name manually.")
      }
    } catch {
      setVerifyStatus("manual")
      toast.info("Verification service unavailable. Please enter the account name manually.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_name.trim()) {
      toast.error("Please enter or verify the account name before saving.")
      return
    }

    setIsSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const isEditing = !!editingId
      const url = isEditing
        ? `${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${editingId}`
        : `${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts`

      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method: method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bank_account: {
            bank_name: formData.bank_name,
            account_number: formData.account_number,
            account_name: formData.account_name,
            bank_code: formData.bank_code,
            currency: formData.currency,
          }
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success(`Bank account ${isEditing ? 'updated' : 'added'} successfully.`)
        fetchBankAccounts() // Refresh list
        handleCancel()
      } else {
        if (response.status === 401) {
          logout(true)
          return
        }
        toast.error(data.message || "Failed to save bank details.")
      }
    } catch (error) {
      console.error("Error saving bank details:", error)
      toast.error("An unexpected error occurred.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = (id: number) => {
    setAccountToDelete(id)
    setDeleteReason("")
  }

  const executeDelete = async () => {
    if (!accountToDelete) return
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const queryParams = deleteReason ? `?reason=${encodeURIComponent(deleteReason)}` : ""

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${accountToDelete}${queryParams}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) throw new Error("API returned failure")

      fetchBankAccounts()
      toast.success("Bank account removed.")
      setAccountToDelete(null)
    } catch (error) {
      toast.error("Failed to delete account.")
    } finally {
      setAccountToDelete(null)
    }
  }

  const handleSubmitForVerification = async (id: number) => {
    setIsActioning(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${id}/submit_for_verification`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success("Bank account submitted for verification.")
        fetchBankAccounts()
      } else {
        toast.error(data.message || "Failed to submit for verification.")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsActioning(false)
    }
  }

  const executeBan = async () => {
    if (!banModalId || !banReason.trim()) return
    setIsActioning(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${banModalId}/ban`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason.trim() })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success("Bank account banned.")
        fetchBankAccounts()
        setBanModalId(null)
        setBanReason("")
      } else {
        toast.error(data.message || "Failed to ban account.")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsActioning(false)
    }
  }

  const executeUnban = async () => {
    if (!unbanModalId || !unbanReason.trim()) return
    setIsActioning(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${unbanModalId}/unban`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unbanReason.trim() })
      })
      const data = await response.json()
      if (response.ok && data.success) {
        toast.success("Bank account unbanned.")
        fetchBankAccounts()
        setUnbanModalId(null)
        setUnbanReason("")
      } else {
        toast.error(data.message || "Failed to unban account.")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsActioning(false)
    }
  }

  const startEdit = (account: BankAccount) => {
    setFormData(account)
    setEditingId(account.id!)
    setShowForm(true)
  }

  const startAdd = () => {
    setFormData(initialFormState)
    setEditingId(null)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData(initialFormState)
    setVerifyStatus("idle")
  }

  const handleBankChange = (code: string) => {
    const bank = banks.find(b => b.code === code)
    setFormData(prev => ({
      ...prev,
      bank_code: code,
      bank_name: bank ? bank.name : "",
      account_name: ""
    }))
    setVerifyStatus("idle")
  }

  return (
    <DashboardLayout activeTab="bankdetails">
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/dashboard/business/settings"
              className="mb-1 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Settings
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Bank accounts</h1>
            <p className="text-xs text-slate-500">Manage payout accounts</p>
          </div>
          {!showForm && (
            <Button
              size="sm"
              onClick={startAdd}
              className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Account
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          </div>
        )}

        {!isLoading && !showForm && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="min-h-0 flex-1 overflow-y-auto">
              {accounts.length === 0 ? (
                <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-slate-400">
                  <CreditCard className="mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm font-medium text-slate-600">No bank accounts</p>
                  <p className="mt-1 text-xs">Add a bank account to receive payouts.</p>
                  <Button
                    size="sm"
                    onClick={startAdd}
                    className="mt-3 h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Bank Details
                  </Button>
                </div>
              ) : (
                <ul>
                  {accounts.map((acc) => (
                    <li
                      key={acc.id}
                      className={`flex flex-col gap-2 border-b border-slate-100 px-3.5 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${
                        acc.status === "rejected" ? "bg-red-50/40" :
                        acc.status === "pending" ? "bg-amber-50/30" :
                        acc.status === "banned" ? "bg-slate-50/60" :
                        ""
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <h3 className="text-xs font-semibold text-slate-900">{acc.bank_name}</h3>
                          {acc.status === "rejected" && (
                            <Badge className="rounded-md border-0 bg-red-100 px-1.5 py-0 text-[10px] font-medium text-red-700 shadow-none hover:bg-red-100">
                              <AlertCircle className="mr-0.5 h-2.5 w-2.5" /> Rejected
                            </Badge>
                          )}
                          {acc.status === "verified" && (
                            <Badge className="rounded-md border-0 bg-emerald-100 px-1.5 py-0 text-[10px] font-medium text-emerald-700 shadow-none hover:bg-emerald-100">
                              <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Verified
                            </Badge>
                          )}
                          {acc.status === "pending" && (
                            <Badge className="rounded-md border-0 bg-amber-100 px-1.5 py-0 text-[10px] font-medium text-amber-700 shadow-none hover:bg-amber-100">
                              <AlertCircle className="mr-0.5 h-2.5 w-2.5" /> Pending
                            </Badge>
                          )}
                          {acc.status === "banned" && (
                            <Badge className="rounded-md border-0 bg-slate-200 px-1.5 py-0 text-[10px] font-medium text-slate-600 shadow-none hover:bg-slate-200">
                              Banned
                            </Badge>
                          )}
                          {acc.status === "draft" && (
                            <Badge className="rounded-md border-0 bg-slate-100 px-1.5 py-0 text-[10px] font-medium text-slate-500 shadow-none hover:bg-slate-100">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-slate-600">{acc.account_number}</p>
                        <p className="text-[11px] text-slate-500">{acc.account_name}</p>
                        {acc.status === "rejected" && acc.rejection_reason && (
                          <p className="mt-1 text-[11px] font-medium text-red-600">Reason: {acc.rejection_reason}</p>
                        )}
                        {acc.status === "pending" && (
                          <p className="mt-1 text-[11px] text-amber-700">Under review by admin</p>
                        )}
                        {acc.status === "banned" && acc.ban_reason && (
                          <p className="mt-1 text-[11px] text-slate-500">Ban reason: {acc.ban_reason}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {acc.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 rounded-lg border-slate-200 px-2 text-[11px]" onClick={() => startEdit(acc)}>
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg border-slate-200 px-2 text-[11px]"
                              onClick={() => handleSubmitForVerification(acc.id!)}
                              disabled={isActioning}
                            >
                              Submit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(acc.id!)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {acc.status === "rejected" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 rounded-lg border-slate-200 px-2 text-[11px]" onClick={() => startEdit(acc)}>
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-lg border-slate-200 px-2 text-[11px]"
                              onClick={() => handleSubmitForVerification(acc.id!)}
                              disabled={isActioning}
                            >
                              Resubmit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(acc.id!)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {acc.status === "banned" && (
                          <p className="text-[11px] text-slate-500">Contact admin to unban</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!isLoading && showForm && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Building className="h-3.5 w-3.5 text-slate-400" />
                {editingId ? "Update bank account" : "Add new account"}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Select your bank and verify account details.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bank_select" className="text-xs text-slate-600">Bank name <span className="text-rose-500">*</span></Label>
                  <Select value={formData.bank_code} onValueChange={handleBankChange}>
                    <SelectTrigger className="h-9 w-full rounded-lg border-slate-200">
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {banks.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account_number" className="text-xs text-slate-600">Account number <span className="text-rose-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      id="account_number"
                      placeholder="0123456789"
                      value={formData.account_number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 10)
                        setFormData({ ...formData, account_number: val, account_name: "" })
                        setVerifyStatus("idle")
                      }}
                      required
                      type="text"
                      className="h-9 flex-1 rounded-lg border-slate-200"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleVerifyAccount}
                      disabled={isVerifying || formData.account_number.length !== 10 || !formData.bank_code}
                      className="h-9 min-w-[88px] rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                    >
                      {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="account_name" className="text-xs text-slate-600">
                    Account name
                    {verifyStatus === "manual" && (
                      <span className="ml-2 text-[10px] font-normal text-amber-600">
                        Auto-verify unavailable — enter manually
                      </span>
                    )}
                  </Label>
                  {verifyStatus === "verified" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-900">{formData.account_name}</span>
                    </div>
                  ) : verifyStatus === "manual" ? (
                    <Input
                      id="account_name"
                      placeholder="Enter account name as it appears on the account"
                      value={formData.account_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, account_name: e.target.value }))}
                      required
                      className="h-9 rounded-lg border-amber-200 focus:border-amber-400"
                    />
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="text-xs italic text-slate-400">Verified account name will appear here</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <p className="flex items-center gap-2 text-xs text-amber-800">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Bank accounts require admin verification before they can be used for payouts.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving || !formData.account_name.trim()}
                    className="h-8 min-w-[110px] rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        {editingId ? "Update account" : "Add account"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!accountToDelete}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
        title="Delete Bank Account"
        description="Are you sure you want to delete this account? This will remove it from your available payout methods."
        confirmText="Delete"
        onConfirm={executeDelete}
        confirmDisabled={!deleteReason.trim()}
      >
        <div className="py-2">
          <Label htmlFor="delete-reason" className="text-xs font-medium text-slate-600">
            Reason for deletion <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="delete-reason"
            placeholder="Please provide a reason to continue…"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            className="mt-2 h-9 rounded-lg border-slate-200"
          />
        </div>
      </ConfirmDialog>
    </DashboardLayout>
  )
}
