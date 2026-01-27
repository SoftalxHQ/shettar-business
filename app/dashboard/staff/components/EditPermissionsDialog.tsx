"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Crown, Shield, Check, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import type { StaffMember, Permissions } from "@/lib/staff-types"
import { getEnabledPermissionsCount } from "@/lib/staff-types"
import { PermissionsForm } from "./PermissionsForm"

interface EditPermissionsDialogProps {
  member: StaffMember
  onSuccess: () => void
  onCancel: () => void
}

export function EditPermissionsDialog({ member, onSuccess, onCancel }: EditPermissionsDialogProps) {
  const { businessId, logout } = useAuth()
  const [permissions, setPermissions] = useState<Permissions>(member.permissions || {})
  const [isSaving, setIsSaving] = useState(false)

  const userName = member.user?.name || `${member.user?.first_name} ${member.user?.last_name}` || "Unknown"
  const initialCount = getEnabledPermissionsCount(member.permissions || {})
  const currentCount = getEnabledPermissionsCount(permissions)
  const hasChanges = JSON.stringify(permissions) !== JSON.stringify(member.permissions)

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/staff/${member.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissions,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Permissions updated successfully!")
        onSuccess()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === 'expiration' ||
            errorData.errors?.[0]?.message === 'Token has expired' ||
            errorData.message === 'Signature has expired'
          ) {
            logout(true)
            return
          }
        }
        const error = await response.json().catch(() => ({}))
        const errorMessage = error.message || error.error || "Failed to update permissions"
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error("Error updating permissions:", error)
      toast.error("Unable to update permissions")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Manage Permissions - {userName}
          </DialogTitle>
          <DialogDescription>
            Configure what {userName} can access and manage
          </DialogDescription>
        </DialogHeader>

        {/* Header Info */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{member.user?.email}</p>
            </div>
            {member.is_owner && (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <Crown className="w-3 h-3 mr-1" />
                Owner
              </Badge>
            )}
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold">{currentCount}</p>
            <p className="text-xs text-muted-foreground">
              {currentCount === 1 ? "permission" : "permissions"} enabled
            </p>
            {hasChanges && (
              <Badge variant="outline" className="mt-1 text-xs">
                {currentCount - initialCount > 0 ? `+${currentCount - initialCount}` : currentCount - initialCount} changes
              </Badge>
            )}
          </div>
        </div>

        {/* Owner Warning */}
        {member.is_owner ? (
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <Crown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Owner Account</h4>
              <p className="text-sm text-yellow-800">
                This user is a business owner and has full access to all features by default.
                Owner permissions cannot be modified.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <PermissionsForm
              permissions={permissions}
              onChange={setPermissions}
            />
          </div>
        )}

        <DialogFooter className="flex justify-between border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {hasChanges ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">Unsaved changes</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>No changes</span>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            {!member.is_owner && (
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Permissions"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
