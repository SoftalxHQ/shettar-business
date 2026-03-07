"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Users, Plus, Loader2, Search, Crown } from "lucide-react"
import { toast } from "sonner"
import type { StaffMember } from "@/lib/staff-types"
import { getPermissionSummary } from "@/lib/staff-types"
import { StaffCard } from "./components/StaffCard"
import { AddStaffDialog } from "./components/AddStaffDialog"
import { EditPermissionsDialog } from "./components/EditPermissionsDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function StaffPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [memberToDelete, setMemberToDelete] = useState<number | null>(null)

  // Check access permissions
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (!user.permissions?.staff?.view) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  // Fetch staff members
  useEffect(() => {
    if (user?.role === "admin" || user?.permissions?.staff?.view) {
      fetchStaffMembers()
    }
  }, [businessId, user])

  const fetchStaffMembers = async () => {
    if (!businessId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/staff`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStaffMembers(Array.isArray(data) ? data : [])
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
        toast.error("Failed to load staff members")
      }
    } catch (error) {
      console.error("Error fetching staff:", error)
      toast.error("Unable to load staff members")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStaff = () => {
    setShowAddDialog(false)
    fetchStaffMembers()
  }

  const handleRemoveStaff = (memberId: number) => {
    setMemberToDelete(memberId)
  }

  const executeRemoveStaff = async () => {
    if (!memberToDelete) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/staff/${memberToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        toast.success("Staff member removed")
        setMemberToDelete(null)
        fetchStaffMembers()
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
        toast.error("Failed to remove staff member")
      }
    } catch (error) {
      console.error("Error removing staff:", error)
      toast.error("Unable to remove staff member")
    } finally {
      setMemberToDelete(null)
    }
  }

  // Filter staff by search query
  const filteredStaff = staffMembers.filter(member => {
    const query = searchQuery.toLowerCase()
    return (
      member.user?.name?.toLowerCase().includes(query) ||
      member.user?.email?.toLowerCase().includes(query) ||
      member.title?.toLowerCase().includes(query)
    )
  })

  const ownersCount = staffMembers.filter(m => m.is_owner).length
  const staffCount = staffMembers.filter(m => !m.is_owner).length

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
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage team members and their permissions
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Staff</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{staffCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Staff List */}
        <div>
          {filteredStaff.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchQuery ? "No staff found" : "No staff members yet"}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery
                    ? "Try adjusting your search query"
                    : "Get started by adding your first team member"
                  }
                </p>
                {!searchQuery && (
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
                  onRemove={handleRemoveStaff}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Dialog */}
      {showAddDialog && (
        <AddStaffDialog
          onSuccess={handleAddStaff}
          onCancel={() => setShowAddDialog(false)}
        />
      )}

      {/* Edit Permissions Dialog */}
      {showEditDialog && selectedMember && (
        <EditPermissionsDialog
          member={selectedMember}
          onSuccess={() => {
            setShowEditDialog(false)
            setSelectedMember(null)
            fetchStaffMembers()
          }}
          onCancel={() => {
            setShowEditDialog(false)
            setSelectedMember(null)
          }}
        />
      )}

      <ConfirmDialog
        open={!!memberToDelete}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title="Remove Staff Member"
        description="Are you sure you want to remove this staff member? They will lose access to this business."
        confirmText="Remove"
        onConfirm={executeRemoveStaff}
      />
    </DashboardLayout>
  )
}
