"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState, useCallback } from "react"
import { getAuthToken } from "@/lib/storage"
import { format, formatDistanceToNow } from "date-fns"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  LogIn, LogOut, CalendarCheck, CalendarX, Pencil,
  UserPlus, ShieldCheck, UserMinus, BedDouble, Wrench,
  ArrowLeftRight, Banknote, CheckCircle2, Building2,
  Circle, RefreshCw, ChevronLeft, ChevronRight, Activity,
} from "lucide-react"

interface ActivityItem {
  id: number
  action_type: string
  description: string
  metadata: Record<string, any>
  occurred_at: string
  actor: { id: number; name: string; first_name: string; last_name: string } | null
  icon: string
  color: string
}

interface Pagination {
  count: number
  last: number
}

const ICON_MAP: Record<string, React.ElementType> = {
  "check_in": LogIn,
  "check_out": LogOut,
  "booking_created": CalendarCheck,
  "booking_cancelled": CalendarX,
  "booking_updated": Pencil,
  "staff_added": UserPlus,
  "staff_updated": ShieldCheck,
  "staff_removed": UserMinus,
  "room_created": BedDouble,
  "room_updated": Wrench,
  "room_status_changed": ArrowLeftRight,
  "withdrawal_requested": Banknote,
  "withdrawal_completed": CheckCircle2,
  "business_updated": Building2,
}

const ACTION_LABELS: Record<string, string> = {
  "": "All Activity",
  "check_in": "Check-ins",
  "check_out": "Check-outs",
  "booking_created": "Bookings Created",
  "booking_cancelled": "Bookings Cancelled",
  "booking_updated": "Bookings Updated",
  "staff_added": "Staff Added",
  "staff_updated": "Staff Updated",
  "staff_removed": "Staff Removed",
  "room_created": "Rooms Created",
  "room_updated": "Rooms Updated",
  "room_status_changed": "Room Status",
  "withdrawal_requested": "Withdrawals",
  "withdrawal_completed": "Withdrawal Completed",
  "business_updated": "Business Updated",
}

export default function ActivityPage() {
  const { businessId } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const fetchActivities = useCallback(async (pageNum = 1, actionType = filter, isRefresh = false) => {
    if (!businessId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const params = new URLSearchParams({ page: String(pageNum), limit: "25" })
      if (actionType) params.set("action_type", actionType)

      const res = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/activities?${params}`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities || [])
        setPagination(data.pagination || null)
        setPage(pageNum)
      }
    } catch (e) {
      console.error("Failed to fetch activities", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [businessId, filter])

  useEffect(() => { fetchActivities(1) }, [businessId, filter])

  const handleFilterChange = (value: string) => {
    setFilter(value === "all" ? "" : value)
    setPage(1)
  }

  const getIcon = (type: string) => {
    const Icon = ICON_MAP[type] ?? Circle
    return Icon
  }

  return (
    <DashboardLayout activeTab="activity">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-6 h-6 text-indigo-600" />
              Activity Log
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time record of all business operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select defaultValue="all" onValueChange={handleFilterChange}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value || "all"} value={value || "all"}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page, filter, true)}
              disabled={refreshing}
              className="h-9 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        {pagination && (
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">{activities.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.count}</span> events
            {filter && (
              <> — filtered by <Badge variant="outline" className="ml-1 text-indigo-600 border-indigo-200">{ACTION_LABELS[filter]}</Badge></>
            )}
          </div>
        )}

        {/* Activity timeline */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size={36} />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No activity yet</h3>
            <p className="text-sm text-slate-500">
              Activity will appear here as staff perform operations.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-100" />

            <div className="space-y-1">
              {activities.map((activity, idx) => {
                const Icon = getIcon(activity.action_type)
                const isToday = new Date(activity.occurred_at).toDateString() === new Date().toDateString()
                const timeAgo = formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })
                const fullTime = format(new Date(activity.occurred_at), "dd MMM yyyy, HH:mm")

                // Date separator
                const showDateSeparator =
                  idx === 0 ||
                  new Date(activity.occurred_at).toDateString() !==
                  new Date(activities[idx - 1].occurred_at).toDateString()

                return (
                  <div key={activity.id}>
                    {showDateSeparator && (
                      <div className="flex items-center gap-3 py-3 pl-14">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {isToday
                            ? "Today"
                            : format(new Date(activity.occurred_at), "EEEE, dd MMMM yyyy")}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>
                    )}

                    <div className="relative flex items-start gap-4 pl-2 pr-4 py-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
                      {/* Icon bubble */}
                      <div
                        className="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white"
                        style={{ backgroundColor: activity.color + "20", color: activity.color }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ stroke: activity.color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-slate-800 leading-snug">
                          {activity.description}
                        </p>
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          {activity.actor && (
                            <span className="text-xs text-slate-500">
                              by <span className="font-medium text-slate-700">{activity.actor.name}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-xs text-slate-400" title={fullTime}>
                            {timeAgo}
                          </span>
                        </div>
                      </div>

                      {/* Action type badge */}
                      <Badge
                        variant="outline"
                        className="hidden sm:inline-flex text-[10px] h-5 px-1.5 flex-shrink-0 border capitalize"
                        style={{
                          color: activity.color,
                          borderColor: activity.color + "40",
                          background: activity.color + "10",
                        }}
                      >
                        {activity.action_type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.last > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page - 1)}
              disabled={page <= 1 || loading}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
              <span className="font-semibold text-slate-800">{pagination.last}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page + 1)}
              disabled={page >= pagination.last || loading}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
