"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Hotel, Plus, Loader2, Bed, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import type { RoomType } from "@/lib/room-types"
import { RoomTypeCard } from "./components/RoomTypeCard"
import { RoomTypeDialog } from "./components/RoomTypeDialog"

export default function RoomsPage() {
  const { user, businessId } = useAuth()
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard")
    }
  }, [user, router])

  // Fetch room types
  useEffect(() => {
    fetchRoomTypes()
  }, [businessId])

  const fetchRoomTypes = async () => {
    if (!businessId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        // Ensure data is an array
        setRoomTypes(Array.isArray(data) ? data : [])
      } else {
        toast.error("Failed to load room types")
      }
    } catch (error) {
      console.error("Error fetching room types:", error)
      toast.error("Unable to load room types")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRoomType = () => {
    setSelectedRoomType(null)
    setShowCreateDialog(true)
  }

  const handleEditRoomType = (roomType: RoomType) => {
    setSelectedRoomType(roomType)
    setShowCreateDialog(true)
  }

  const handleDeleteRoomType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this room type? This will also delete all rooms of this type.")) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message)
        fetchRoomTypes()
      } else {
        toast.error("Failed to delete room type")
      }
    } catch (error) {
      console.error("Error deleting room type:", error)
      toast.error("Unable to delete room type")
    }
  }

  const handleSaveRoomType = () => {
    setShowCreateDialog(false)
    setSelectedRoomType(null)
    fetchRoomTypes()
  }

  const handleManageRooms = (id: number) => {
    router.push(`/dashboard/rooms/${id}/rooms`)
  }

  // Calculate statistics
  const totalRooms = Array.isArray(roomTypes)
    ? roomTypes.reduce((sum, rt) => sum + (rt.rooms_count || 0), 0)
    : 0
  const totalAvailable = Array.isArray(roomTypes)
    ? roomTypes.reduce((sum, rt) => sum + (rt.available_rooms || 0), 0)
    : 0
  const avgPrice = Array.isArray(roomTypes) && roomTypes.length > 0
    ? roomTypes.reduce((sum, rt) => sum + rt.price, 0) / roomTypes.length
    : 0

  if (user?.role !== "admin") {
    return null
  }

  if (isLoading) {
    return (
      <DashboardLayout activeTab="rooms">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="rooms">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rooms Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage room types and individual rooms
            </p>
          </div>
          <Button onClick={handleCreateRoomType}>
            <Plus className="w-4 h-4 mr-2" />
            Create Room Type
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Room Types</CardTitle>
              <Hotel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roomTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                Different categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Bed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRooms}</div>
              <p className="text-xs text-muted-foreground">
                Across all types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalAvailable}</div>
              <p className="text-xs text-muted-foreground">
                Ready for booking
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgPrice.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">
                Per night
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Room Types List */}
        <div>
          {roomTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Hotel className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No room types yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by creating your first room type
                </p>
                <Button onClick={handleCreateRoomType}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {roomTypes.map((roomType) => (
                <RoomTypeCard
                  key={roomType.id}
                  roomType={roomType}
                  onEdit={handleEditRoomType}
                  onDelete={handleDeleteRoomType}
                  onManageRooms={handleManageRooms}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {showCreateDialog && (
        <RoomTypeDialog
          roomType={selectedRoomType}
          onSave={handleSaveRoomType}
          onCancel={() => {
            setShowCreateDialog(false)
            setSelectedRoomType(null)
          }}
        />
      )}
    </DashboardLayout>
  )
}
