"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Hotel, Plus, Bed, CheckCircle, DollarSign } from "lucide-react"
import { toast } from "sonner"
import type { RoomType } from "@/lib/room-types"
import { RoomTypeCard } from "./components/RoomTypeCard"
import { RoomTypeDialog } from "./components/RoomTypeDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

export default function RoomsPage() {
  const { user, businessId, logout } = useAuth()
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null)
  const [roomTypeToDelete, setRoomTypeToDelete] = useState<number | null>(null)

  // Check admin access
  useEffect(() => {
    if (user && user.role !== "admin") {
      if (!user.permissions?.rooms?.view) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  // Fetch room types
  useEffect(() => {
    if (user?.role === "admin" || user?.permissions?.rooms?.view) {
      fetchRoomTypes()
    }
  }, [businessId, user])

  const fetchRoomTypes = async () => {
    if (!businessId) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("shettar_auth_token")

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
        setRoomTypes(Array.isArray(data) ? data : [])
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

  const handleDeleteRoomType = (id: number) => {
    setRoomTypeToDelete(id)
  }

  const executeDeleteRoomType = async () => {
    if (!roomTypeToDelete) return

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = localStorage.getItem("shettar_auth_token")

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeToDelete}`,
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
        setRoomTypeToDelete(null)
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
        toast.error("Failed to delete room type")
      }
    } catch (error) {
      console.error("Error deleting room type:", error)
      toast.error("Unable to delete room type")
    } finally {
      setRoomTypeToDelete(null)
    }
  }

  const handleSaveRoomType = () => {
    setShowCreateDialog(false)
    setSelectedRoomType(null)
    fetchRoomTypes()
  }

  const handleManageRooms = (id: number) => {
    router.push(`/dashboard/rooms/manage?id=${id}`)
  }

  // Calculate statistics
  const totalRooms = Array.isArray(roomTypes)
    ? roomTypes.reduce((sum, rt) => sum + (rt.rooms_count || 0), 0)
    : 0
  const totalAvailable = Array.isArray(roomTypes)
    ? roomTypes.reduce((sum, rt) => sum + (rt.available_rooms || 0), 0)
    : 0

  // Calculate average price only from room types with valid prices
  const roomTypesWithPrice = Array.isArray(roomTypes)
    ? roomTypes.filter(rt => rt.price && !isNaN(Number(rt.price)))
    : []
  const avgPrice = roomTypesWithPrice.length > 0
    ? roomTypesWithPrice.reduce((sum, rt) => sum + Number(rt.price), 0) / roomTypesWithPrice.length
    : 0

  if (user?.role !== "admin" && !user?.permissions?.rooms?.view) {
    return null
  }

  if (isLoading) {
    return (
      <DashboardLayout activeTab="rooms">
        <div className="h-full min-h-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="rooms">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-indigo-600" />
              Rooms
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Room types and inventory</p>
          </div>
          {(user?.role === "admin" || user?.permissions?.rooms?.create) && (
            <Button onClick={handleCreateRoomType} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Plus className="w-4 h-4 mr-1.5" />
              Create room type
            </Button>
          )}
        </div>

        <div className="shrink-0 grid gap-3 grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Room types</p>
              <Hotel className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{roomTypes.length}</p>
            <p className="text-[11px] text-slate-500 mt-1.5">Categories</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total rooms</p>
              <Bed className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{totalRooms}</p>
            <p className="text-[11px] text-slate-500 mt-1.5">All types</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available</p>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 leading-none">{totalAvailable}</p>
            <p className="text-[11px] text-slate-500 mt-1.5">Ready to book</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Avg price</p>
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">
              ₦{avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-1.5">Per night</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {roomTypes.length === 0 ? (
            <div className="h-full min-h-[12rem] flex flex-col items-center justify-center px-4 text-center">
              <Hotel className="w-10 h-10 text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-900 mb-1">No room types yet</h3>
              <p className="text-xs text-slate-500 mb-3">Create your first room type to get started</p>
              {(user?.role === "admin" || user?.permissions?.rooms?.create) && (
                <Button onClick={handleCreateRoomType} size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create room type
                </Button>
              )}
            </div>
          ) : (
            <div className="p-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 content-start">
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

      <ConfirmDialog
        open={!!roomTypeToDelete}
        onOpenChange={(open) => !open && setRoomTypeToDelete(null)}
        title="Delete Room Type"
        description="Are you sure you want to delete this room type? This will also delete all rooms of this type."
        confirmText="Delete"
        onConfirm={executeDeleteRoomType}
      />
    </DashboardLayout>
  )
}
