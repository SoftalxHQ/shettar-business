"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/lib/store/hooks"
import { selectUser, selectBusinessId } from "@/lib/store/slices/authSlice"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  CreditCard,
  Banknote,
  TrendingUp,
  DollarSign,
  Wallet,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Copy,
  Clock,
  Loader2
} from "lucide-react"
import { getAuthToken } from "@/lib/storage"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { format, subDays, startOfToday, endOfToday, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
import { BusinessAiAnalyzerButton } from "@/components/business-ai-analyzer-button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import Link from "next/link"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts"
import { cn } from "@/lib/utils"

interface BusinessDetails {
  withdrawable_balance: string
  refund_balance: string
  pending_balance: string
  cash_balance: string
  pos_balance: string
  onsite_payment_balance: string
}

interface Transaction {
  id: string
  bookingCode: string
  date: string
  description: string
  type: "income" | "refund" | "withdrawal"
  amount: number
  status: "completed" | "pending" | "failed"
  method?: string
  net_amount?: number
  total_debit?: number
  commission_amount?: number
  promo_code?: string
  promo_discount_amount?: number
  subtotal_before_discount?: number
}

function getPromoBreakdown(t: Transaction) {
  if (!t.promo_code) return null
  const discount = t.promo_discount_amount ?? 0
  if (!discount || discount <= 0) return null
  const subtotal = t.subtotal_before_discount && t.subtotal_before_discount > 0
    ? t.subtotal_before_discount
    : t.amount + discount
  return {
    code: t.promo_code,
    subtotal,
    discount,
    received: t.amount,
  }
}

function formatNairaFull(value: number) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

/** Compact tile display: ₦1.2M / ₦850K; keeps full digits under 10,000. */
function formatNairaCompact(value: number) {
  const n = Number(value || 0)
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs < 10_000) return `${sign}${formatNairaFull(abs)}`
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: abs >= 1_000_000 ? 2 : 1,
  }).format(abs)
  return `${sign}₦${compact}`
}

const MOCK_ANALYTICS_DATA = [
  { name: 'Jan', income: 4000, withdrawal: 2400, amt: 2400 },
  { name: 'Feb', income: 3000, withdrawal: 1398, amt: 2210 },
  { name: 'Mar', income: 2000, withdrawal: 9800, amt: 2290 },
  { name: 'Apr', income: 2780, withdrawal: 3908, amt: 2000 },
  { name: 'May', income: 1890, withdrawal: 4800, amt: 2181 },
  { name: 'Jun', income: 2390, withdrawal: 3800, amt: 2500 },
  { name: 'Jul', income: 3490, withdrawal: 4300, amt: 2100 },
]

export default function FinancePage() {
  const { logout } = useAuth()
  const user = useAppSelector(selectUser)
  const businessId = useAppSelector(selectBusinessId)
  const router = useRouter()
  const [balances, setBalances] = useState<BusinessDetails | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [balanceRangeSelection, setBalanceRangeSelection] = useState<string>("This month")
  const [balanceStartDate, setBalanceStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [balanceEndDate, setBalanceEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [balanceTempStartDate, setBalanceTempStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [balanceTempEndDate, setBalanceTempEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [isBalanceCustomMode, setIsBalanceCustomMode] = useState(false)
  const [dateRangeSelection, setDateRangeSelection] = useState<string>("This month")
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [tempStartDate, setTempStartDate] = useState<Date | undefined>(startOfMonth(new Date()))
  const [tempEndDate, setTempEndDate] = useState<Date | undefined>(endOfMonth(new Date()))
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState("6m")
  const [analyticsData, setAnalyticsData] = useState<any[]>([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [periodBalances, setPeriodBalances] = useState<{
    pending: number;
    refund: number;
    cash: number;
    pos: number;
    onsite: number;
    withdrawable: number;
  }>({ pending: 0, refund: 0, cash: 0, pos: 0, onsite: 0, withdrawable: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Popover states to manage closing on selection
  const [balancePopoverOpen, setBalancePopoverOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [typePopoverOpen, setTypePopoverOpen] = useState(false)
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (user && user.role !== 'admin' && user.permissions) {
      const hasFinance = user.permissions.finance?.view;
      if (!hasFinance) {
        router.push("/dashboard/business")
      }
    }
  }, [user, router])

  useEffect(() => {
    const fetchData = async () => {
      if (!businessId) return
      try {
        if (isInitialLoading) {
          // Keep initial loading true
        } else {
          setIsTableLoading(true)
        }
        const token = getAuthToken()
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId
        }

        const businessRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}`, { headers })

        if (businessRes.status === 401) {
          logout(true)
          return
        }

        if (businessRes.ok) {
          const businessData = await businessRes.json()
          setBalances(businessData)
        }

        const params = new URLSearchParams()
        if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"))
        if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"))
        if (filterType !== "all") params.append("transaction_type", filterType)
        if (filterStatus !== "all") params.append("status", filterStatus)

        const transactionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/transactions?${params.toString()}`, { headers })
        if (transactionsRes.status === 401) {
          logout(true)
          return
        }
        if (transactionsRes.ok) {
          const transactionsData = await transactionsRes.json()
          const mappedTransactions: Transaction[] = transactionsData.map((t: any) => ({
            id: t.id.toString(),
            bookingCode: t.booking_id || t.metadata?.booking_id,
            date: t.created_at,
            description: t.description,
            type: t.transaction_type,
            amount: parseFloat(t.amount || "0"),
            status: t.status,
            method: t.metadata?.payment_method,
            net_amount: t.metadata?.net_amount != null ? parseFloat(t.metadata.net_amount) : undefined,
            total_debit: t.metadata?.total_debit != null ? parseFloat(t.metadata.total_debit) : undefined,
            commission_amount: t.metadata?.commission_amount != null ? parseFloat(t.metadata.commission_amount) : undefined,
            promo_code: t.metadata?.promo_code,
            promo_discount_amount: t.metadata?.promo_discount_amount != null ? parseFloat(t.metadata.promo_discount_amount) : undefined,
            subtotal_before_discount: t.metadata?.subtotal_before_discount != null ? parseFloat(t.metadata.subtotal_before_discount) : undefined,
          }))
          setTransactions(mappedTransactions)
        }
      } catch (error) {
        console.error("Failed to fetch finance data", error)
      } finally {
        setIsInitialLoading(false)
        setIsTableLoading(false)
      }
    }
    fetchData()
  }, [businessId, startDate, endDate, filterType, filterStatus])

  const fetchFinancialGrowth = async (period: string) => {
    if (!businessId) return
    try {
      setLoadingAnalytics(true)
      const token = getAuthToken()
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/financial_growth?period=${period}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId
        }
      })

      if (res.status === 401) {
        logout(true)
        return
      }

      if (res.ok) {
        const data = await res.json()
        setAnalyticsData(data)
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("Financial growth fetch failed:", errorData)
        toast.error(errorData.error || "Failed to load analytics data")
      }
    } catch (error) {
      console.error("Failed to fetch financial growth", error)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (showAnalytics) {
      fetchFinancialGrowth(analyticsPeriod)
    }
  }, [analyticsPeriod, showAnalytics, businessId])

  const fetchBalanceStats = async (start?: Date, end?: Date) => {
    if (!businessId) return
    try {
      setLoadingStats(true)
      const token = getAuthToken()
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/balance_stats`

      const params = new URLSearchParams()
      if (start) params.append("start_date", format(start, "yyyy-MM-dd"))
      if (end) params.append("end_date", format(end, "yyyy-MM-dd"))

      const queryString = params.toString()
      if (queryString) url += `?${queryString}`

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId
        }
      })

      if (res.status === 401) {
        logout(true)
        return
      }

      if (res.ok) {
        const data = await res.json()
        setPeriodBalances(data)
      }
    } catch (error) {
      console.error("Failed to fetch balance stats", error)
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => {
    fetchBalanceStats(balanceStartDate, balanceEndDate)
  }, [balanceStartDate, balanceEndDate, businessId])

  const getFilteredTransactions = () => {
    let filtered = [...transactions]
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query) ||
        (t.bookingCode && t.bookingCode.toLowerCase().includes(query)) ||
        t.amount.toString().includes(query)
      )
    }
    return filtered
  }

  const setRange = (range: string) => {
    const today = new Date()
    setDateRangeSelection(range)
    setIsCustomMode(false)

    if (range !== "Custom") {
      setDatePopoverOpen(false)
    }

    switch (range) {
      case "Today":
        setStartDate(startOfToday())
        setEndDate(endOfToday())
        break
      case "Last 7 days":
        setStartDate(subDays(today, 6))
        setEndDate(today)
        break
      case "This month":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      case "Last month":
        const lastMonth = subMonths(today, 1)
        setStartDate(startOfMonth(lastMonth))
        setEndDate(endOfMonth(lastMonth))
        break
      case "All time":
        setStartDate(undefined)
        setEndDate(undefined)
        break
      case "Custom":
        setIsCustomMode(true)
        break
    }
  }

  const setBalanceRange = (range: string) => {
    const today = new Date()
    setBalanceRangeSelection(range)
    setIsBalanceCustomMode(false)

    if (range !== "Custom") {
      setBalancePopoverOpen(false)
    }

    switch (range) {
      case "Today":
        setBalanceStartDate(startOfToday())
        setBalanceEndDate(endOfToday())
        break
      case "Last 7 days":
        setBalanceStartDate(subDays(today, 6))
        setBalanceEndDate(today)
        break
      case "This month":
        setBalanceStartDate(startOfMonth(today))
        setBalanceEndDate(endOfMonth(today))
        break
      case "Last month":
        const lastMonth = subMonths(today, 1)
        setBalanceStartDate(startOfMonth(lastMonth))
        setBalanceEndDate(endOfMonth(lastMonth))
        break
      case "All time":
        setBalanceStartDate(undefined)
        setBalanceEndDate(undefined)
        break
      case "Custom":
        setIsBalanceCustomMode(true)
        break
    }
  }

  const applyBalanceCustomFilter = (start?: Date, end?: Date) => {
    const s = start || balanceTempStartDate
    const e = end || balanceTempEndDate
    if (s && e) {
      setBalanceStartDate(s)
      setBalanceEndDate(e)
      setBalanceRangeSelection("Custom")
      setBalancePopoverOpen(false)
    }
  }

  const resetBalanceCustomFilter = () => {
    setBalanceTempStartDate(balanceStartDate)
    setBalanceTempEndDate(balanceEndDate)
    setIsBalanceCustomMode(false)
  }

  const applyCustomFilter = (start?: Date, end?: Date) => {
    const s = start || tempStartDate
    const e = end || tempEndDate
    if (s && e) {
      setStartDate(s)
      setEndDate(e)
      setDateRangeSelection("Custom")
      setDatePopoverOpen(false)
    }
  }

  const resetCustomFilter = () => {
    setTempStartDate(startDate)
    setTempEndDate(endDate)
    setIsCustomMode(false)
  }

  const clearFilters = () => {
    setFilterType("all")
    setFilterStatus("all")
    setSearchQuery("")
    setRange("This month")
    setBalanceRange("This month")
  }

  const handleExport = async () => {
    if (!businessId) return
    try {
      setIsExporting(true)
      toast.loading("Preparing your Excel export...", { id: "export" })
      const token = getAuthToken()
      const params = new URLSearchParams()
      if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"))
      if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"))
      if (filterType !== "all") params.append("transaction_type", filterType)
      if (filterStatus !== "all") params.append("status", filterStatus)

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/export_transactions?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Business-Id": businessId
        }
      })

      if (response.status === 401) {
        logout(true)
        return
      }

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl

      // Get filename from response header if possible, or use fallback
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `Transactions-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
        const matches = /filename="?([^"]+)"?/.exec(contentDisposition)
        if (matches && matches[1]) filename = matches[1]
      }

      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      toast.success("Excel file downloaded successfully!", { id: "export" })
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export transactions. Please try again.", { id: "export" })
    } finally {
      setIsExporting(false)
    }
  }

  const balanceTotals = periodBalances

  const filteredTransactions = getFilteredTransactions()
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("ID copied to clipboard")
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const balanceTiles = [
    {
      title: "Withdrawable",
      value: Number(balances?.withdrawable_balance || 0),
      icon: Wallet,
      desc: "Available for payout",
      emphasize: true,
    },
    { title: "Pending", value: balanceTotals.pending, icon: RefreshCcw, desc: "Escrow (wallet/card)" },
    { title: "Refunds", value: balanceTotals.refund, icon: ArrowDownLeft, desc: "Total reversals" },
    { title: "Cash", value: balanceTotals.cash, icon: Banknote, desc: "Physical cash on-site" },
    { title: "POS / Transfer", value: balanceTotals.pos, icon: CreditCard, desc: "Terminal & bank" },
    { title: "Total onsite", value: balanceTotals.onsite, icon: DollarSign, desc: "Cash + POS + transfer" },
  ]

  if (isInitialLoading) {
    return (
      <DashboardLayout activeTab="finance">
        <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
          <LoadingSpinner size={32} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="finance">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-x-hidden overflow-hidden">
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between min-w-0">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">Finance</h1>
            <p className="text-xs text-slate-500">Balances and transactions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
            <BusinessAiAnalyzerButton
              businessId={businessId}
              canRun={user?.role === "admin" || !!user?.permissions?.ai_analyzer?.run}
              page="finance"
              filters={{
                range:
                  dateRangeSelection === "Custom"
                    ? undefined
                    : dateRangeSelection,
                start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
                end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
                transaction_type: filterType !== "all" ? filterType : undefined,
                status: filterStatus !== "all" ? filterStatus : undefined,
              }}
            />
            <Button asChild variant="outline" size="sm" className="h-8 rounded-lg border-slate-200 text-xs">
              <Link href="/dashboard/ai-points">Buy AI points</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="h-8 rounded-lg border-slate-200 text-xs"
            >
              {showAnalytics ? (
                <><Wallet className="mr-1.5 h-3.5 w-3.5" />Balances</>
              ) : (
                <><TrendingUp className="mr-1.5 h-3.5 w-3.5" />Analytics</>
              )}
            </Button>
            <Popover open={balancePopoverOpen} onOpenChange={setBalancePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg border-slate-200 px-2.5 text-xs">
                  <span className="text-slate-400">Period</span>
                  <span className="font-medium text-slate-700">{balanceRangeSelection}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 rounded-xl border-slate-200 p-1.5" align="end">
                <div className="space-y-0.5">
                  {[
                    { label: "Today", value: format(new Date(), "d MMM") },
                    { label: "Last 7 days", value: `${format(subDays(new Date(), 6), "d MMM")} - ${format(new Date(), "d MMM")}` },
                    { label: "This month", value: format(new Date(), "MMM") },
                    { label: "Last month", value: format(subMonths(new Date(), 1), "MMM") },
                    { label: "All time", value: "" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setBalanceRange(item.label)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                        balanceRangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <span>{item.label}</span>
                      <span className="text-xs text-slate-400">{item.value}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setBalanceRange("Custom")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                      isBalanceCustomMode || balanceRangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    Custom range
                  </button>
                  {(isBalanceCustomMode || balanceRangeSelection === "Custom") && (
                    <div className="mt-1 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Start</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 w-full justify-start rounded-lg border-slate-200 bg-white px-2.5 text-xs">
                              {balanceTempStartDate ? format(balanceTempStartDate, "PPP") : "Select start"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto rounded-xl border-slate-200 p-0" align="start">
                            <Calendar mode="single" selected={balanceTempStartDate} onSelect={setBalanceTempStartDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">End</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 w-full justify-start rounded-lg border-slate-200 bg-white px-2.5 text-xs">
                              {balanceTempEndDate ? format(balanceTempEndDate, "PPP") : "Select end"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto rounded-xl border-slate-200 p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={balanceTempEndDate}
                              onSelect={(date) => {
                                setBalanceTempEndDate(date)
                                if (balanceTempStartDate && date) applyBalanceCustomFilter(balanceTempStartDate, date)
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={resetBalanceCustomFilter}>Reset</Button>
                        <Button size="sm" className="h-8 flex-1 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700" onClick={() => applyBalanceCustomFilter()}>Filter</Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {(user?.role === "admin" || user?.permissions?.finance?.withdraw) && (
              <Link href="/dashboard/finance/withdraw">
                <Button size="sm" className="h-8 rounded-lg bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-700">
                  <ArrowUpRight className="mr-1.5 h-3.5 w-3.5" />
                  Withdraw
                </Button>
              </Link>
            )}
          </div>
        </div>

        {showAnalytics ? (
          <div className="flex min-h-[220px] min-w-0 flex-[2] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-2.5 py-2 sm:px-4 sm:py-2.5 min-w-0">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900 truncate">Financial growth</h2>
                <p className="text-[11px] text-slate-500">Income vs withdrawal</p>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg border-slate-200 px-2.5 text-xs">
                    <span className="text-slate-400">Period</span>
                    <span className="font-medium text-slate-700">{analyticsPeriod.toUpperCase()}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-28 rounded-xl border-slate-200 p-1.5" align="end">
                  <div className="space-y-0.5">
                    {["1m", "3m", "6m", "1y", "3y"].map((period) => (
                      <button
                        key={period}
                        onClick={() => setAnalyticsPeriod(period)}
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          analyticsPeriod === period ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        {period.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              {loadingAnalytics ? (
                <LoadingSpinner size={28} />
              ) : analyticsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWithdrawal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dx={-6} tickFormatter={(val) => `₦${val / 1000}k`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <Tooltip
                      formatter={(value: number) => `₦${value.toLocaleString()}`}
                      contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", boxShadow: "none" }}
                    />
                    <Area name="Income" type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                    <Area name="Withdrawal" type="monotone" dataKey="withdrawal" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorWithdrawal)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <TrendingUp className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs">No transaction data for this period</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6 min-w-0">
            {balanceTiles.map((tile) => (
              <div
                key={tile.title}
                className={cn(
                  "rounded-xl border px-2 py-2 sm:px-3 sm:py-2.5 min-w-0 overflow-hidden",
                  tile.emphasize ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50/40",
                )}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{tile.title}</p>
                  <tile.icon className={cn("h-3.5 w-3.5 shrink-0", tile.emphasize ? "text-indigo-500" : "text-slate-400")} />
                </div>
                <p
                  className="text-lg font-semibold tabular-nums leading-none tracking-tight text-slate-900 truncate min-w-0"
                  title={formatNairaFull(tile.value)}
                >
                  {formatNairaCompact(tile.value)}
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400 truncate">
                  {tile.desc}
                  {!tile.emphasize && (
                    <> · {balanceRangeSelection === "All time" ? "All time" : balanceRangeSelection}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex shrink-0 flex-col gap-2 border-b border-slate-100 px-2 py-2 sm:px-3 sm:py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Transactions</h2>
              {(filterType !== "all" || filterStatus !== "all" || searchQuery !== "" || dateRangeSelection !== "All time") && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-[11px] text-slate-400 hover:text-indigo-600">
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <div className="relative min-w-0 w-full flex-1 sm:min-w-[180px] sm:max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search transactions…"
                  className="h-8 rounded-lg border-slate-200 pl-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-slate-200 px-2.5 text-xs">
                    <span className="text-slate-400">Date</span>
                    <span className="font-medium text-slate-700">{dateRangeSelection}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 rounded-xl border-slate-200 p-1.5" align="end">
                  <div className="space-y-0.5">
                    {[
                      { label: "Today", value: format(new Date(), "d MMM") },
                      { label: "Last 7 days", value: `${format(subDays(new Date(), 6), "d MMM")} - ${format(new Date(), "d MMM")}` },
                      { label: "This month", value: format(new Date(), "MMM") },
                      { label: "Last month", value: format(subMonths(new Date(), 1), "MMM") },
                      { label: "All time", value: "" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => setRange(item.label)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                          dateRangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-400">{item.value}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => setRange("Custom")}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors",
                        isCustomMode || dateRangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      Custom range
                    </button>
                    {(isCustomMode || dateRangeSelection === "Custom") && (
                      <div className="mt-1 space-y-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Start</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 w-full justify-start rounded-lg border-slate-200 bg-white px-2.5 text-xs">
                                {tempStartDate ? format(tempStartDate, "PPP") : "Select start"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto rounded-xl border-slate-200 p-0" align="start">
                              <Calendar mode="single" selected={tempStartDate} onSelect={setTempStartDate} initialFocus />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">End</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="h-8 w-full justify-start rounded-lg border-slate-200 bg-white px-2.5 text-xs">
                                {tempEndDate ? format(tempEndDate, "PPP") : "Select end"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto rounded-xl border-slate-200 p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={tempEndDate}
                                onSelect={(date) => {
                                  setTempEndDate(date)
                                  if (tempStartDate && date) applyCustomFilter(tempStartDate, date)
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="h-8 flex-1 rounded-lg text-xs" onClick={resetCustomFilter}>Reset</Button>
                          <Button size="sm" className="h-8 flex-1 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700" onClick={() => applyCustomFilter()}>Filter</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-slate-200 px-2.5 text-xs capitalize">
                    <span className="text-slate-400">Type</span>
                    <span className="font-medium text-slate-700">{filterType}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 rounded-xl border-slate-200 p-1.5" align="end">
                  {["all", "income", "refund", "withdrawal"].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFilterType(type)
                        setTypePopoverOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm capitalize transition-colors",
                        filterType === type ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg border-slate-200 px-2.5 text-xs capitalize">
                    <span className="text-slate-400">Status</span>
                    <span className="font-medium text-slate-700">{filterStatus}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 rounded-xl border-slate-200 p-1.5" align="end">
                  {["all", "completed", "pending", "failed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status)
                        setStatusPopoverOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-center rounded-lg px-3 py-2 text-sm capitalize transition-colors",
                        filterStatus === status ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg border-slate-200 px-2.5 text-xs text-slate-600"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-indigo-600" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                {isExporting ? "Exporting…" : "Export"}
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto">
            {isTableLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                <LoadingSpinner size={28} />
              </div>
            )}
            <Table className={cn(isTableLoading && "opacity-50")}>
              <TableHeader className="sticky top-0 z-[1] bg-slate-50/95 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 w-[100px] sm:w-[160px] text-xs">Date</TableHead>
                  <TableHead className="h-9 text-xs">Details</TableHead>
                  <TableHead className="h-9 text-xs">Type</TableHead>
                  <TableHead className="h-9 text-xs">Status</TableHead>
                  <TableHead className="h-9 text-right text-xs">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((t) => {
                    const promo = getPromoBreakdown(t)
                    return (
                      <TableRow key={t.id} className="border-slate-100">
                        <TableCell className="whitespace-nowrap py-2 sm:py-2.5">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900">{format(new Date(t.date), "MMM d, yyyy")}</span>
                            <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400">
                              <Clock className="h-2.5 w-2.5" />
                              {format(new Date(t.date), "p")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 sm:py-2.5">
                          <div className="space-y-1 min-w-0 max-w-[14rem] sm:max-w-none">
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="text-xs font-medium text-slate-900 truncate">{t.description}</span>
                              {t.bookingCode && (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 hover:border-indigo-200"
                                  onClick={() => handleCopy(t.bookingCode)}
                                  title="Copy reservation code"
                                >
                                  {t.bookingCode}
                                  <Copy className="h-2.5 w-2.5 text-slate-300" />
                                </button>
                              )}
                            </div>
                            {promo && (
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="line-through">
                                  ₦{promo.subtotal.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                </span>
                                <Badge className="border-0 bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 shadow-none">
                                  −₦{promo.discount.toLocaleString("en-NG", { minimumFractionDigits: 2 })} · {promo.code}
                                </Badge>
                                <span>Received ₦{promo.received.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge variant={t.type === "income" ? "outline" : "secondary"} className="rounded-md border-slate-200 px-1.5 py-0 text-[10px] capitalize">
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <Badge
                            className={cn(
                              "rounded-md border-0 px-1.5 py-0 text-[10px] shadow-none",
                              t.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : t.status === "failed"
                                  ? "bg-red-100 text-red-700 hover:bg-red-100"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-100",
                            )}
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 text-right text-xs font-semibold tabular-nums">
                          <span className={t.type === "income" ? "text-emerald-600" : "text-slate-900"}>
                            {t.type === "income" ? "+" : "-"}₦{t.amount.toLocaleString()}
                          </span>
                          {t.type === "withdrawal" && t.net_amount != null && (
                            <div className="mt-0.5 space-y-0.5 text-[10px] font-normal text-slate-500">
                              <div className="text-emerald-700">Received: ₦{t.net_amount.toLocaleString()}</div>
                              {t.total_debit != null && (
                                <div>Debited: ₦{t.total_debit.toLocaleString()}</div>
                              )}
                              <div className="text-rose-500">Fee: ₦{(t.commission_amount ?? 0).toLocaleString()}</div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-40 text-center">
                      <p className="text-sm font-medium text-slate-600">No transactions found</p>
                      <p className="mt-1 text-xs text-slate-400">Try adjusting your filters.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end border-t border-slate-100 px-2 py-2 sm:px-3">
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1} className="h-8 rounded-lg border-slate-200 text-xs">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" /><span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </Button>
            <span className="px-2 text-xs text-slate-500 truncate">Page {currentPage} of {totalPages || 1}</span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="h-8 rounded-lg border-slate-200 text-xs">
              Next<ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
