"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Users, Plus, Search, Crown } from "lucide-react"
import { toast } from "sonner"
import type { StaffMember } from "@/lib/staff-types"
import { STATUS_FILTER_OPTIONS } from "@/lib/staff-types"
import { fetchStaff } from "@/lib/staff-api"
import { StaffCard } from "./components/StaffCard"
import { AddStaffDialog } from "./components/AddStaffDialog"
import { EditPermissionsDialog } from "./components/EditPermissionsDialog"
import { SwitchRoleDialog } from "./components/SwitchRoleDialog"
import {
  StaffStatusDialog,
  type StaffStatusAction,
} from "./components/StaffStatusDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

export default function StaffPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [statusDialog, setStatusDialog] = useState<{
    member: StaffMember
    action: StaffStatusAction
  } | null>(null)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (user && user.role !== "admin") {
      if (!user.permissions?.staff?.view) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const canViewStaff =
    user?.role === "admin" || Boolean(user?.permissions?.staff?.view)

  useEffect(() => {
    if (!businessId || !canViewStaff) return

    let cancelled = false
    setIsLoading(true)

    fetchStaff(businessId)
      .then((data) => {
        if (!cancelled) setStaffMembers(data)
      })
      .catch((e) => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : "Failed to load staff"
        if (
          msg.toLowerCase().includes("expired") ||
          msg.toLowerCase().includes("signature")
        ) {
          logoutRef.current(true)
          return
        }
        toast.error(msg)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [businessId, canViewStaff])

  const loadStaff = () => {
    if (!businessId || !canViewStaff) return
    setIsLoading(true)
    fetchStaff(businessId)
      .then(setStaffMembers)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "Failed to load staff"
        toast.error(msg)
      })
      .finally(() => setIsLoading(false))
  }

  const filteredStaff = staffMembers.filter((member) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      member.user?.name?.toLowerCase().includes(query) ||
      member.user?.email?.toLowerCase().includes(query) ||
      member.title?.toLowerCase().includes(query)

    const status = member.status || "active"
    const matchesStatus = statusFilter === "all" || status === statusFilter

    return matchesSearch && matchesStatus
  })

  const ownersCount = staffMembers.filter((m) => m.is_owner).length
  const activeCount = staffMembers.filter((m) => (m.status || "active") === "active" && !m.is_owner).length
  const inactiveCount = staffMembers.filter(
    (m) => !m.is_owner && (m.status || "active") !== "active"
  ).length

  const canAdd = user?.role === "admin" || user?.permissions?.staff?.add

  if (user?.role !== "admin" && !user?.permissions?.staff?.view) {
    return null
  }

  if (isLoading) {
    return (
      <DashboardLayout activeTab="staffs">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffs">
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members, roles, and access
            </p>
          </div>
          {canAdd && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffMembers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Owners</CardTitle>
              <Crown className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ownersCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Users className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inactiveCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(opt.value)}
                className={cn("text-xs")}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          {filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery || statusFilter !== "all"
                    ? "No staff found"
                    : "No staff members yet"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Get started by adding your first team member"}
                </p>
                {!searchQuery && statusFilter === "all" && canAdd && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Staff Member
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  onEdit={(m) => {
                    setSelectedMember(m)
                    setShowEditDialog(true)
                  }}
                  onSwitchRole={(m) => {
                    setSelectedMember(m)
                    setShowSwitchDialog(true)
                  }}
                  onStatusAction={(m, action) => setStatusDialog({ member: m, action })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddDialog && (
        <AddStaffDialog
          onSuccess={() => {
            setShowAddDialog(false)
            loadStaff()
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      )}

      {showEditDialog && selectedMember && (
        <EditPermissionsDialog
          member={selectedMember}
          onSuccess={() => {
            setShowEditDialog(false)
            setSelectedMember(null)
            loadStaff()
          }}
          onCancel={() => {
            setShowEditDialog(false)
            setSelectedMember(null)
          }}
        />
      )}

      {showSwitchDialog && selectedMember && (
        <SwitchRoleDialog
          member={selectedMember}
          onSuccess={() => {
            setShowSwitchDialog(false)
            setSelectedMember(null)
            loadStaff()
          }}
          onCancel={() => {
            setShowSwitchDialog(false)
            setSelectedMember(null)
          }}
        />
      )}

      {statusDialog && (
        <StaffStatusDialog
          member={statusDialog.member}
          action={statusDialog.action}
          onSuccess={() => {
            setStatusDialog(null)
            loadStaff()
          }}
          onCancel={() => setStatusDialog(null)}
        />
      )}
    </DashboardLayout>
  )
}
