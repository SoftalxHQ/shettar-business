"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { useAuth } from "@/lib/auth-context"
import { useEffect, useState, useCallback } from "react"
import { BusinessAiAnalyzerButton } from "@/components/business-ai-analyzer-button"
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
  Sparkles,
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
  "ai_analyzer_run": Sparkles,
  "ai_points_purchased": Sparkles,
  "ai_points_reset": Sparkles,
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
  "ai_analyzer_run": "AI Analyzer",
  "ai_points_purchased": "AI Points Purchased",
  "ai_points_reset": "AI Points Reset",
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
  const { businessId, user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [filter, setFilter] = useState("")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const canRunAi = user?.role === "admin" || !!user?.permissions?.ai_analyzer?.run

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
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">

        {/* ── Header ── */}
        <div className="flex shrink-0 flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 shrink-0 text-slate-600" />
              Activity Log
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time record of all business operations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <BusinessAiAnalyzerButton
              businessId={businessId}
              canRun={canRunAi}
              page="activity"
              filters={{
                range: rangeSelection === "Custom" ? undefined : rangeSelection,
                date_from: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                date_to: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
                start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
                action_type: filter || undefined,
              }}
            />
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              aria-label={isExporting ? "Exporting..." : "Export Excel"}
              className="h-8 gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export Excel"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchActivities(page, filter, true)}
              disabled={refreshing}
              className="h-8 gap-1.5 rounded-lg border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── Filters toolbar ── */}
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select defaultValue="all" onValueChange={handleFilterChange}>
              <SelectTrigger className="w-full sm:w-44 h-8 text-xs border-slate-200 rounded-lg">
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

            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 w-full px-3 flex items-center gap-2.5 border-slate-200 bg-white hover:bg-slate-50 rounded-lg justify-between sm:min-w-[180px] sm:w-auto shrink-0"
                >
                  <div className="flex min-w-0 flex-col items-start text-left">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-0.5">
                      Time period
                    </span>
                    <span className="truncate text-xs font-medium text-slate-700">{dateLabel}</span>
                  </div>
                  <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-200", popoverOpen && "rotate-180")} />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[min(20rem,calc(100vw-2rem))] p-1.5 rounded-xl border-slate-200" align="end">
                <div className="space-y-0.5">
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
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                        rangeSelection === item.label && !isCustomMode
                          ? "bg-slate-100 text-slate-900"
                          : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="text-[11px] text-slate-400 font-normal">{item.value}</span>
                    </button>
                  ))}

                  <button
                    onClick={() => setRange("Custom")}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isCustomMode || rangeSelection === "Custom"
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span>Custom range</span>
                  </button>

                  {(isCustomMode || rangeSelection === "Custom") && (
                    <div className="p-3 mt-1 bg-slate-50 rounded-xl space-y-3 border border-slate-100">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          Start date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-8 px-3 bg-white border-slate-200 rounded-lg text-xs">
                              {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={tempStartDate}
                              onSelect={setTempStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          End date
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-8 px-3 bg-white border-slate-200 rounded-lg text-xs">
                              {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl border-slate-200" align="start">
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
                          variant="outline"
                          className="flex-1 h-8 rounded-lg border-slate-200"
                          onClick={applyCustomFilter}
                        >
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-8 rounded-lg"
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
          </div>
        </div>

        {/* ── Timeline panel ── */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-slate-100">
            {pagination ? (
              <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                Showing{" "}
                <span className="font-semibold text-slate-800">{activities.length}</span> of{" "}
                <span className="font-semibold text-slate-800">{pagination.count}</span> events
                {filter && (
                  <>
                    <span className="text-slate-300">·</span>
                    <Badge variant="outline" className="text-slate-600 border-slate-200 text-[10px] h-5 px-1.5">{ACTION_LABELS[filter]}</Badge>
                  </>
                )}
                {hasDateFilter && (
                  <>
                    <span className="text-slate-300">·</span>
                    <Badge variant="outline" className="text-slate-600 border-slate-200 gap-1 text-[10px] h-5 px-1.5">
                      {dateLabel}
                      <button onClick={() => setRange("All time")} className="ml-0.5 hover:text-red-500 transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Activity timeline</p>
            )}
          </div>

          {loading ? (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center px-4">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 mb-0.5">No activity found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {hasDateFilter
                  ? `No events in the "${dateLabel}" period.`
                  : "Activity will appear here as staff perform operations."}
              </p>
              {hasDateFilter && (
                <Button variant="outline" size="sm" onClick={() => setRange("All time")} className="mt-3 h-8 gap-1.5 rounded-lg border-slate-200">
                  <X className="w-3.5 h-3.5" /> Clear date filter
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="relative">
                <div className="absolute left-4 top-3 bottom-3 w-px bg-slate-200 z-[1]" aria-hidden />

                <div>
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
                          <div className="flex items-center gap-2 py-2 pl-10 pr-3">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                              {isToday ? "Today" : format(new Date(activity.occurred_at), "EEEE, dd MMMM yyyy")}
                            </span>
                            <div className="flex-1 h-px bg-slate-100" />
                          </div>
                        )}

                        <div className="relative flex items-start gap-3 pr-3 py-2 hover:bg-slate-50/50 transition-colors">
                          <div className="relative z-10 w-8 flex justify-center flex-shrink-0">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white"
                              style={{ backgroundColor: activity.color + "20", color: activity.color }}
                            >
                              <Icon className="w-3 h-3" style={{ stroke: activity.color }} />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="break-words text-sm text-slate-800 leading-snug">{activity.description}</p>
                            {activity.metadata?.notes && (
                              <p className="break-words text-[11px] text-slate-500 mt-0.5">
                                Notes: {String(activity.metadata.notes)}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                              {activity.actor && (
                                <span className="text-[11px] text-slate-500">
                                  by <span className="font-medium text-slate-700">{activity.actor.name}</span>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">•</span>
                              <span className="text-[11px] text-slate-400" title={fullTime}>{timeAgo}</span>
                            </div>
                          </div>

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
            </div>
          )}

          {pagination && pagination.last > 1 && (
            <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActivities(page - 1)}
                disabled={page <= 1 || loading}
                className="h-8 gap-1 rounded-lg border-slate-200"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>
              <span className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-800">{page}</span> of{" "}
                <span className="font-semibold text-slate-800">{pagination.last}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActivities(page + 1)}
                disabled={page >= pagination.last || loading}
                className="h-8 gap-1 rounded-lg border-slate-200"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
