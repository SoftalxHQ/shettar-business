"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Crown, Edit, Trash, Shield } from "lucide-react"
import type { StaffMember } from "@/lib/staff-types"
import { getPermissionSummary, getEnabledPermissionsCount } from "@/lib/staff-types"
import { useAuth } from "@/lib/auth-context"

interface StaffCardProps {
  member: StaffMember
  onEdit: (member: StaffMember) => void
  onRemove: (id: number) => void
}

export function StaffCard({ member, onEdit, onRemove }: StaffCardProps) {
  const { user } = useAuth()
  const userName = member.user?.name || `${member.user?.first_name} ${member.user?.last_name}` || "Unknown"
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const permissionsCount = getEnabledPermissionsCount(member.permissions)
  const permissionsSummary = getPermissionSummary(member.permissions)

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Avatar and Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{userName}</h3>
                {member.is_owner && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 rounded-sm font-normal">
                    <Crown className="w-2.5 h-2.5" />
                    Owner
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

              {/* Compact Permissions Line */}
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                <Shield className="w-3 h-3" />
                <span className="truncate">
                  {member.is_owner ? "Full Access" : `${permissionsCount} permissions: ${permissionsSummary}`}
                </span>
              </div>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {(user?.role === 'admin' || user?.permissions?.staff?.edit) && (
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
            {!member.is_owner && (user?.role === 'admin' || user?.permissions?.staff?.remove) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(member.id)}
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
