"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { notifySessionExpired } from "@/lib/session-expiry"
import {
  PERMISSION_PRESETS,
  canInviteStaffMembers,
  getAssignablePresets,
  type PermissionPresetKey,
  type Permissions,
} from "@/lib/staff-types"
import { PermissionPresetSelector } from "./PermissionPresetSelector"
import { PermissionsForm } from "./PermissionsForm"

interface AddStaffDialogProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AddStaffDialog({ onSuccess, onCancel }: AddStaffDialogProps) {
  const { businessId, logout, user } = useAuth()
  const actor = {
    title: user?.title,
    isAdmin: user?.isAdmin,
    permissions: user?.permissions,
  }
  const canInvite = canInviteStaffMembers(actor)
  const assignablePresets = getAssignablePresets(actor, { includeFullAccess: !!user?.isAdmin })
  const defaultPreset: PermissionPresetKey =
    (assignablePresets.find((key) => key === "front_desk") as PermissionPresetKey | undefined) ||
    (assignablePresets.find((key) => key !== "custom") as PermissionPresetKey | undefined) ||
    "custom"

  const [currentStep, setCurrentStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [selectedPreset, setSelectedPreset] = useState<PermissionPresetKey>(defaultPreset)
  const [title, setTitle] = useState(
    defaultPreset === "custom" ? "" : PERMISSION_PRESETS[defaultPreset].name
  )
  const [permissions, setPermissions] = useState<Permissions>(
    defaultPreset === "custom" ? {} : (PERMISSION_PRESETS[defaultPreset].permissions as Permissions)
  )

  const handlePresetChange = (preset: PermissionPresetKey) => {
    setSelectedPreset(preset)
    if (preset !== "custom") {
      setPermissions(PERMISSION_PRESETS[preset].permissions as Permissions)
      setTitle(PERMISSION_PRESETS[preset].name)
    }
  }

  const handleNext = () => {
    if (!canInvite) {
      toast.error("Only the admin, general manager, or human resource can add staff")
      return
    }
    if (!email.trim()) {
      toast.error("Email is required")
      return
    }
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
    if (assignablePresets.length === 0) {
      toast.error("You cannot assign any roles at your level")
      return
    }

    if (selectedPreset === "custom") {
      setCurrentStep(2)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("shettar_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/staff`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            first_name: firstName,
            last_name: lastName,
            title: title.trim(),
            permissions,
            is_admin: selectedPreset === "full_access",
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Staff member added successfully!")
        onSuccess()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.errors?.[0]?.id === "expiration" || errorData.message === "Signature has expired") {
            notifySessionExpired()
            logout()
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        toast.error(
          error.error ||
            error.errors?.join?.(", ") ||
            error.status?.message ||
            "Failed to add staff member"
        )
      }
    } catch (error) {
      console.error("Error adding staff:", error)
      toast.error("Unable to add staff member")
    } finally {
      setIsSaving(false)
    }
  }

  if (!canInvite) {
    return (
      <Dialog open onOpenChange={onCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Only the business admin, general manager, or human resource can add staff.
          </p>
          <DialogFooter>
            <Button onClick={onCancel}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 1 ? "Add Staff Member" : "Configure Permissions"}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 1 ? (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@example.com"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We&apos;ll check if this email exists in the system
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Front Desk"
                  required
                  readOnly={selectedPreset !== "custom"}
                  className={selectedPreset !== "custom" ? "bg-muted" : undefined}
                />
                {selectedPreset !== "custom" && (
                  <p className="text-xs text-muted-foreground">
                    Title follows the selected role. Choose Custom to set a different title.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Role
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Only roles below your level are available.
                </p>
              </div>
              {assignablePresets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There are no roles you can assign.
                </p>
              ) : (
                <PermissionPresetSelector
                  presets={assignablePresets}
                  selected={selectedPreset}
                  onSelect={handlePresetChange}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="py-4">
            <PermissionsForm
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>
        )}

        <DialogFooter className="flex justify-between border-t pt-4">
          {currentStep === 2 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              disabled={isSaving}
            >
              ← Back
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            {currentStep === 1 ? (
              <Button onClick={handleNext} disabled={isSaving || assignablePresets.length === 0}>
                {selectedPreset === "custom" ? "Next: Permissions →" : "Add Staff Member"}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Staff Member"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
