"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Users, Plus, Search, Crown } from "lucide-react"
import { toast } from "sonner"
import type { StaffMember } from "@/lib/staff-types"
import { STATUS_FILTER_OPTIONS, canInviteStaffMembers } from "@/lib/staff-types"
import { fetchStaff } from "@/lib/staff-api"
import { StaffCard } from "./components/StaffCard"
import { AddStaffDialog } from "./components/AddStaffDialog"
import { EditPermissionsDialog } from "./components/EditPermissionsDialog"
import { EditStaffProfileDialog } from "./components/EditStaffProfileDialog"
import { SwitchRoleDialog } from "./components/SwitchRoleDialog"
import {
  StaffStatusDialog,
  type StaffStatusAction,
} from "./components/StaffStatusDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

function MetricTile({
  title,
  value,
  icon: Icon,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-2.5 py-2.5 sm:px-3.5 sm:py-3 min-w-0 overflow-hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{title}</p>
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </div>
      <p className="text-xl sm:text-2xl font-semibold tabular-nums leading-none tracking-tight text-slate-900 truncate">{value}</p>
    </div>
  )
}

export default function StaffPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [statusDialog, setStatusDialog] = useState<{
    member: StaffMember
    action: StaffStatusAction
  } | null>(null)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (user && !user.isAdmin && user.role !== "admin") {
      if (!user.permissions?.staff?.view) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  const logoutRef = useRef(logout)
  logoutRef.current = logout

  const canViewStaff =
    !!user?.isAdmin || user?.role === "admin" || Boolean(user?.permissions?.staff?.view)

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

  const adminsCount = staffMembers.filter((m) => m.is_admin).length
  const activeCount = staffMembers.filter((m) => (m.status || "active") === "active" && !m.is_admin).length
  const inactiveCount = staffMembers.filter(
    (m) => !m.is_admin && (m.status || "active") !== "active"
  ).length

  const canAdd = canInviteStaffMembers({
    title: user?.title,
    isAdmin: user?.isAdmin,
    permissions: user?.permissions,
  })

  if (!user?.isAdmin && user?.role !== "admin" && !user?.permissions?.staff?.view) {
    return null
  }

  if (isLoading) {
    return (
      <DashboardLayout activeTab="staffs">
        <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="staffs">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">Staff</h1>
            <p className="text-xs text-slate-500">Team members, roles, and access</p>
          </div>
          {canAdd && (
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700 w-full sm:w-auto shrink-0"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Staff
            </Button>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 min-w-0">
          <MetricTile title="Total members" value={staffMembers.length} icon={Users} />
          <MetricTile title="Admins" value={adminsCount} icon={Crown} />
          <MetricTile title="Active staff" value={activeCount} icon={Users} />
          <MetricTile title="Inactive" value={inactiveCount} icon={Users} />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-2 py-2 sm:px-3 sm:py-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="relative min-w-0 w-full flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search name, email, or title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-lg border-slate-200 pl-8 text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-1 min-w-0">
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    "h-7 rounded-lg border-slate-200 px-2.5 text-[11px]",
                    statusFilter === opt.value && "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
                  )}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-auto">
            {filteredStaff.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                <Users className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm font-medium text-slate-600">
                  {searchQuery || statusFilter !== "all" ? "No staff found" : "No staff members yet"}
                </p>
                <p className="mt-1 text-xs">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Add your first team member to get started"}
                </p>
                {!searchQuery && statusFilter === "all" && canAdd && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                    className="mt-3 h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Staff
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 z-[1] hidden sm:table-header-group bg-slate-50/95 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-xs">Member</TableHead>
                    <TableHead className="h-9 text-xs">Title</TableHead>
                    <TableHead className="h-9 text-xs">Status</TableHead>
                    <TableHead className="h-9 text-xs">Access</TableHead>
                    <TableHead className="h-9 text-right text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <StaffCard
                      key={member.id}
                      member={member}
                      onEditProfile={(m) => {
                        setSelectedMember(m)
                        setShowProfileDialog(true)
                      }}
                      onEditPermissions={(m) => {
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
                </TableBody>
              </Table>
            )}
          </div>
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

      {showProfileDialog && selectedMember && (
        <EditStaffProfileDialog
          member={selectedMember}
          onSuccess={() => {
            setShowProfileDialog(false)
            setSelectedMember(null)
            loadStaff()
          }}
          onCancel={() => {
            setShowProfileDialog(false)
            setSelectedMember(null)
          }}
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
          key={selectedMember.id}
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
