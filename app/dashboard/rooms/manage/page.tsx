"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  ArrowLeft, Plus, Hotel, CheckCircle, XCircle, Trash,
  Activity, RefreshCw, AlertTriangle, CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import type { RoomType, Room } from "@/lib/room-types"
import { BulkCreateRoomsDialog } from "../components/BulkCreateRoomsDialog"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { Suspense } from "react"
import { format, formatDistanceToNow } from "date-fns"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: number
  action_type: string
  description: string
  metadata: Record<string, any>
  occurred_at: string
  actor: { name: string } | null
  color: string
}

interface StatusModalState {
  room: Room | null
  targetStatus: "available" | "unavailable"
}

// ─── Component ────────────────────────────────────────────────────────────────

function RoomManagementContent() {
  const { businessId, logout } = useAuth()
  const searchParams = useSearchParams()
  const roomTypeId = searchParams?.get("id")

  const [roomType, setRoomType] = useState<RoomType | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<number | null>(null)

  // Status change modal
  const [statusModal, setStatusModal] = useState<StatusModalState>({ room: null, targetStatus: "unavailable" })
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const reasonRequired = statusModal.targetStatus === "unavailable"

  // Activity panel
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
  const token = () => localStorage.getItem("abri_auth_token")

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRoomTypeAndRooms = async () => {
    if (!businessId || !roomTypeId) return
    try {
      const [rtRes, roomRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}`, {
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        }),
        fetch(`${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms`, {
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
        }),
      ])

      const handle401 = async (res: Response) => {
        if (res.status === 401) {
          const e = await res.json().catch(() => ({}))
          if (e.errors?.[0]?.id === "expiration" || e.message === "Signature has expired") {
            logout(true); return true
          }
        }
        return false
      }

      if (await handle401(rtRes)) return
      if (rtRes.ok) setRoomType(await rtRes.json())

      if (await handle401(roomRes)) return
      if (roomRes.ok) setRooms(await roomRes.json())
    } catch {
      toast.error("Unable to load room data")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActivities = async () => {
    if (!businessId) return
    setActivitiesLoading(true)
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/activities?action_type=room_status_changed&action_type=room_created&action_type=room_updated&limit=30`,
        { headers: { Authorization: `Bearer ${token()}` } }
      )
      // The backend filter only supports a single action_type at a time.
      // Fetch without filter to limit to room-related events in this sub-list:
      const res2 = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/activities?limit=40`,
        { headers: { Authorization: `Bearer ${token()}` } }
      )
      if (res2.ok) {
        const data = await res2.json()
        const ROOM_TYPES = ["room_created", "room_updated", "room_status_changed"]
        setActivities((data.activities || []).filter((a: ActivityItem) => ROOM_TYPES.includes(a.action_type)))
      }
    } catch { /* silent */ }
    finally { setActivitiesLoading(false) }
  }

  useEffect(() => {
    if (roomTypeId) { fetchRoomTypeAndRooms(); fetchActivities() }
  }, [roomTypeId, businessId])

  // ── Status toggle — open modal ─────────────────────────────────────────────

  const openStatusModal = (room: Room) => {
    const target = room.status === "available" ? "unavailable" : "available"
    setStatusModal({ room, targetStatus: target })
    setReason("")
  }

  const closeStatusModal = () => {
    if (isSubmitting) return
    setStatusModal({ room: null, targetStatus: "unavailable" })
    setReason("")
  }

  // ── Status toggle — submit ─────────────────────────────────────────────────

  const submitStatusChange = async () => {
    if (!statusModal.room) return
    if (reasonRequired && !reason.trim()) {
      toast.error("Please provide a reason before submitting")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms/${statusModal.room.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
          body: JSON.stringify({ room: { status: statusModal.targetStatus, reason: reason.trim() || null } }),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const verb = statusModal.targetStatus === "available" ? "available" : "unavailable"
        toast.success(data.message || `Room marked as ${verb}`)
        closeStatusModal()
        fetchRoomTypeAndRooms()
        fetchActivities()
      } else {
        toast.error("Failed to update room status")
      }
    } catch {
      toast.error("Network error — please try again")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const executeDeleteRoom = async () => {
    if (!roomToDelete) return
    try {
      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/room_types/${roomTypeId}/rooms/${roomToDelete}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token()}` } }
      )
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || "Room deleted")
        fetchRoomTypeAndRooms()
        fetchActivities()
      } else {
        toast.error("Failed to delete room")
      }
    } catch {
      toast.error("Unable to delete room")
    } finally {
      setRoomToDelete(null)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const availableCount = rooms.filter(r => r.status === "available").length
  const unavailableCount = rooms.filter(r => r.status === "unavailable").length

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (!roomTypeId) return (
    <DashboardLayout activeTab="rooms">
      <div className="text-center py-12">
        <p className="text-muted-foreground">No room type selected</p>
        <Link href="/dashboard/rooms"><Button className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      </div>
    </DashboardLayout>
  )

  if (isLoading) return (
    <DashboardLayout activeTab="rooms">
      <div className="flex items-center justify-center h-96"><LoadingSpinner size={32} /></div>
    </DashboardLayout>
  )

  if (!roomType) return (
    <DashboardLayout activeTab="rooms">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Room type not found</p>
        <Link href="/dashboard/rooms"><Button className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button></Link>
      </div>
    </DashboardLayout>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout activeTab="rooms">
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Link href="/dashboard/rooms" className="hover:text-foreground">Rooms</Link>
              <span>/</span>
              <span>{roomType.name}</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{roomType.name} — Rooms</h1>
            <p className="text-muted-foreground mt-1">{rooms.length} total rooms</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/rooms">
              <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
            </Link>
            <Button onClick={() => setShowBulkCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Rooms
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Total Rooms", value: rooms.length, icon: Hotel, color: "" },
            { label: "Available", value: availableCount, icon: CheckCircle, color: "text-green-600" },
            { label: "Unavailable", value: unavailableCount, icon: XCircle, color: "text-red-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Two-column layout: table + activity ── */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Rooms table (3/5) */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Room Numbers</CardTitle>
              </CardHeader>
              <CardContent>
                {rooms.length === 0 ? (
                  <div className="text-center py-12">
                    <Hotel className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No rooms yet</h3>
                    <p className="text-muted-foreground mb-4">Add rooms to this room type to get started</p>
                    <Button onClick={() => setShowBulkCreate(true)}>
                      <Plus className="w-4 h-4 mr-2" />Add Rooms
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Toggle</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room) => {
                        const isAvailable = room.status === "available"
                        return (
                          <TableRow key={room.id}>
                            <TableCell className="font-mono font-semibold text-base">
                              Room {room.number}
                            </TableCell>

                            {/* Status badge */}
                            <TableCell>
                              {isAvailable ? (
                                <Badge className="bg-green-100 text-green-800 gap-1 border-0">
                                  <CheckCircle className="w-3 h-3" /> Available
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 gap-1 border-0">
                                  <XCircle className="w-3 h-3" /> Unavailable
                                </Badge>
                              )}
                            </TableCell>

                            {/* Toggle switch */}
                            <TableCell className="text-center">
                              <Switch
                                checked={isAvailable}
                                onCheckedChange={() => openStatusModal(room)}
                                className="data-[state=checked]:bg-green-500"
                              />
                            </TableCell>

                            {/* Delete */}
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRoomToDelete(room.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity feed (2/5) */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Room Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={fetchActivities}
                  disabled={activitiesLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activitiesLoading ? "animate-spin" : ""}`} />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <LoadingSpinner size={24} />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No room activity yet</p>
                  </div>
                ) : (
                  <div className="relative px-4 pb-4">
                    <div className="absolute left-6 top-0 bottom-4 w-px bg-slate-100" />
                    <div className="space-y-0.5">
                      {activities.map((activity) => {
                        const isStatus = activity.action_type === "room_status_changed"
                        const isAvail = activity.metadata?.new_status === "available"

                        return (
                          <div key={activity.id} className="relative flex items-start gap-3 py-2.5 pl-2 pr-1 rounded-lg hover:bg-slate-50 transition-colors group">
                            {/* Dot */}
                            <div
                              className="relative z-10 flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white"
                              style={{ background: activity.color + "20" }}
                            >
                              {isStatus ? (
                                isAvail
                                  ? <CheckCircle2 className="w-2.5 h-2.5" style={{ color: activity.color }} />
                                  : <AlertTriangle className="w-2.5 h-2.5" style={{ color: activity.color }} />
                              ) : (
                                <Activity className="w-2.5 h-2.5" style={{ color: activity.color }} />
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-700 leading-snug">{activity.description}</p>
                              {activity.metadata?.reason && (
                                <p className="text-[10px] text-slate-400 mt-0.5 italic">
                                  "{activity.metadata.reason}"
                                </p>
                              )}
                              <p
                                className="text-[10px] text-slate-400 mt-0.5"
                                title={format(new Date(activity.occurred_at), "dd MMM yyyy HH:mm")}
                              >
                                {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Status Change Reason Modal ── */}
      <Dialog open={!!statusModal.room} onOpenChange={(open) => !open && closeStatusModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {statusModal.targetStatus === "unavailable" ? (
                <><XCircle className="w-5 h-5 text-red-500" /> Mark Room Unavailable</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 text-green-500" /> Mark Room Available</>
              )}
            </DialogTitle>
            <DialogDescription>
              {statusModal.targetStatus === "unavailable"
                ? `You are about to mark Room ${statusModal.room?.number} as unavailable. Please provide a reason (e.g. maintenance, cleaning, damage).`
                : `You are about to mark Room ${statusModal.room?.number} as available again. Optionally add a note.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="status-reason" className="text-sm font-medium">
                Reason {reasonRequired && <span className="text-red-500">*</span>}
              </Label>
              <Textarea
                id="status-reason"
                className="mt-1.5 resize-none"
                rows={3}
                placeholder={
                  statusModal.targetStatus === "unavailable"
                    ? "e.g. AC repair, deep cleaning, plumbing issue..."
                    : "e.g. Repairs completed, room is ready..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
              />
              {reasonRequired && !reason.trim() && (
                <p className="text-xs text-red-500 mt-1">Reason is required to disable a room</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={closeStatusModal} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitStatusChange}
              disabled={isSubmitting || (reasonRequired && !reason.trim())}
              className={
                statusModal.targetStatus === "unavailable"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {isSubmitting ? <LoadingSpinner size={16} /> : (
                statusModal.targetStatus === "unavailable" ? "Confirm Disable" : "Confirm Enable"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Create ── */}
      {showBulkCreate && roomType && (
        <BulkCreateRoomsDialog
          roomType={roomType}
          onSuccess={() => { setShowBulkCreate(false); fetchRoomTypeAndRooms(); fetchActivities() }}
          onCancel={() => setShowBulkCreate(false)}
        />
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!roomToDelete}
        onOpenChange={(open) => !open && setRoomToDelete(null)}
        title="Delete Room"
        description="Are you sure you want to delete this room? This cannot be undone."
        confirmText="Delete"
        onConfirm={executeDeleteRoom}
      />
    </DashboardLayout>
  )
}

export default function RoomManagementPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><LoadingSpinner size={32} /></div>}>
      <RoomManagementContent />
    </Suspense>
  )
}
