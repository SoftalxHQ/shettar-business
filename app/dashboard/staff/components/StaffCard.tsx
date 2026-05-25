"use client"

import { Card, CardContent } from "@/components/ui/card"
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
  Mail,
  Crown,
  Edit,
  Shield,
  MoreVertical,
  RefreshCw,
  PauseCircle,
  UserX,
  Ban,
  UserCheck,
} from "lucide-react"
import type { StaffMember } from "@/lib/staff-types"
import { getPermissionSummary, getEnabledPermissionsCount } from "@/lib/staff-types"
import { statusLabel } from "@/lib/staff-api"
import { useAuth } from "@/lib/auth-context"
import type { StaffStatusAction } from "./StaffStatusDialog"

interface StaffCardProps {
  member: StaffMember
  onEdit: (member: StaffMember) => void
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
      return "bg-green-50 text-green-700 border-green-200"
  }
}

export function StaffCard({ member, onEdit, onSwitchRole, onStatusAction }: StaffCardProps) {
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

  const canEdit = user?.role === "admin" || user?.permissions?.staff?.edit
  const canManageStatus = user?.role === "admin" || user?.permissions?.staff?.remove
  const isOwner = user?.role === "admin" || false // reinstate owner check - API enforces is_owner on member record for target

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{userName}</h3>
                {member.is_owner && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 rounded-sm font-normal"
                  >
                    <Crown className="w-2.5 h-2.5" />
                    Owner
                  </Badge>
                )}
                {!member.is_owner && (
                  <Badge
                    variant="outline"
                    className={`h-5 px-1.5 text-[10px] rounded-sm font-normal ${statusBadgeClass(status)}`}
                  >
                    {statusLabel(status)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="truncate max-w-[150px]">{member.title || "No title"}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                <div className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{member.user?.email}</span>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                <Shield className="w-3 h-3" />
                <span className="truncate">
                  {member.is_owner
                    ? "Full Access"
                    : `${permissionsCount} permissions: ${permissionsSummary}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && isActive && !member.is_owner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(member)}
                className="h-8 px-2 text-xs"
              >
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
            )}

            {!member.is_owner && (canEdit || canManageStatus) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && isActive && (
                    <>
                      <DropdownMenuItem onClick={() => onSwitchRole(member)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Switch role
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(member)}>
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

                  {canManageStatus && status === "fired" && isOwner && (
                    <DropdownMenuItem onClick={() => onStatusAction(member, "reinstate")}>
                      <UserCheck className="w-4 h-4 mr-2" />
                      Reinstate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
