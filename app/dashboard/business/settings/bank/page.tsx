"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import React, { useState, useEffect } from "react"
import { ArrowLeft, Save, Loader2, CreditCard, Building, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { getAuthToken } from "@/lib/storage"

interface BankAccount {
  id?: number
  bank_name: string
  account_name: string
  account_number: string
  swift_code?: string
  currency: string
}

export default function BankSettingsPage() {
  const { toast } = useToast()
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState<BankAccount>({
    bank_name: "",
    account_name: "",
    account_number: "",
    swift_code: "", // Optional but good for business
    currency: "NGN"
  })

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  // Fetch existing bank details 
  useEffect(() => {
    const fetchBankDetails = async () => {
      if (!businessId) return
      setIsLoading(true)
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()

        const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_account`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          // Assuming API returns data directly or wrapped in data property
          // Adjust based on your API response structure 
          const account = data.data || data

          if (account && account.account_number) {
            setBankAccount(account)
            setFormData(account)
          }
        }
      } catch (error) {
        console.error("Failed to load bank details", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBankDetails()
  }, [businessId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()

      // Assuming endpoint to save/update bank details
      const response = await fetch(`${API_URL}/api/v1/user_businesses/${businessId}/bank_account`, {
        method: "POST", // or PUT/PATCH depending on backend
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Bank account details saved successfully.",
        })
        const newAccount = data.data || data
        setBankAccount(newAccount)
        setShowForm(false)
      } else {
        if (response.status === 401) {
          logout(true)
          return
        }
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to save bank details.",
        })
      }
    } catch (error) {
      console.error("Error saving bank details:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = () => {
    setFormData(bankAccount!)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    if (bankAccount) {
      setFormData(bankAccount)
    } else {
      setFormData({
        bank_name: "",
        account_name: "",
        account_number: "",
        swift_code: "",
        currency: "NGN"
      })
    }
  }

  return (
    <DashboardLayout activeTab="bankdetails">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/business/settings" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bank Account Details</h1>
            <p className="text-slate-500">Add or update your business bank account for payouts.</p>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <Card className="border-0 shadow-sm p-8 flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </Card>
        )}

        {/* VIEW MODE: If not loading, and not showing form, and bankAccount exists */}
        {!isLoading && !showForm && bankAccount && (
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <div className="h-2 bg-indigo-600 w-full" />
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    Active Account
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Payouts will be sent to this account.
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={handleEdit} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Bank Name</p>
                  <p className="font-medium text-lg text-slate-900">{bankAccount.bank_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Account Number</p>
                  <p className="font-mono font-medium text-lg text-slate-900 tracking-wider">
                    {bankAccount.account_number}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Account Name</p>
                  <p className="font-medium text-lg text-slate-900">{bankAccount.account_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* EMPTY STATE: If not loading, not showing form, and NO bankAccount */}
        {!isLoading && !showForm && !bankAccount && (
          <Card className="border-2 border-dashed border-slate-200 shadow-none bg-slate-50/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No Bank Account Added</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                Add your company bank account details to receive payouts directly.
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Bank Details
              </Button>
            </CardContent>
          </Card>
        )}

        {/* FORM MODE: If showForm is true */}
        {!isLoading && showForm && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                {bankAccount ? "Update Bank Information" : "Add Bank Information"}
              </CardTitle>
              <CardDescription>
                Please ensure these details are correct to avoid payment delays.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name <span className="text-rose-500">*</span></Label>
                    <Input
                      id="bank_name"
                      placeholder="e.g. Zenith Bank"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number <span className="text-rose-500">*</span></Label>
                    <Input
                      id="account_number"
                      placeholder="0123456789"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      required
                      type="number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_name">Account Name <span className="text-rose-500">*</span></Label>
                    <Input
                      id="account_name"
                      placeholder="e.g. Abri Hotels Ltd"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      required
                    />
                    <p className="text-xs text-slate-500">Must match the registered business name.</p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Details
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
