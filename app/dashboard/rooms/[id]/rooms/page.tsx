"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { use, useEffect, useState } from "react"
import { ArrowLeft, Plus, Loader2, Hotel, CheckCircle, XCircle, Trash } from "lucide-react"
import { toast } from "sonner"
import type { RoomType, Room } from "@/lib/room-types"
import { BulkCreateRoomsDialog } from "../../components/BulkCreateRoomsDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"

export default function RoomManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { businessId, logout } = useAuth()
  const router = useRouter()
  const { id: roomTypeId } = use(params)

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBulkCreate, setShowBulkCreate] = useState(false)

  useEffect(() => {
    fetchRoomTypeAndRooms()
  }, [roomTypeId, businessId])

  const fetchRoomTypeAndRooms = async () => {
    if (!businessId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      // Fetch room type details
      const roomTypeResponse = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (roomTypeResponse.ok) {
        const roomTypeData = await roomTypeResponse.json()
        setRoomType(roomTypeData)
      } else if (roomTypeResponse.status === 401) {
        const errorData = await roomTypeResponse.json().catch(() => ({}))
        if (
          errorData.errors?.[0]?.id === 'expiration' ||
          errorData.errors?.[0]?.message === 'Token has expired' ||
          errorData.message === 'Signature has expired'
        ) {
          logout(true)
          return
        }
      }

      // Fetch rooms
      const roomsResponse = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (roomsResponse.ok) {
        const roomsData = await roomsResponse.json()
        setRooms(roomsData)
      } else if (roomsResponse.status === 401) {
        const errorData = await roomsResponse.json().catch(() => ({}))
        if (
          errorData.errors?.[0]?.id === 'expiration' ||
          errorData.errors?.[0]?.message === 'Token has expired' ||
          errorData.message === 'Signature has expired'
        ) {
          logout(true)
          return
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Unable to load room data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRoomStatus = async (room: Room) => {
    const newStatus = room.status === "available" ? "unavailable" : "available"

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms/${room.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room: {
              status: newStatus,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Room status updated")
        fetchRoomTypeAndRooms()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === 'expiration' ||
            errorData.errors?.[0]?.message === 'Token has expired' ||
            errorData.message === 'Signature has expired'
          ) {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
        toast.error("Failed to update room status")
      }
    } catch (error) {
      console.error("Error updating room:", error)
      toast.error("Unable to update room status")
    }
  }

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm("Are you sure you want to delete this room?")) {
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("abri_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms/${roomId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || "Room deleted")
        fetchRoomTypeAndRooms()
      } else {
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          if (
            errorData.errors?.[0]?.id === 'expiration' ||
            errorData.errors?.[0]?.message === 'Token has expired' ||
            errorData.message === 'Signature has expired'
          ) {
            toast.error("Session expired. Please login again.")
            logout()
            return
          }
        }
        toast.error("Failed to delete room")
      }
    } catch (error) {
      console.error("Error deleting room:", error)
      toast.error("Unable to delete room")
    }
  }

  const handleBulkCreateSuccess = () => {
    setShowBulkCreate(false)
    fetchRoomTypeAndRooms()
  }

  const availableCount = rooms.filter(r => r.status === "available").length
  const unavailableCount = rooms.filter(r => r.status === "unavailable").length

  if (isLoading) {
    return (
      <DashboardLayout activeTab="rooms">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  if (!roomType) {
    return (
      <DashboardLayout activeTab="rooms">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Room type not found</p>
          <Link href="/dashboard/rooms">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Rooms
            </Button>
          </Link>
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard/rooms" className="hover:text-foreground">
                Rooms
              </Link>
              <span>/</span>
              <span>{roomType.name}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{roomType.name} - Rooms</h1>
            <p className="text-muted-foreground mt-1">
              {rooms.length} total rooms
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/rooms">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <Button onClick={() => setShowBulkCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Rooms
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rooms</CardTitle>
              <Hotel className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rooms.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unavailable</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{unavailableCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Rooms Table */}
        <Card>
          <CardHeader>
            <CardTitle>Room Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <div className="text-center py-12">
                <Hotel className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add rooms to this room type to get started
                </p>
                <Button onClick={() => setShowBulkCreate(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rooms
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-mono font-semibold text-base">
                        Room {room.number}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleToggleRoomStatus(room)}
                          className="cursor-pointer"
                        >
                          {room.status === "available" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unavailable
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bulk Create Dialog */}
      {showBulkCreate && roomType && (
        <BulkCreateRoomsDialog
          roomType={roomType}
          onSuccess={handleBulkCreateSuccess}
          onCancel={() => setShowBulkCreate(false)}
        />
      )}
    </DashboardLayout>
  )
}
