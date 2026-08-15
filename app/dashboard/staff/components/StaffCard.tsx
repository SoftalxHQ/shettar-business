"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  TableCell,
  TableRow,
} from "@/components/ui/table"
import {
  Crown,
  Edit,
  MoreVertical,
  RefreshCw,
  PauseCircle,
  UserX,
  Ban,
  UserCheck,
} from "lucide-react"
import type { StaffMember } from "@/lib/staff-types"
import { canManageStaffMember, getEnabledPermissionsCount, getPermissionSummary } from "@/lib/staff-types"
import { statusLabel } from "@/lib/staff-api"
import { useAuth } from "@/lib/auth-context"
import type { StaffStatusAction } from "./StaffStatusDialog"

interface StaffCardProps {
  member: StaffMember
  onEditProfile: (member: StaffMember) => void
  onEditPermissions: (member: StaffMember) => void
  onSwitchRole: (member: StaffMember) => void
  onStatusAction: (member: StaffMember, action: StaffStatusAction) => void
}

function statusBadgeClass(status: string | undefined) {
  switch (status) {
    case "suspended":
      return "bg-amber-50 text-amber-800 border-amber-200"
    case "deactivated":
      return "bg-slate-100 text-slate-700 border-slate-200"
    case "fired":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
}

export function StaffCard({
  member,
  onEditProfile,
  onEditPermissions,
  onSwitchRole,
  onStatusAction,
}: StaffCardProps) {
  const { user } = useAuth()
  const userName = member.user?.name || `${member.user?.first_name} ${member.user?.last_name}` || "Unknown"
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const permissionsCount = getEnabledPermissionsCount(member.permissions)
  const permissionsSummary = getPermissionSummary(member.permissions)
  const status = member.status || "active"
  const isActive = status === "active"

  const hasEditPermission = !!user?.isOwner || !!user?.permissions?.staff?.edit
  const hasStatusPermission = !!user?.isOwner || !!user?.permissions?.staff?.remove
  const isBusinessOwner = !!user?.isOwner
  const canManageThisMember = canManageStaffMember(
    {
      title: user?.title,
      isOwner: user?.isOwner,
      memberId: user?.memberId,
      userId: user?.id,
    },
    member
  )

  const canEdit = hasEditPermission && canManageThisMember
  const canManageStatus = hasStatusPermission && canManageThisMember
  const showActions = !member.is_owner && (canEdit || canManageStatus)

  return (
    <TableRow className="border-slate-100">
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="bg-slate-100 text-slate-600 text-[11px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-medium text-slate-900 truncate">{userName}</span>
              {member.is_owner && (
                <Badge
                  variant="secondary"
                  className="h-5 px-1.5 text-[10px] bg-slate-100 text-slate-600 border-slate-200 gap-1 rounded-md font-normal shadow-none"
                >
                  <Crown className="w-2.5 h-2.5" />
                  Owner
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{member.user?.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-xs text-slate-600">
        {member.title || "—"}
      </TableCell>
      <TableCell className="py-2.5">
        {member.is_owner ? (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] rounded-md font-normal border-slate-200 text-slate-600">
            Owner
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={`h-5 px-1.5 text-[10px] rounded-md font-normal ${statusBadgeClass(status)}`}
          >
            {statusLabel(status)}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-2.5 text-[11px] text-slate-500 max-w-[220px]">
        <span className="line-clamp-2">
          {member.is_owner
            ? "Full access"
            : `${permissionsCount} · ${permissionsSummary}`}
        </span>
      </TableCell>
      <TableCell className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          {canEdit && isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditProfile(member)}
              className="h-7 px-2 text-[11px] rounded-lg border-slate-200"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                {canEdit && isActive && (
                  <>
                    <DropdownMenuItem onClick={() => onSwitchRole(member)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Switch role
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditPermissions(member)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit permissions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {canManageStatus && isActive && (
                  <>
                    <DropdownMenuItem onClick={() => onStatusAction(member, "suspend")}>
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Suspend
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatusAction(member, "deactivate")}>
                      <Ban className="w-4 h-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => onStatusAction(member, "fire")}
                    >
                      <UserX className="w-4 h-4 mr-2" />
                      Fire
                    </DropdownMenuItem>
                  </>
                )}

                {canManageStatus && (status === "suspended" || status === "deactivated") && (
                  <DropdownMenuItem onClick={() => onStatusAction(member, "reactivate")}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Reactivate
                  </DropdownMenuItem>
                )}

                {canManageStatus && status === "fired" && isBusinessOwner && (
                  <DropdownMenuItem onClick={() => onStatusAction(member, "reinstate")}>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Reinstate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
