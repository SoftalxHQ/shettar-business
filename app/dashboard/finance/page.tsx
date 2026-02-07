"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  ChevronDown,
  Search,
  Copy,
  Clock
} from "lucide-react"
import { getAuthToken } from "@/lib/storage"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { format, subDays, startOfToday, endOfToday, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns"
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
  const { user, businessId } = useAuth()
  const router = useRouter()
  const [balances, setBalances] = useState<BusinessDetails | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

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
  const [analyticsPeriod, setAnalyticsPeriod] = useState("1y")
  const [periodBalances, setPeriodBalances] = useState<{
    pending: number;
    refund: number;
    cash: number;
    pos: number;
    onsite: number;
    withdrawable: number;
  }>({ pending: 0, refund: 0, cash: 0, pos: 0, onsite: 0, withdrawable: 0 })
  const [loadingStats, setLoadingStats] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

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
        setLoading(true)
        const token = getAuthToken()
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Business-Id": businessId
        }

        const businessRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}`, { headers })
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
            method: t.metadata?.payment_method
          }))
          setTransactions(mappedTransactions)
        }
      } catch (error) {
        console.error("Failed to fetch finance data", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [businessId, startDate, endDate, filterType, filterStatus])

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

  const applyBalanceCustomFilter = () => {
    if (balanceTempStartDate && balanceTempEndDate) {
      setBalanceStartDate(balanceTempStartDate)
      setBalanceEndDate(balanceTempEndDate)
      setBalanceRangeSelection("Custom")
    }
  }

  const resetBalanceCustomFilter = () => {
    setBalanceTempStartDate(balanceStartDate)
    setBalanceTempEndDate(balanceEndDate)
    setIsBalanceCustomMode(false)
  }

  const applyCustomFilter = () => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate)
      setEndDate(tempEndDate)
      setDateRangeSelection("Custom")
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

  const handleExport = () => {
    toast.success(`Exporting ${getFilteredTransactions().length} transactions...`)
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

  if (loading) {
    return (
      <DashboardLayout activeTab="finance">
        <div className="flex h-[50vh] items-center justify-center">
          <LoadingSpinner size={40} />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout activeTab="finance">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-outfit">Finance</h1>
            <p className="text-muted-foreground">Manage business balances and transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl"
            >
              {showAnalytics ? (
                <><Wallet className="w-4 h-4 mr-2" />Show Balances</>
              ) : (
                <><TrendingUp className="w-4 h-4 mr-2" />Finance Analytics</>
              )}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl justify-between min-w-[140px]">
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Balance Period</span>
                    <span className="font-semibold text-slate-700 text-sm">{balanceRangeSelection}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
                <div className="space-y-1">
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
                        "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                        balanceRangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                      <span className="text-xs text-slate-400 font-normal">{item.value}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setBalanceRange("Custom")}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                      isBalanceCustomMode || balanceRangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">Custom Range</span>
                  </button>
                  {(isBalanceCustomMode || balanceRangeSelection === "Custom") && (
                    <div className="p-4 mt-2 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 transition-all shadow-inner">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">Start date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                              {balanceTempStartDate ? format(balanceTempStartDate, "PPP") : "Select start date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                            <Calendar
                              mode="single"
                              selected={balanceTempStartDate}
                              onSelect={setBalanceTempStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">End date</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                              {balanceTempEndDate ? format(balanceTempEndDate, "PPP") : "Select end date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                            <Calendar
                              mode="single"
                              selected={balanceTempEndDate}
                              onSelect={setBalanceTempEndDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" className="flex-1 text-xs h-9 rounded-xl" onClick={resetBalanceCustomFilter}>Reset</Button>
                        <Button className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" onClick={applyBalanceCustomFilter}>Filter</Button>
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {(user?.role === 'admin' || user?.permissions?.finance?.withdraw) && (
              <Link href="/dashboard/finance/withdraw">
                <Button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Button>
              </Link>
            )}
          </div>
        </div>

        {showAnalytics ? (
          <Card className="border-0 shadow-sm bg-white rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50/50">
              <div>
                <CardTitle>Financial Growth</CardTitle>
                <p className="text-sm text-muted-foreground">Income vs Withdrawal trends</p>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 px-4 flex items-center gap-4 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl justify-between min-w-[120px]">
                    <div className="flex flex-col items-start text-left">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Period</span>
                      <span className="font-semibold text-slate-700 text-sm">{analyticsPeriod.toUpperCase()}</span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1.5 rounded-xl shadow-sm border-slate-100" align="end">
                  <div className="space-y-1">
                    {["1m", "3m", "6m", "1y", "3y"].map((period) => (
                      <button
                        key={period}
                        onClick={() => setAnalyticsPeriod(period)}
                        className={cn(
                          "w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                          analyticsPeriod === period ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform">{period.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </CardHeader>
            <CardContent className="h-[400px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_ANALYTICS_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorWithdrawal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} tickFormatter={(val) => `₦${val / 1000}k`} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="income" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="withdrawal" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorWithdrawal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="bg-indigo-600 text-white border-0 shadow-sm shadow-indigo-100 rounded-3xl transition-all hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Withdrawable Balance</CardTitle>
                <div className="p-2 bg-white/10 rounded-xl">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₦{Number(balances?.withdrawable_balance || 0).toLocaleString()}</div>
                <p className="text-xs text-indigo-100/70 mt-1">Available for payout</p>
              </CardContent>
            </Card>

            {[
              { title: "Pending Balance", value: balanceTotals.pending, icon: RefreshCcw, color: "orange", desc: "Escrow (Wallet/Card)" },
              { title: "Refund Balance", value: balanceTotals.refund, icon: ArrowDownLeft, color: "red", desc: "Total reversals" },
              { title: "Cash Balance", value: balanceTotals.cash, icon: Banknote, color: "emerald", desc: "Physical cash on-site" },
              { title: "POS / Transfer", value: balanceTotals.pos, icon: CreditCard, color: "blue", desc: "Terminal & Bank transfers" },
              { title: "Total Onsite", value: balanceTotals.onsite, icon: DollarSign, color: "purple", desc: "Cash + POS + Transfer" },
            ].map((card, i) => (
              <Card key={i} className="border-0 shadow-sm rounded-3xl transition-all hover:scale-[1.02] bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                  <div className={`p-2 bg-${card.color}-50 rounded-xl`}>
                    <card.icon className={`h-4 w-4 text-${card.color}-500`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₦{Number(card.value || 0).toLocaleString()}</div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">{card.desc} • {balanceRangeSelection === "All time" ? "All time" : `For ${balanceRangeSelection.toLowerCase()}`}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 font-outfit">Transactions</h2>
              {(filterType !== "all" || filterStatus !== "all" || searchQuery !== "" || dateRangeSelection !== "All time") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-slate-400 hover:text-indigo-600 transition-colors h-8 px-2"
                >
                  Clear all filters
                </Button>
              )}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 min-w-[300px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by description, booking code or amount..."
                  className="pl-10 h-11 border-slate-200 rounded-xl shadow-sm bg-white focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl min-w-[140px] justify-between">
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Date Range</span>
                        <span className="font-semibold text-slate-700 text-sm">{dateRangeSelection}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
                    <div className="space-y-1">
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
                            "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                            dateRangeSelection === item.label ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="group-hover:translate-x-0.5 transition-transform">{item.label}</span>
                          <span className="text-xs text-slate-400 font-normal">{item.value}</span>
                        </button>
                      ))}
                      <button
                        onClick={() => setRange("Custom")}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all group",
                          isCustomMode || dateRangeSelection === "Custom" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        <span className="group-hover:translate-x-0.5 transition-transform">Custom Range</span>
                      </button>
                      {(isCustomMode || dateRangeSelection === "Custom") && (
                        <div className="p-4 mt-2 bg-slate-50 rounded-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-200 transition-all shadow-inner">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">Start date</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                                  {tempStartDate ? format(tempStartDate, "PPP") : "Select start date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                                <Calendar
                                  mode="single"
                                  selected={tempStartDate}
                                  onSelect={setTempStartDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 font-mono">End date</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left h-10 px-3 bg-white border-slate-200 rounded-xl">
                                  {tempEndDate ? format(tempEndDate, "PPP") : "Select end date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl shadow-sm border-slate-100" align="start">
                                <Calendar
                                  mode="single"
                                  selected={tempEndDate}
                                  onSelect={setTempEndDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <Button variant="outline" className="flex-1 text-xs h-9 rounded-xl" onClick={resetCustomFilter}>Reset</Button>
                            <Button className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl" onClick={applyCustomFilter}>Filter</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl min-w-[120px] justify-between">
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Type</span>
                        <span className="font-semibold text-slate-700 text-sm capitalize">{filterType}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
                    <div className="space-y-1">
                      {["all", "income", "refund", "withdrawal"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={cn(
                            "w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize group",
                            filterType === type ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="group-hover:translate-x-0.5 transition-transform">{type}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 px-4 flex items-center gap-6 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl min-w-[120px] justify-between">
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                        <span className="font-semibold text-slate-700 text-sm capitalize">{filterStatus}</span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1.5 rounded-2xl shadow-sm border-slate-100" align="end">
                    <div className="space-y-1">
                      {["all", "completed", "pending", "failed"].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilterStatus(status)}
                          className={cn(
                            "w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all capitalize group",
                            filterStatus === status ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <span className="group-hover:translate-x-0.5 transition-transform">{status}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button variant="outline" className="h-11 px-6 flex items-center gap-2 border-slate-200 shadow-sm bg-white hover:bg-slate-50 transition-all rounded-xl text-slate-600 font-semibold" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-0 shadow-sm bg-white rounded-[32px] overflow-hidden">
            <div className="rounded-[32px] border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-b-slate-100 hover:bg-transparent">
                    <TableHead className="w-[200px] h-12">Date & Time</TableHead>
                    <TableHead>Transaction Details</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((t) => (
                      <TableRow key={t.id} className="border-b-slate-50 hover:bg-slate-50/30 transition-colors">
                        <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-semibold">{format(new Date(t.date), "MMM d, yyyy")}</span>
                            <span className="text-[11px] flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{format(new Date(t.date), "p")}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="font-semibold text-slate-900">{t.description}</div>
                            {t.bookingCode && (
                              <div
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-mono text-slate-500 group cursor-pointer hover:border-indigo-200 hover:bg-white transition-all shadow-sm"
                                onClick={() => handleCopy(t.bookingCode)}
                                title="Click to copy reservation code"
                              >
                                {t.bookingCode}
                                <Copy className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.type === "income" ? "outline" : "secondary"} className="capitalize rounded-lg px-2 py-0.5 border-slate-200">{t.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            cn(
                              "shadow-none border-0 rounded-full px-3 py-0.5",
                              t.status === "completed" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" :
                                t.status === "failed" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                                  "bg-amber-100 text-amber-700 hover:bg-amber-100"
                            )
                          }>
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-base">
                          <span className={t.type === "income" ? "text-emerald-600" : "text-slate-900"}>
                            {t.type === "income" ? "+" : "-"}₦{t.amount.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-64 p-0 text-center">
                        <div className="flex flex-col items-center justify-center w-full h-full gap-4 text-muted-foreground animate-in fade-in duration-500 mx-auto">
                          <div className="p-6 bg-slate-50 rounded-full shadow-inner mx-auto">
                            <RefreshCcw className="w-10 h-10 text-slate-300 animate-spin-slow" />
                          </div>
                          <div className="text-center space-y-1 w-full flex flex-col items-center">
                            <p className="text-lg font-semibold text-slate-600">No transactions found</p>
                            <p className="text-sm text-slate-400">Try adjusting your filters for this period.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-6 px-6 border-t border-slate-50">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1} className="rounded-xl h-10 border-slate-200">
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <div className="px-4 text-sm text-slate-500 font-medium">Page {currentPage} of {totalPages || 1}</div>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className="rounded-xl h-10 border-slate-200">
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
