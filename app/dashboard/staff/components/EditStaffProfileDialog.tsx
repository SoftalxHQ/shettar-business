"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import type { StaffMember } from "@/lib/staff-types"

interface EditStaffProfileDialogProps {
  member: StaffMember
  onSuccess: () => void
  onCancel: () => void
}

export function EditStaffProfileDialog({
  member,
  onSuccess,
  onCancel,
}: EditStaffProfileDialogProps) {
  const { businessId, logout } = useAuth()
  const [firstName, setFirstName] = useState(member.user?.first_name || "")
  const [lastName, setLastName] = useState(member.user?.last_name || "")
  const [title, setTitle] = useState(member.title || "")
  const [phoneNumber, setPhoneNumber] = useState(member.user?.phone_number || "")
  const [address, setAddress] = useState(member.user?.address || "")
  const [zipCode, setZipCode] = useState(member.user?.zip_code || "")
  const [isSaving, setIsSaving] = useState(false)

  const email = member.user?.email || ""

  const handleSave = async () => {
    if (!firstName.trim()) {
      toast.error("First name is required")
      return
    }
    if (!lastName.trim()) {
      toast.error("Last name is required")
      return
    }
    if (!title.trim()) {
      toast.error("Job title is required")
      return
    }

    setIsSaving(true)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("shettar_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/staff/${member.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            title: title.trim(),
            phone_number: phoneNumber.trim(),
            address: address.trim(),
            zip_code: zipCode.trim(),
          }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Staff profile updated")
        onSuccess()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === "expiration" ||
            errorData.errors?.[0]?.message === "Token has expired" ||
            errorData.message === "Signature has expired"
          ) {
            logout(true)
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        toast.error(
          error.message || error.error || error.errors?.[0] || "Failed to update profile",
        )
      }
    } catch (error) {
      console.error("Error updating staff profile:", error)
      toast.error("Unable to update staff profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit staff profile</DialogTitle>
          <DialogDescription>
            Update contact details and job title. Permissions are managed separately. Staff can only
            change their own password from Profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-email" className="text-xs text-slate-600">
              Email
            </Label>
            <Input
              id="staff-email"
              value={email}
              disabled
              className="h-9 text-sm bg-slate-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-first-name" className="text-xs text-slate-600">
                First name
              </Label>
              <Input
                id="staff-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-9 text-sm"
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-last-name" className="text-xs text-slate-600">
                Last name
              </Label>
              <Input
                id="staff-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-9 text-sm"
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-title" className="text-xs text-slate-600">
              Job title
            </Label>
            <Input
              id="staff-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 text-sm"
              placeholder="e.g. Front Desk"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone" className="text-xs text-slate-600">
              Phone number
            </Label>
            <Input
              id="staff-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-9 text-sm"
              placeholder="e.g. +234..."
              autoComplete="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-address" className="text-xs text-slate-600">
              Address
            </Label>
            <Textarea
              id="staff-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="min-h-[72px] text-sm resize-none"
              placeholder="Street, city"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-zip" className="text-xs text-slate-600">
              Zip / postal code
            </Label>
            <Input
              id="staff-zip"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="h-9 text-sm"
              placeholder="e.g. 100001"
              autoComplete="postal-code"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
