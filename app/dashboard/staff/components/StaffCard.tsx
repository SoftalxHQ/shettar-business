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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left side: Avatar and Info */}
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Name and Owner Badge */}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">{userName}</h3>
                {member.is_owner && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Crown className="w-3 h-3 mr-1" />
                    Owner
                  </Badge>
                )}
              </div>

              {/* Title */}
              <p className="text-sm text-muted-foreground mb-3">
                {member.title || "No title"}
              </p>

              {/* Email */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Mail className="w-4 h-4" />
                <span className="truncate">{member.user?.email}</span>
              </div>

              {/* Permissions Summary */}
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {permissionsCount} {permissionsCount === 1 ? "permission" : "permissions"}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {member.is_owner ? "Full access to all features" : permissionsSummary}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex flex-col gap-2 ml-4">
            {(user?.role === 'admin' || user?.permissions?.staff?.edit) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(member)}
                className="w-full"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
            )}
            {!member.is_owner && (user?.role === 'admin' || user?.permissions?.staff?.remove) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(member.id)}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
