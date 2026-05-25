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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  deactivateStaff,
  fireStaff,
  reactivateStaff,
  reinstateStaff,
  suspendStaff,
} from "@/lib/staff-api"
import type { StaffMember } from "@/lib/staff-types"

export type StaffStatusAction =
  | "suspend"
  | "deactivate"
  | "fire"
  | "reactivate"
  | "reinstate"

const ACTION_COPY: Record<
  StaffStatusAction,
  { title: string; description: string; confirm: string; variant?: "destructive" }
> = {
  suspend: {
    title: "Suspend staff",
    description:
      "This temporarily blocks sign-in and API access. You can reactivate them later.",
    confirm: "Suspend",
  },
  deactivate: {
    title: "Deactivate staff",
    description:
      "This indefinitely blocks access until you reactivate them. Use for extended leave.",
    confirm: "Deactivate",
  },
  fire: {
    title: "Fire staff",
    description:
      "This permanently ends their association with this business. Their record is kept for audit. Only the owner can reinstate.",
    confirm: "Fire",
    variant: "destructive",
  },
  reactivate: {
    title: "Reactivate staff",
    description: "Restore access for this team member. They will receive an email notification.",
    confirm: "Reactivate",
  },
  reinstate: {
    title: "Reinstate staff",
    description: "Restore a fired team member to active status. They will receive an email notification.",
    confirm: "Reinstate",
  },
}

interface StaffStatusDialogProps {
  member: StaffMember
  action: StaffStatusAction
  onSuccess: () => void
  onCancel: () => void
}

export function StaffStatusDialog({
  member,
  action,
  onSuccess,
  onCancel,
}: StaffStatusDialogProps) {
  const { businessId } = useAuth()
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const copy = ACTION_COPY[action]

  const handleSubmit = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      const payload = reason.trim() || undefined
      switch (action) {
        case "suspend":
          await suspendStaff(businessId, member.id, payload)
          break
        case "deactivate":
          await deactivateStaff(businessId, member.id, payload)
          break
        case "fire":
          await fireStaff(businessId, member.id, payload)
          break
        case "reactivate":
          await reactivateStaff(businessId, member.id, payload)
          break
        case "reinstate":
          await reinstateStaff(businessId, member.id, payload)
          break
      }
      toast.success(`${member.user?.name || "Staff member"} — ${copy.confirm.toLowerCase()} successful`)
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {copy.description}
          </p>
          <p className="text-sm font-medium pt-1">
            {member.user?.name} · {member.user?.email}
          </p>
        </DialogHeader>

        <div>
          <Label htmlFor="status-reason">Message to staff (optional)</Label>
          <Textarea
            id="status-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason or instructions included in the email"
            className="mt-1 min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant={copy.variant === "destructive" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
