"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/business/settings" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bank Accounts</h1>
              <p className="text-slate-500">Manage payout accounts.</p>
            </div>
          </div>
          {!showForm && (
            <Button onClick={startAdd} className="bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" /> Add Account
            </Button>
          )}
        </div>

        {/* LOADING */}
        {isLoading && (
          <Card className="border-0 shadow-sm p-8 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </Card>
        )}

        {/* ACCOUNTS LIST */}
        {!isLoading && !showForm && (
          <div className="space-y-4">
            {accounts.length === 0 ? (
              <Card className="border-2 border-dashed border-slate-200 shadow-none bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bank Accounts</h3>
                  <p className="text-slate-500 max-w-sm mb-6">
                    Add a bank account to receive payouts.
                  </p>
                  <Button onClick={startAdd} className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" /> Add Bank Details
                  </Button>
                </CardContent>
              </Card>
            ) : (
              accounts.map((acc) => (
                <Card key={acc.id} className={`border transition-all ${
                  acc.status === "rejected" ? 'border-red-300 bg-red-50/30' :
                  acc.status === "verified" ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600' :
                  acc.status === "banned"   ? 'border-slate-400 bg-slate-50/50' :
                  acc.status === "pending"  ? 'border-orange-300 bg-orange-50/20' :
                  'border-slate-200 hover:border-indigo-300'
                }`}>
                  <CardContent className="p-6 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-slate-900">{acc.bank_name}</h3>
                        {acc.status === "rejected" && (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Rejected
                          </Badge>
                        )}
                        {acc.status === "verified" && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </Badge>
                        )}
                        {acc.status === "pending" && (
                          <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-200 border-0 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Pending Verification
                          </Badge>
                        )}
                        {acc.status === "banned" && (
                          <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-300 border-0 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Banned
                          </Badge>
                        )}
                        {acc.status === "draft" && (
                          <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-0">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-slate-600">{acc.account_number}</p>
                      <p className="text-sm text-slate-500">{acc.account_name}</p>
                      {acc.status === "rejected" && acc.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1 font-medium">Reason: {acc.rejection_reason}</p>
                      )}
                      {acc.status === "pending" && (
                        <p className="text-xs text-orange-600 mt-1">Under review by admin</p>
                      )}
                      {acc.status === "banned" && acc.ban_reason && (
                        <p className="text-xs text-slate-500 mt-1 font-medium">Ban reason: {acc.ban_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                      {/* draft: Edit + Delete + Submit */}
                      {acc.status === "draft" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(acc)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="border-indigo-400 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleSubmitForVerification(acc.id!)} disabled={isActioning}>
                            Submit for Verification
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(acc.id!)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {/* pending: no actions */}
                      {/* verified: no actions for business (admin manages ban/unban) */}
                      {/* rejected: Edit + Resubmit + Delete */}
                      {acc.status === "rejected" && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(acc)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" className="border-indigo-400 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => handleSubmitForVerification(acc.id!)} disabled={isActioning}>
                            Resubmit for Verification
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(acc.id!)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {/* banned: contact admin message */}
                      {acc.status === "banned" && (
                        <p className="text-xs text-slate-500">Contact admin to unban</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* FORM MODE */}
        {!isLoading && showForm && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {editingId ? "Update Bank Account" : "Add New Account"}
              </CardTitle>
              <CardDescription>
                Select your bank and verify account details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_select">Bank Name <span className="text-rose-500">*</span></Label>
                    <Select value={formData.bank_code} onValueChange={handleBankChange}>
                      <SelectTrigger className="w-full">
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

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number <span className="text-rose-500">*</span></Label>
                    <div className="flex gap-2">
                      <Input
                        id="account_number"
                        placeholder="0123456789"
                        value={formData.account_number}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, account_number: val, account_name: "" });
                          setVerifyStatus("idle")
                        }}
                        required
                        type="text"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleVerifyAccount}
                        disabled={isVerifying || formData.account_number.length !== 10 || !formData.bank_code}
                        className="min-w-[100px]"
                      >
                        {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_name">
                      Account Name
                      {verifyStatus === "manual" && (
                        <span className="ml-2 text-xs text-orange-500 font-normal">
                          Auto-verify unavailable — enter manually
                        </span>
                      )}
                    </Label>
                    {verifyStatus === "verified" ? (
                      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-green-50 border-green-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-green-900">{formData.account_name}</span>
                      </div>
                    ) : verifyStatus === "manual" ? (
                      <Input
                        id="account_name"
                        placeholder="Enter account name as it appears on the account"
                        value={formData.account_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, account_name: e.target.value }))}
                        required
                        className="border-orange-200 focus:border-orange-400"
                      />
                    ) : (
                      <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-slate-50 border-slate-200">
                        <span className="text-sm text-slate-400 italic">Verified account name will appear here</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                    <p className="text-sm text-orange-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Bank accounts require admin verification before they can be used for payouts.
                    </p>
                  </div>

                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !formData.account_name.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editingId ? "Update Account" : "Add Account"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
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
          <Label htmlFor="delete-reason" className="text-sm font-medium">Reason for deletion <span className="text-rose-500">*</span></Label>
          <Input 
            id="delete-reason" 
            placeholder="Please provide a reason to continue..." 
            value={deleteReason} 
            onChange={(e) => setDeleteReason(e.target.value)} 
            className="mt-2"
          />
        </div>
      </ConfirmDialog>

    </DashboardLayout>
  )
}
