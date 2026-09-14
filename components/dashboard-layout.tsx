"use client"

import type React from "react"

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { logout, changeBusiness as changeBusinessAction, selectUser, selectBusinessId, selectIsLoading } from "@/lib/store/slices/authSlice"
import { logout as storageLogout, changeBusiness as storageChangeBusiness } from "@/lib/storage"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import { BusinessVerificationBanner } from "@/components/business-verification-banner"
import { BusinessVerificationBadge } from "@/components/business-verification-badge"
import type { VerificationDisplayStatus } from "@/lib/business-verification"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { api } from "@/lib/api-client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  Users,
  BarChart3,
  Hotel,
  LogOut,
  User,
  Building2,
  QrCode,
  Bell,
  Settings,
  Landmark,
  Printer,
  Activity,
  MessageSquare,
  HelpCircle,
  Tag,
  Megaphone,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { setupNativeWindow } from "@/lib/tauri"
import { armNotificationAudioUnlock } from "@/lib/notification-sound"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SidebarBrandLogo } from "@/components/sidebar-brand-logo"
import { canAccessBusinessSettings, canViewGuestPolicies } from "@/lib/guest-policies-access"
import { TopBarNotifications } from "@/components/top-bar-notifications"
import { SupportUnreadBadge } from "@/components/support-unread-badge"
import { AiPointsSidebarChip } from "@/components/ai-points-sidebar-chip"

const SIDEBAR_COLLAPSED_KEY = "shettar_biz_sidebar_collapsed"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

type AdminNavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  section: "overview" | "operations" | "commerce" | "people" | "system"
  restaurantNav?: "menu" | "orders" | "kitchen"
}

const adminNavigation: AdminNavItem[] = [
  { name: "Dashboard", href: "/dashboard/business", icon: Building2, section: "overview" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, section: "overview" },
  { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck, section: "operations" },
  { name: "Rooms", href: "/dashboard/rooms", icon: Hotel, section: "operations" },
  { name: "Restaurant Menu", href: "/dashboard/restaurant/menu", icon: UtensilsCrossed, section: "operations", restaurantNav: "menu" },
  { name: "Restaurant Orders", href: "/dashboard/restaurant/orders", icon: ClipboardList, section: "operations", restaurantNav: "orders" },
  { name: "Restaurant Kitchen", href: "/dashboard/restaurant/kitchen", icon: ChefHat, section: "operations", restaurantNav: "kitchen" },
  { name: "Finance", href: "/dashboard/finance", icon: CreditCard, section: "commerce" },
  { name: "Ads", href: "/dashboard/ads", icon: Megaphone, section: "commerce" },
  { name: "Promos", href: "/dashboard/promos", icon: Tag, section: "commerce" },
  { name: "Staffs", href: "/dashboard/staff", icon: Users, section: "people" },
  { name: "Reviews", href: "/dashboard/reviews", icon: MessageSquare, section: "people" },
  { name: "Activity", href: "/dashboard/activity", icon: Activity, section: "system" },
  { name: "AI History", href: "/dashboard/ai-history", icon: Sparkles, section: "system" },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell, section: "system" },
  { name: "Support", href: "/dashboard/support", icon: HelpCircle, section: "system" },
  { name: "Settings", href: "/dashboard/business/settings", icon: Settings, section: "system" },
  { name: "Bank Details", href: "/dashboard/business/settings/bank", icon: Landmark, section: "system" },
  { name: "Printer", href: "/dashboard/business/settings/printer", icon: Printer, section: "system" },
]

const adminSectionLabels: Record<AdminNavItem["section"], string> = {
  overview: "Overview",
  operations: "Operations",
  commerce: "Commerce",
  people: "People",
  system: "System",
}

const staffNavigation = [
  { name: "Front desk", href: "/dashboard", tab: "staffdashboard", icon: LayoutDashboard },
  { name: "Bookings", href: "/dashboard/bookings", tab: "bookings", icon: CalendarCheck },
  { name: "Scan", href: "/dashboard/scan", tab: "scancode", icon: QrCode },
]

export function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const businessId = useAppSelector(selectBusinessId)
  const isLoading = useAppSelector(selectIsLoading)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [showChangeBusinessDialog, setShowChangeBusinessDialog] = useState(false)
  const [isChangingBusiness, setIsChangingBusiness] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<VerificationDisplayStatus | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  /** null until client media query runs — avoids mounting TopBarNotifications in both sidebars + header. */
  const [isMdUp, setIsMdUp] = useState<boolean | null>(null)

  useEffect(() => {
    setMounted(true)
    setupNativeWindow()
    armNotificationAudioUnlock()

    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (stored === "1" || stored === "0") {
        setCollapsed(stored === "1")
      } else {
        setCollapsed(window.matchMedia("(max-width: 1023px)").matches)
      }
    } catch {
      setCollapsed(window.matchMedia("(max-width: 1023px)").matches)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const sync = () => setIsMdUp(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileOpen])

  useEffect(() => {
    if (!isLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isLoading, router, mounted])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        // ignore storage failures
      }
      return next
    })
  }

  if (!user || isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-50 app-safe-shell">
        <LoadingSpinner size={40} />
      </div>
    )
  }

  const handleLogout = async () => {
    let backendMessage = "Signed out successfully"
    try {
      const res = await api.logout()
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.message) backendMessage = data.message
        if (data?.status?.message) backendMessage = data.status.message
      }
    } catch (e) {
      console.error("Logout API call failed:", e)
    }
    dispatch(logout())
    storageLogout()
    toast.success(backendMessage, {
      description: "You've been logged out from your account",
    })
    router.push("/login")
  }

  const handleChangeBusiness = () => {
    setShowChangeBusinessDialog(true)
  }

  const executeChangeBusiness = async () => {
    setIsChangingBusiness(true)
    let backendMessage = "Business cleared"
    try {
      const res = await api.logout()
      if (res && res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data?.message) backendMessage = data.message
        if (data?.status?.message) backendMessage = data.status.message
      }
    } catch (e) {
      console.error("Logout API call failed during change business:", e)
    }
    try {
      dispatch(changeBusinessAction())
      storageChangeBusiness()
      toast.info(backendMessage, {
        description: "You can now sign in to a different business",
      })
      router.push("/login")
    } finally {
      setIsChangingBusiness(false)
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const isAdmin = user.role === "admin" || user.role === "manager"

  const visibleAdminNav = adminNavigation.filter((item) => {
    if (item.restaurantNav) {
      if (!user.restaurantEnabled) return false
      if (user.role === "admin") return true
      if (!user.permissions?.restaurant?.view) return false
      if (item.restaurantNav === "menu") {
        return user.permissions.restaurant?.manage_menu || user.permissions.restaurant?.view
      }
      if (item.restaurantNav === "orders") {
        return user.permissions.restaurant?.create_orders || user.permissions.restaurant?.view
      }
      if (item.restaurantNav === "kitchen") {
        return user.permissions.restaurant?.kitchen
      }
      return false
    }

    if (user.role === "admin") return true
    if (!user.permissions) return true

    switch (item.name) {
      case "Dashboard":
        return true
      case "Analytics":
        return user.permissions.dashboard?.view_analytics
      case "Finance":
        return user.permissions.finance?.view
      case "Ads":
        return user.permissions.ads?.view || user.permissions.ads?.manage
      case "Bookings":
        return user.permissions.bookings?.view
      case "Rooms":
        return user.permissions.rooms?.view
      case "Staffs":
        return user.permissions.staff?.view
      case "Promos":
        return user.permissions.promos?.view
      case "Settings":
        return !!user.permissions?.settings?.view || canViewGuestPolicies(user)
      case "Bank Details":
        return !!user.permissions?.settings?.view
      case "Printer":
        return !!user.permissions?.settings?.view
      case "AI History":
        return !!user.permissions?.ai_analyzer?.view || !!user.permissions?.ai_analyzer?.run
      default:
        return true
    }
  })

  const adminSections = (Object.keys(adminSectionLabels) as AdminNavItem["section"][]).filter((section) =>
    visibleAdminNav.some((item) => item.section === section),
  )

  if (isAdmin) {
    const renderAccountMenu = (menuCollapsed: boolean) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "h-auto rounded-xl hover:bg-slate-50",
              menuCollapsed ? "w-full justify-center px-0 py-2" : "w-full justify-start gap-2.5 px-2 py-2",
            )}
            title={menuCollapsed ? user.name : undefined}
          >
            <Avatar className="h-8 w-8">
              {user.profilePicture && !imgError && (
                <Image
                  src={user.profilePicture}
                  alt={user.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  onError={() => setImgError(true)}
                  unoptimized={user.profilePicture.startsWith("data:")}
                />
              )}
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {!menuCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] text-slate-400 capitalize truncate">{user.role}</p>
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleChangeBusiness} className="text-orange-600">
            <Building2 className="mr-2 h-4 w-4" />
            <span>Change Business</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

    const renderNav = (opts: { collapsed: boolean; onNavigate?: () => void }) => (
      <nav
        className={cn(
          "flex-1 min-h-0 overflow-y-auto py-3 space-y-4",
          opts.collapsed ? "px-1.5" : "px-2.5",
        )}
      >
        {adminSections.map((section) => (
          <div key={section}>
            {!opts.collapsed && (
              <p className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {adminSectionLabels[section]}
              </p>
            )}
            <div className="space-y-0.5">
              {visibleAdminNav
                .filter((item) => item.section === section)
                .map((item) => {
                  let isActive = item.restaurantNav
                    ? activeTab === item.restaurantNav
                    : activeTab === item.name.toLowerCase().replace(/[^a-z]/g, "")

                  if (item.name === "Dashboard" && (activeTab === "business" || activeTab === "dashboard")) {
                    isActive = true
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={opts.collapsed ? item.name : undefined}
                      onClick={opts.onNavigate}
                      className={cn(
                        "flex items-center rounded-lg text-[13px] font-medium transition-colors",
                        opts.collapsed ? "justify-center px-0 py-2" : "gap-2.5 px-2.5 py-1.5",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-600" : "text-slate-400")} />
                      {!opts.collapsed && <span className="truncate flex-1">{item.name}</span>}
                      {!opts.collapsed && item.name === "Support" && <SupportUnreadBadge />}
                    </Link>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>
    )

    const sidebarBody = (opts: {
      collapsed: boolean
      showDesktopToggle?: boolean
      onNavigate?: () => void
      showAiPoints?: boolean
      showNotifications?: boolean
    }) => (
      <>
        <div
          className={cn(
            "shrink-0 flex border-b border-slate-100",
            opts.collapsed
              ? "h-auto min-h-14 flex-col items-center justify-center gap-1 px-1 py-2"
              : "h-14 items-center gap-1 px-3",
          )}
        >
          <Link
            href="/dashboard/business"
            onClick={opts.onNavigate}
            className={cn(
              "flex items-center min-w-0 hover:opacity-80 transition-opacity",
              opts.collapsed ? "justify-center" : "flex-1 gap-2.5",
            )}
            title={opts.collapsed ? user.hotelName : undefined}
          >
            <SidebarBrandLogo businessId={businessId} />
            {!opts.collapsed && (
              <div className="min-w-0">
                <h1 className="font-semibold text-[13px] leading-tight text-slate-900 truncate">{user.hotelName}</h1>
                <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                  <p className="text-[10px] text-slate-400 font-mono truncate tracking-wide">{businessId || "N/A"}</p>
                  {verificationStatus && (
                    <BusinessVerificationBadge status={verificationStatus} compact className="shrink-0" />
                  )}
                </div>
              </div>
            )}
          </Link>
          {opts.showDesktopToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700"
              onClick={toggleCollapsed}
              title={opts.collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {opts.collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
          {!opts.showDesktopToggle && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-700 ml-auto"
              onClick={() => setMobileOpen(false)}
              title="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {renderNav({ collapsed: opts.collapsed, onNavigate: opts.onNavigate })}

        <div className={cn("shrink-0 border-t border-slate-100 space-y-2", opts.collapsed ? "p-1.5" : "p-2.5")}>
          {opts.showAiPoints && <AiPointsSidebarChip collapsed={opts.collapsed} />}
          {opts.showNotifications && (
            <div className={cn("flex items-center", opts.collapsed ? "justify-center" : "justify-end px-1")}>
              <TopBarNotifications businessId={businessId} />
            </div>
          )}
          {renderAccountMenu(opts.collapsed)}
        </div>
      </>
    )

    return (
      <div className="h-dvh overflow-hidden flex flex-col md:flex-row bg-[#f4f5f7] app-safe-shell">
        {/* Phone top bar */}
        <header className="md:hidden shrink-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-slate-200/80">
          <div className="h-full px-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Link href="/dashboard/business" className="flex items-center gap-2 min-w-0 hover:opacity-80">
                <SidebarBrandLogo businessId={businessId} />
                <div className="min-w-0">
                  <h1 className="font-semibold text-[13px] leading-tight text-slate-900 truncate max-w-[10rem]">
                    {user.hotelName}
                  </h1>
                  <p className="text-[10px] text-slate-400 font-mono truncate tracking-wide">{businessId || "N/A"}</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isMdUp === false && <TopBarNotifications businessId={businessId} />}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <Avatar className="h-8 w-8">
                      {user.profilePicture && !imgError && (
                        <Image
                          src={user.profilePicture}
                          alt={user.name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                          onError={() => setImgError(true)}
                          unoptimized={user.profilePicture.startsWith("data:")}
                        />
                      )}
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleChangeBusiness} className="text-orange-600">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>Change Business</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile overlay drawer */}
        {mobileOpen && (
          <button
            type="button"
            className="md:hidden fixed inset-0 z-40 bg-black/40"
            aria-label="Close navigation backdrop"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[15.5rem] h-full border-r border-slate-200/80 bg-white flex flex-col transition-transform duration-200 ease-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
          )}
          aria-hidden={!mobileOpen}
        >
          {sidebarBody({
            collapsed: false,
            onNavigate: () => setMobileOpen(false),
            // Notifications live in the mobile header; AI chip only mounts on the active viewport.
            showAiPoints: isMdUp === false,
            showNotifications: false,
          })}
        </aside>

        {/* Desktop / tablet sidebar */}
        <aside
          className={cn(
            "hidden md:flex shrink-0 h-full border-r border-slate-200/80 bg-white flex-col transition-[width] duration-200 ease-out",
            collapsed ? "w-16" : "w-[15.5rem]",
          )}
        >
          {sidebarBody({
            collapsed,
            showDesktopToggle: true,
            showAiPoints: isMdUp === true,
            showNotifications: isMdUp === true,
          })}
        </aside>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col">
          <main className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col gap-2">
            <div className="shrink-0 space-y-2">
              <BusinessVerificationBanner onStatusChange={setVerificationStatus} />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="flex h-full min-h-0 flex-col overflow-hidden p-3 sm:p-4 md:p-5">{children}</div>
            </div>
          </main>
        </div>

        <ConfirmDialog
          open={showChangeBusinessDialog}
          onOpenChange={setShowChangeBusinessDialog}
          title="Change Business"
          description="Are you sure you want to change business? This will log you out and clear this device's business registration."
          confirmText="Change Business"
          onConfirm={executeChangeBusiness}
          loading={isChangingBusiness}
        />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#f4f5f7] app-safe-shell">
      <header className="shrink-0 z-50 h-14 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="h-full px-4 md:px-5 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0">
            <SidebarBrandLogo businessId={businessId} />
            <div className="min-w-0">
              <h1 className="font-semibold text-[13px] leading-tight text-slate-900 truncate max-w-[12rem] sm:max-w-[16rem]">
                {user.hotelName}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                <p className="text-[10px] text-slate-400 font-mono tracking-wide truncate">{businessId || "N/A"}</p>
                {verificationStatus && (
                  <BusinessVerificationBadge status={verificationStatus} compact className="shrink-0" />
                )}
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {staffNavigation.map((item) => {
              const isActive = activeTab === item.tab
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <TopBarNotifications businessId={businessId} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2.5 h-auto py-1.5 px-2 rounded-xl hover:bg-slate-50">
                  <div className="text-right hidden sm:block">
                    <p className="text-[13px] font-medium text-slate-900 leading-tight">{user.name}</p>
                    <p className="text-[11px] text-slate-400 capitalize leading-tight">{user.role}</p>
                  </div>
                  <Avatar className="h-8 w-8">
                    {user.profilePicture && !imgError && (
                      <Image
                        src={user.profilePicture}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        onError={() => setImgError(true)}
                        unoptimized={user.profilePicture.startsWith("data:")}
                      />
                    )}
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                {canAccessBusinessSettings(user) && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/business/settings" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Business Settings</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {(user.role === "admin" || user.permissions?.ai_analyzer?.view || user.permissions?.ai_analyzer?.run) && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/ai-history" className="cursor-pointer">
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>AI History</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <div className="md:hidden px-1 py-1">
                  <DropdownMenuSeparator />
                  {staffNavigation.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href} className="cursor-pointer w-full">
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <EmailVerificationBanner />

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2">
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
