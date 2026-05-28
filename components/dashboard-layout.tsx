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
  DoorOpen,
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
  Activity,
  MessageSquare,
  HelpCircle,
  Tag,
  Megaphone,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { setupNativeWindow } from "@/lib/tauri"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { SidebarBrandLogo } from "@/components/sidebar-brand-logo"
import { canAccessBusinessSettings, canViewGuestPolicies } from "@/lib/guest-policies-access"
import { TopBarNotifications } from "@/components/top-bar-notifications"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard/business", icon: Building2 },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Finance", href: "/dashboard/finance", icon: CreditCard },
  { name: "Ads", href: "/dashboard/ads", icon: Megaphone },
  { name: "Promos", href: "/dashboard/promos", icon: Tag },
  { name: "Restaurant Menu", href: "/dashboard/restaurant/menu", icon: UtensilsCrossed, restaurantNav: "menu" as const },
  { name: "Restaurant Orders", href: "/dashboard/restaurant/orders", icon: ClipboardList, restaurantNav: "orders" as const },
  { name: "Restaurant Kitchen", href: "/dashboard/restaurant/kitchen", icon: ChefHat, restaurantNav: "kitchen" as const },
  { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { name: "Rooms", href: "/dashboard/rooms", icon: Hotel },
  { name: "Staffs", href: "/dashboard/staff", icon: Users },
  { name: "Reviews", href: "/dashboard/reviews", icon: MessageSquare },
  { name: "Activity", href: "/dashboard/activity", icon: Activity },
  { name: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { name: "Support", href: "/dashboard/support", icon: HelpCircle },
  { name: "Settings", href: "/dashboard/business/settings", icon: Settings },
  { name: "Bank Details", href: "/dashboard/business/settings/bank", icon: Landmark },
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

  useEffect(() => {
    setMounted(true)
    setupNativeWindow()
  }, [])

  useEffect(() => {
    if (!isLoading && !user && mounted) {
      router.push("/login")
    }
  }, [user, isLoading, router, mounted])

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  if (isAdmin) {
    // Admin layout with sidebar
    return (
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-3">
              <SidebarBrandLogo businessId={businessId} />
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">{user.hotelName}</h1>
              <p className="text-xs text-muted-foreground truncate">{businessId || "N/A"}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {adminNavigation.filter(item => {
              const restaurantNav = (item as { restaurantNav?: string }).restaurantNav
              if (restaurantNav) {
                if (!user.restaurantEnabled) return false
                if (user.role === "admin") return true
                if (!user.permissions?.restaurant?.view) return false
                if (restaurantNav === "menu") {
                  return user.permissions.restaurant?.manage_menu || user.permissions.restaurant?.view
                }
                if (restaurantNav === "orders") {
                  return user.permissions.restaurant?.create_orders || user.permissions.restaurant?.view
                }
                if (restaurantNav === "kitchen") {
                  return user.permissions.restaurant?.kitchen
                }
                return false
              }

              if (user.role === 'admin') return true;

              // If no permissions object but role is manager/staff, default to safe subset or hidden?
              // Assuming if permissions are present we strictly follow them.
              if (!user.permissions) return true;

              switch (item.name) {
                case "Dashboard":
                  // Keep access to dashboard main page if they can view revenue or analytics, or generic
                  return true;
                case "Analytics":
                  return user.permissions.dashboard?.view_analytics;
                case "Finance":
                  return user.permissions.finance?.view;
                case "Ads":
                  return user.permissions.ads?.view || user.permissions.ads?.manage;
                case "Bookings":
                  return user.permissions.bookings?.view;
                case "Rooms":
                  return user.permissions.rooms?.view;
                case "Staffs":
                  return user.permissions.staff?.view;
                case "Promos":
                  return user.permissions.promos?.view;
                case "Settings":
                  return (
                    user.role === "admin" ||
                    !!user.permissions?.settings?.view ||
                    canViewGuestPolicies(user)
                  );
                case "Bank Details":
                  return user.role === "admin" || !!user.permissions?.settings?.view;
                default:
                  return true;
              }
            }).map((item) => {
              const restaurantNav = (item as { restaurantNav?: string }).restaurantNav
              let isActive = restaurantNav
                ? activeTab === restaurantNav
                : activeTab === item.name.toLowerCase().replace(/[^a-z]/g, "")

              // Special case for Dashboard (matches "dashboard" or "business")
              if (item.name === "Dashboard" && (activeTab === "business" || activeTab === "dashboard")) {
                isActive = true
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="px-4 py-2 border-t border-border flex justify-end">
            <TopBarNotifications businessId={businessId} />
          </div>

          {/* User menu */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    {user.profilePicture && !imgError && (
                      <Image
                        src={user.profilePicture}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                        onError={() => setImgError(true)}
                        unoptimized={user.profilePicture.startsWith('data:')}
                      />
                    )}
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize truncate">{user.role}</p>
                  </div>
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

          {verificationStatus && (
            <div className="px-4 pb-4 pt-0">
              <BusinessVerificationBadge
                status={verificationStatus}
                className="w-full justify-center py-1.5 text-[11px]"
              />
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="pl-64">
          <main className="p-8">
            <BusinessVerificationBanner onStatusChange={setVerificationStatus} />
            {children}
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

  // Staff layout with top navigation
  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-border">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo and hotel name */}
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <SidebarBrandLogo businessId={businessId} />
            <div>
              <h1 className="font-semibold text-base">{user.hotelName}</h1>
              <p className="text-xs text-muted-foreground">{businessId || 'N/A'}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <TopBarNotifications businessId={businessId} />

            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-3 h-auto py-2 px-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                  <Avatar className="h-9 w-9">
                    {user.profilePicture && (
                      <Image
                        src={user.profilePicture}
                        alt={user.name}
                        width={36}
                        height={36}
                        className="rounded-full object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
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

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Main content */}
      <div className="pt-16">
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
