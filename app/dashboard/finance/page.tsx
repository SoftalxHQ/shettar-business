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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
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
  ChevronRight
} from "lucide-react"
import { getAuthToken } from "@/lib/storage"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import Link from "next/link"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts"

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
  const [balanceFilter, setBalanceFilter] = useState<string>("monthly")
  const [dateRange, setDateRange] = useState<"day" | "week" | "month" | "custom">("month")
  const [customDateValue, setCustomDateValue] = useState<Date | undefined>(new Date())
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [analyticsPeriod, setAnalyticsPeriod] = useState("1y")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    // Only redirect if explicitly denied. If permission key doesn't exist yet (migration), allow or wait.
    if (user && user.role !== 'admin' && user.permissions) {
      // Check for 'finance' permission, fall back to 'payments' if finance doesn't exist
      const hasFinance = user.permissions.finance?.view;
      const hasPayments = user.permissions.payments?.view;

      if (!hasFinance && !hasPayments) {
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
        }

        // 1. Fetch Business Details for Balances
        const businessRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}`, {
          headers
        })

        if (businessRes.ok) {
          const businessData = await businessRes.json()
          setBalances(businessData)
        }

        // 2. Fetch Reservations to mock "Income" transactions
        const reservationsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/user_businesses/${businessId}/reservations`, {
          headers
        })

        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json()

          // Map reservations to transactions
          const mappedTransactions: Transaction[] = reservationsData.map((res: any) => ({
            id: res.id.toString(),
            date: res.created_at, // Using creation date as transaction date for now
            description: `Booking #${res.booking_id} - ${res.other_first_name} ${res.other_last_name}`,
            type: "income",
            amount: parseFloat(res.total_amount || "0"),
            status: res.cancelled ? "failed" : "completed", // Simplified status logic
            method: res.payment_method
          }))

          // Sort by date desc
          mappedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

          setTransactions(mappedTransactions)
        }

      } catch (error) {
        console.error("Failed to fetch finance data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [businessId])


  const getFilteredTransactions = () => {
    let filtered = [...transactions]

    // 1. Filter by Type
    if (filterType !== "all") {
      filtered = filtered.filter(t => t.type === filterType)
    }

    // 2. Filter by Date
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    filtered = filtered.filter(t => {
      const tDate = new Date(t.date)
      if (dateRange === "day") {
        return tDate >= today
      } else if (dateRange === "week") {
        const lastWeek = new Date(today)
        lastWeek.setDate(lastWeek.getDate() - 7)
        return tDate >= lastWeek
      } else if (dateRange === "month") {
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        return tDate >= lastMonth
      } else if (dateRange === "custom" && customDateValue) {
        // Match selected date (ignoring time)
        return tDate.toDateString() === customDateValue.toDateString()
      }
      return true
    })

    return filtered
  }

  const handleExport = () => {
    // Mock export functionality
    toast.success(`Exporting ${getFilteredTransactions().length} transactions...`)
  }

  // Pagination Logic
  const filteredTransactions = getFilteredTransactions()
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
            <p className="text-muted-foreground">Manage business balances and transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              {showAnalytics ? (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Show Balances
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Finance Analytics
                </>
              )}
            </Button>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {["today", "week", "monthly", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setBalanceFilter(period)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${balanceFilter === period
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
            {(user?.role === 'admin' || user?.permissions?.finance?.withdraw) && (
              <Link href="/dashboard/finance/withdraw">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  Withdraw Funds
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Analytics or Balance Cards */}
        {showAnalytics ? (
          <Card className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Growth</CardTitle>
                <p className="text-sm text-muted-foreground">Income vs Withdrawal trends over time</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {["1m", "3m", "6m", "1y", "3y"].map((period) => (
                  <button
                    key={period}
                    onClick={() => setAnalyticsPeriod(period)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${analyticsPeriod === period
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={MOCK_ANALYTICS_DATA}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
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
                  <XAxis dataKey="name" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="income" stroke="#4f46e5" fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="withdrawal" stroke="#f97316" fillOpacity={1} fill="url(#colorWithdrawal)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Main Withdrawable Balance */}
            <Card className="bg-indigo-600 text-white border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-indigo-100">Withdrawable Balance</CardTitle>
                <Wallet className="h-4 w-4 text-indigo-100" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₦{Number(balances?.withdrawable_balance || 0).toLocaleString()}</div>
                <p className="text-xs text-indigo-100/70 mt-1">Available for payout</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
                <RefreshCcw className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{Number(balances?.pending_balance || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Refund Balance</CardTitle>
                <ArrowDownLeft className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{Number(balances?.refund_balance || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cash Balance</CardTitle>
                <Banknote className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{Number(balances?.cash_balance || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">POS Balance</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{Number(balances?.pos_balance || 0).toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Onsite Payment</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₦{Number(balances?.onsite_payment_balance || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Transactions</h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Time Range Filter */}
              <div className="flex items-center bg-secondary/50 rounded-lg p-1">
                <Button
                  variant={dateRange === "day" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("day")}
                  className="text-xs h-8"
                >
                  Today
                </Button>
                <Button
                  variant={dateRange === "week" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("week")}
                  className="text-xs h-8"
                >
                  Week
                </Button>
                <Button
                  variant={dateRange === "month" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDateRange("month")}
                  className="text-xs h-8"
                >
                  Month
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={dateRange === "custom" ? "secondary" : "ghost"}
                      size="sm"
                      className="text-xs h-8 gap-2"
                      onClick={() => setDateRange("custom")}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {dateRange === "custom" && customDateValue ? format(customDateValue, "PP") : "Custom"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customDateValue}
                      onSelect={(date) => {
                        setCustomDateValue(date)
                        setDateRange("custom")
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Button */}
              <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>

          <Card>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {format(new Date(t.date), "PPP")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{t.description}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.type === "income" ? "outline" : "secondary"} className="capitalize">
                            {t.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              t.status === "completed" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                                t.status === "failed" ? "bg-red-100 text-red-700 hover:bg-red-100" :
                                  "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                            }
                          >
                            {t.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={t.type === "income" ? "text-green-600" : "text-slate-900"}>
                            {t.type === "income" ? "+" : "-"}₦{t.amount.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        No transactions found for the selected period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4 px-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
