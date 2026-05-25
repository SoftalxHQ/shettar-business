"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState, useCallback } from "react"
import { getAuthToken } from "@/lib/storage"
import { format, formatDistanceToNow, subDays, subMonths, startOfMonth, endOfMonth, startOfToday, endOfToday } from "date-fns"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
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
  ChevronDown, X, Tag, CreditCard, Send, Download, Megaphone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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
  "staff_role_switched": RefreshCw,
  "staff_suspended": UserMinus,
  "staff_deactivated": UserMinus,
  "staff_fired": UserMinus,
  "staff_reactivated": UserPlus,
  "room_created": BedDouble,
  "room_updated": Wrench,
  "room_status_changed": ArrowLeftRight,
  "withdrawal_requested": Banknote,
  "withdrawal_completed": CheckCircle2,
  "business_updated": Building2,
  "verification_requested": ShieldCheck,
  "bank_account_added": CreditCard,
  "bank_account_deleted": CreditCard,
  "bank_account_submitted": Send,
  "promo_code_created": Tag,
  "promo_code_updated": Tag,
  "guest_policies_updated": Megaphone,
  "restaurant_order_created": Activity,
  "restaurant_order_status_changed": Activity,
  "restaurant_order_paid": CreditCard,
  "restaurant_order_refunded": ArrowLeftRight,
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
  "staff_role_switched": "Role Switched",
  "staff_suspended": "Staff Suspended",
  "staff_deactivated": "Staff Deactivated",
  "staff_fired": "Staff Fired",
  "staff_reactivated": "Staff Reactivated",
  "room_created": "Rooms Created",
  "room_updated": "Rooms Updated",
  "room_status_changed": "Room Status",
  "withdrawal_requested": "Withdrawals",
  "withdrawal_completed": "Withdrawal Completed",
  "business_updated": "Business Updated",
  "verification_requested": "Verification Requested",
  "bank_account_added": "Bank Account Added",
  "bank_account_deleted": "Bank Account Removed",
  "bank_account_submitted": "Bank Account Submitted",
  "promo_code_created": "Promo Created",
  "promo_code_updated": "Promo Updated",
  "guest_policies_updated": "Guest Notices & Policies",
  "restaurant_order_created": "Restaurant Orders",
  "restaurant_order_status_changed": "Order Status",
  "restaurant_order_paid": "Order Paid",
  "restaurant_order_refunded": "Order Refunded",
}

export default function ActivityPage() {
  const { businessId } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filter, setFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)

  // ── Analytics-style date filter state ──
  const [rangeSelection, setRangeSelection] = useState("All time")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(undefined)
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(undefined)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const setRange = (range: string) => {
    const today = new Date()
    setRangeSelection(range)
    setIsCustomMode(false)
    setPage(1)

    if (range !== "Custom") setPopoverOpen(false)

    switch (range) {
      case "Today":
        setStartDate(startOfToday())
        setEndDate(endOfToday())
        break
      case "Yesterday": {
        const y = subDays(today, 1)
        setStartDate(new Date(y.setHours(0, 0, 0, 0)))
        setEndDate(new Date(y.setHours(23, 59, 59, 999)))
        break
      }
      case "Last 7 days":
        setStartDate(subDays(today, 6))
        setEndDate(today)
        break
      case "This month":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      case "Last month": {
        const lm = subMonths(today, 1)
        setStartDate(startOfMonth(lm))
        setEndDate(endOfMonth(lm))
        break
      }
      case "All time":
        setStartDate(undefined)
        setEndDate(undefined)
        break
      case "Custom":
        setIsCustomMode(true)
        break
    }
  }

  const applyCustomFilter = () => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate)
      setEndDate(tempEndDate)
      setRangeSelection("Custom")
      setPopoverOpen(false)
      setPage(1)
    }
  }

  // ─────────────────────────────────────────
  const fetchActivities = useCallback(async (
    pageNum = 1,
    actionType = filter,
    isRefresh = false,
  ) => {
    if (!businessId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const params = new URLSearchParams({ page: String(pageNum), limit: "25" })
      if (actionType) params.set("action_type", actionType)
      if (startDate) params.set("date_from", format(startDate, "yyyy-MM-dd"))
      if (endDate) params.set("date_to", format(endDate, "yyyy-MM-dd"))

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
  }, [businessId, filter, startDate, endDate])

  useEffect(() => { fetchActivities(1) }, [businessId, filter, startDate, endDate])

  const handleFilterChange = (value: string) => {
    setFilter(value === "all" ? "" : value)
    setPage(1)
  }

  const handleExport = async () => {
    if (!businessId) return
    try {
      setIsExporting(true)
      toast.loading("Preparing export...", { id: "activity-export" })

      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
      const token = getAuthToken()
      const params = new URLSearchParams()
      if (filter) params.set("action_type", filter)
      if (startDate) params.set("date_from", format(startDate, "yyyy-MM-dd"))
      if (endDate) params.set("date_to", format(endDate, "yyyy-MM-dd"))

      const response = await fetch(
        `${API_URL}/api/v1/user_businesses/${businessId}/activities/export?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Business-Id": businessId,
          },
        },
      )

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl

      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `business-activity-${format(new Date(), "yyyy-MM-dd")}.xlsx`
      if (contentDisposition) {
        const match = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (match?.[1]) filename = match[1]
      }

      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      toast.success("Activity log exported successfully", { id: "activity-export" })
    } catch {
      toast.error("Failed to export activity log", { id: "activity-export" })
    } finally {
      setIsExporting(false)
    }
  }

  const getIcon = (type: string) => ICON_MAP[type] ?? Circle

  const hasDateFilter = rangeSelection !== "All time"

  // Label shown on the trigger button
  const dateLabel = rangeSelection === "Custom" && startDate && endDate
    ? `${format(startDate, "d MMM")} – ${format(endDate, "d MMM")}`
    : rangeSelection

  return (
    <DashboardLayout activeTab="activity">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
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

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* ── Activity type filter ── */}
            <Select defaultValue="all" onValueChange={handleFilterChange}>
              <SelectTrigger className="w-44 h-11 text-sm border-slate-200 shadow-sm rounded-xl">
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

            {/* ── Analytics-style date filter ── */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl justify-between min-w-[160px]"
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                      Time Period
                    </span>
                    <span className="font-semibold text-slate-700 text-sm">{dateLabel}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-80 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
                <div className="space-y-1">
                  {[
                    { label: "Today", value: format(new Date(), "d MMM") },
                    { label: "Yesterday", value: format(subDays(new Date(), 1), "d MMM") },
                    { label: "Last 7 days", value: `${format(subDays(new Date(), 6), "d MMM")} – ${format(new Date(), "d MMM")}` },
                    { label: "This month", value: format(new Date(), "MMM") },
                    { label: "Last month", value: format(subMonths(new Date(), 1), "MMM") },
                    { label: "All time", value: "" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setRange(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                        rangeSelection === item.label && !isCustomMode
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.value}</span>
                    </button>
                  ))}

                  {/* Custom range */}
                  <button
                    onClick={() => setRange("Custom")}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isCustomMode || rangeSelection === "Custom"
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">Custom Range</span>
                  </button>

                  {(isCustomMode || rangeSelection === "Custom") && (
                    <div className="p-4 mt-2 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 shadow-inner">
                      {/* Start date */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">
                          Start date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                              {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={tempStartDate}
                              onSelect={setTempStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* End date */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">
                          End date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                              {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={tempEndDate}
                              onSelect={setTempEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                          onClick={applyCustomFilter}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 rounded-lg"
                          onClick={() => setIsCustomMode(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="h-11 gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? "Exporting..." : "Export Excel"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page, filter, true)}
              disabled={refreshing}
              className="h-11 gap-1.5 rounded-xl border-slate-200 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Stats strip ── */}
        {pagination && (
          <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap">
            Showing{" "}
            <span className="font-semibold text-slate-800">{activities.length}</span> of{" "}
            <span className="font-semibold text-slate-800">{pagination.count}</span> events
            {filter && (
              <><span className="text-slate-300">·</span><Badge variant="outline" className="text-indigo-600 border-indigo-200">{ACTION_LABELS[filter]}</Badge></>
            )}
            {hasDateFilter && (
              <><span className="text-slate-300">·</span>
                <Badge variant="outline" className="text-slate-600 border-slate-200 gap-1">
                  {dateLabel}
                  <button onClick={() => setRange("All time")} className="ml-1 hover:text-red-500 transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge></>
            )}
          </div>
        )}

        {/* ── Activity timeline ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size={36} />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No activity found</h3>
            <p className="text-sm text-slate-500">
              {hasDateFilter
                ? `No events in the "${dateLabel}" period.`
                : "Activity will appear here as staff perform operations."}
            </p>
            {hasDateFilter && (
              <Button variant="outline" size="sm" onClick={() => setRange("All time")} className="mt-4 gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear date filter
              </Button>
            )}
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

                const showDateSeparator =
                  idx === 0 ||
                  new Date(activity.occurred_at).toDateString() !==
                  new Date(activities[idx - 1].occurred_at).toDateString()

                return (
                  <div key={activity.id}>
                    {showDateSeparator && (
                      <div className="flex items-center gap-3 py-3 pl-14">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {isToday ? "Today" : format(new Date(activity.occurred_at), "EEEE, dd MMMM yyyy")}
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
                        <p className="text-sm text-slate-800 leading-snug">{activity.description}</p>
                        {activity.metadata?.notes && (
                          <p className="text-xs text-slate-500 mt-1">
                            Notes: {String(activity.metadata.notes)}
                          </p>
                        )}
                        <div className="flex items-center flex-wrap gap-2 mt-1">
                          {activity.actor && (
                            <span className="text-xs text-slate-500">
                              by <span className="font-medium text-slate-700">{activity.actor.name}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">•</span>
                          <span className="text-xs text-slate-400" title={fullTime}>{timeAgo}</span>
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

        {/* ── Pagination ── */}
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
