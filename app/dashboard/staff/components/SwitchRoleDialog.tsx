"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import { switchStaffRole } from "@/lib/staff-api"
import {
  PERMISSION_PRESETS,
  getPermissionSummary,
  getPresetPermissions,
  getSwitchablePresets,
  type PermissionPresetKey,
  type StaffMember,
} from "@/lib/staff-types"
import { PermissionPresetSelector } from "./PermissionPresetSelector"
import { PermissionsForm } from "./PermissionsForm"

interface SwitchRoleDialogProps {
  member: StaffMember
  onSuccess: () => void
  onCancel: () => void
}

export function SwitchRoleDialog({ member, onSuccess, onCancel }: SwitchRoleDialogProps) {
  const { businessId } = useAuth()
  const [selectedPreset, setSelectedPreset] = useState<PermissionPresetKey>("front_desk")
  const [title, setTitle] = useState(member.title || PERMISSION_PRESETS.front_desk.name)
  const [permissions, setPermissions] = useState(getPresetPermissions("front_desk"))
  const [step, setStep] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)

  const handlePresetChange = (preset: PermissionPresetKey) => {
    setSelectedPreset(preset)
    if (preset !== "custom") {
      setPermissions(getPresetPermissions(preset))
      setTitle(PERMISSION_PRESETS[preset].name)
    }
  }

  const handleContinue = () => {
    if (!title.trim()) {
      toast.error("Job title is required")
      return
    }
    if (selectedPreset === "custom") {
      setStep(2)
    } else {
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      await switchStaffRole(businessId, member.id, {
        preset_key: selectedPreset,
        title: title.trim(),
        permissions,
      })
      toast.success("Role switched successfully")
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to switch role")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Switch role</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Replace {member.user?.name}&apos;s current permissions with a new role preset.
            Previous access will be removed.
          </p>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="switch-title">Job title</Label>
              <Input
                id="switch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            <PermissionPresetSelector
              presets={getSwitchablePresets()}
              selected={selectedPreset}
              onSelect={handlePresetChange}
            />
            {selectedPreset !== "custom" && (
              <p className="text-xs text-muted-foreground">
                New access: {getPermissionSummary(permissions)}
              </p>
            )}
          </div>
        ) : (
          <PermissionsForm permissions={permissions} onChange={setPermissions} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>
              Back
            </Button>
          )}
          <Button onClick={step === 1 ? handleContinue : handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {step === 1 && selectedPreset === "custom" ? "Configure permissions" : "Switch role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
