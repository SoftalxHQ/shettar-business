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
import { ArrowLeft, Save, Loader2, CreditCard, Building, Pencil, Plus, CheckCircle2, AlertCircle, Trash2, Star } from "lucide-react"
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
  recipient_code?: string | null
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

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [accountToDelete, setAccountToDelete] = useState<number | null>(null)
  const [deleteReason, setDeleteReason] = useState("")

  const initialFormState: BankAccount = {
    bank_name: "",
    account_name: "",
    account_number: "",
    bank_code: "",
    currency: "NGN",
    is_active: true
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
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/api/v1/banks/resolve_account?account_number=${formData.account_number}&bank_code=${formData.bank_code}`)
      const data = await response.json()

      if (data.success) {
        setFormData(prev => ({ ...prev, account_name: data.data.account_name }))
        toast.success(`Account verified: ${data.data.account_name}`)
      } else {
        setFormData(prev => ({ ...prev, account_name: "" }))
        toast.error(data.message || "Could not verify account details.")
      }
    } catch (error) {
      toast.error("Verification service unreachable.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_name) {
      toast.error("Please verify the account details before saving.")
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
        body: JSON.stringify(formData)
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

  const handleSetActive = async (id: number) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bank_account: { is_active: true } })
      })

      if (!response.ok) throw new Error("API returned failure")

      fetchBankAccounts()
      toast.success("Primary payout account updated.")
    } catch (error) {
      toast.error("Failed to update active account.")
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

      await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_accounts/${accountToDelete}${queryParams}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })

      fetchBankAccounts()
      toast.success("Bank account removed.")
      setAccountToDelete(null)
    } catch (error) {
      toast.error("Failed to delete account.")
    } finally {
      setAccountToDelete(null)
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
  }

  const handleBankChange = (code: string) => {
    const bank = banks.find(b => b.code === code)
    setFormData(prev => ({
      ...prev,
      bank_code: code,
      bank_name: bank ? bank.name : "",
      account_name: ""
    }))
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
                <Card key={acc.id} className={`border transition-all ${acc.is_active ? 'border-indigo-600 shadow-md ring-1 ring-indigo-600' : 'border-slate-200 hover:border-indigo-300'}`}>
                  <CardContent className="p-6 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-slate-900">{acc.bank_name}</h3>
                        {acc.is_active && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0">Primary</Badge>}
                      </div>
                      <p className="font-mono text-slate-600">{acc.account_number}</p>
                      <p className="text-sm text-slate-500">{acc.account_name}</p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!acc.is_active && (
                        <Button size="sm" variant="ghost" onClick={() => handleSetActive(acc.id!)} title="Set as Primary">
                          <Star className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                        </Button>
                      )}
                      {!acc.recipient_code ? (
                        <Button size="sm" variant="outline" onClick={() => startEdit(acc)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleDelete(acc.id!)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
                    <Label htmlFor="account_name">Account Name</Label>
                    <div className={`flex items-center gap-2 border rounded-md px-3 py-2 bg-slate-50 ${formData.account_name ? "border-green-200 bg-green-50" : "border-slate-200"}`}>
                      {formData.account_name ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-sm font-medium text-green-900">{formData.account_name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Verified account name will appear here</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    <Label htmlFor="is_active" className="cursor-pointer">Set as primary payout account</Label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving || !formData.account_name}
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
