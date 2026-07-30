"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
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
  const token = () => localStorage.getItem("shettar_auth_token")

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
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || data.message || "Failed to delete room")
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
      <div className="h-full min-h-0 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center px-4">
        <p className="text-sm text-slate-500">No room type selected</p>
        <Link href="/dashboard/rooms">
          <Button size="sm" className="mt-3 h-8 rounded-lg">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
        </Link>
      </div>
    </DashboardLayout>
  )

  if (isLoading) return (
    <DashboardLayout activeTab="rooms">
      <div className="h-full min-h-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white">
        <LoadingSpinner size={32} />
      </div>
    </DashboardLayout>
  )

  if (!roomType) return (
    <DashboardLayout activeTab="rooms">
      <div className="h-full min-h-0 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-center px-4">
        <p className="text-sm text-slate-500">Room type not found</p>
        <Link href="/dashboard/rooms">
          <Button size="sm" className="mt-3 h-8 rounded-lg">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            Back
          </Button>
        </Link>
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout activeTab="rooms">
      <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="shrink-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
              <Link href="/dashboard/rooms" className="hover:text-indigo-600 transition-colors">Rooms</Link>
              <span>/</span>
              <span className="text-slate-600 truncate">{roomType.name}</span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Hotel className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="truncate">{roomType.name}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{rooms.length} rooms</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/dashboard/rooms">
              <Button variant="outline" size="sm" className="h-9 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            </Link>
            <Button size="sm" onClick={() => setShowBulkCreate(true)} className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-1.5" />
              Add rooms
            </Button>
          </div>
        </div>

        <div className="shrink-0 grid gap-3 grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
              <Hotel className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900 leading-none">{rooms.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Available</p>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 leading-none">{availableCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Unavailable</p>
              <XCircle className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-rose-700 leading-none">{unavailableCount}</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-5 overflow-hidden">
          <div className="lg:col-span-3 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Room numbers</p>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {rooms.length === 0 ? (
                <div className="h-full min-h-[10rem] flex flex-col items-center justify-center px-4 text-center">
                  <Hotel className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-900 mb-1">No rooms yet</p>
                  <p className="text-xs text-slate-500 mb-3">Add rooms to this type</p>
                  <Button size="sm" className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowBulkCreate(true)}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add rooms
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50 [&_tr]:border-slate-200">
                    <TableRow className="hover:bg-slate-50">
                      <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Room</TableHead>
                      <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</TableHead>
                      <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-center">Toggle</TableHead>
                      <TableHead className="h-9 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => {
                      const isAvailable = room.status === "available"
                      return (
                        <TableRow key={room.id} className="hover:bg-slate-50/80">
                          <TableCell className="px-3 py-2.5 font-mono text-sm font-semibold text-slate-900">
                            Room {room.number}
                          </TableCell>
                          <TableCell className="px-3 py-2.5">
                            {isAvailable ? (
                              <Badge variant="outline" className="rounded-md border border-emerald-100 bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wide gap-1 px-1.5 py-0">
                                <CheckCircle className="w-3 h-3" /> Available
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-md border border-rose-100 bg-rose-50 text-rose-700 text-[10px] font-semibold uppercase tracking-wide gap-1 px-1.5 py-0">
                                <XCircle className="w-3 h-3" /> Unavailable
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-center">
                            <Switch
                              checked={isAvailable}
                              onCheckedChange={() => openStatusModal(room)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRoomToDelete(room.id)}
                              className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-indigo-600" />
                Activity
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={fetchActivities}
                disabled={activitiesLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${activitiesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner size={24} />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Activity className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No room activity yet</p>
                </div>
              ) : (
                <div className="relative px-3 py-2">
                  <div className="absolute left-[26px] top-2 bottom-2 w-px bg-slate-100" />
                  <div className="space-y-0.5">
                    {activities.map((activity) => {
                      const isStatus = activity.action_type === "room_status_changed"
                      const isAvail = activity.metadata?.new_status === "available"

                      return (
                        <div key={activity.id} className="relative flex items-start gap-2.5 py-2 pl-1.5 pr-1 rounded-lg hover:bg-slate-50 transition-colors">
                          <div
                            className="relative z-10 flex-shrink-0 mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white"
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
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 leading-snug">{activity.description}</p>
                            {activity.metadata?.reason && (
                              <p className="text-[10px] text-slate-400 mt-0.5 italic">
                                &quot;{activity.metadata.reason}&quot;
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
            </div>
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
