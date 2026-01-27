"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { EmailVerificationBanner } from "@/components/email-verification-banner"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeTab?: string
}

const adminNavigation = [
  { name: "Dashboard", href: "/dashboard/business", icon: Building2 },
  // { name: "Staff Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { name: "Rooms", href: "/dashboard/rooms", icon: Hotel },
  { name: "Staffs", href: "/dashboard/staff", icon: Users },
  // { name: "Check-in/out", href: "/dashboard/checkin", icon: DoorOpen },
  // { name: "Scan Code", href: "/dashboard/scan", icon: QrCode },
]

export function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const { user, logout, changeBusiness, businessId, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const handleChangeBusiness = () => {
    if (confirm("Are you sure you want to change business? This will log you out and clear this device's business registration.")) {
      changeBusiness()
      router.push("/login")
    }
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  const isAdmin = user.role === "admin" || user.role === "manager"

  const notifications = [
    {
      id: 1,
      title: "New booking received",
      message: "John Doe - Standard Room, Check-in: Dec 22",
      time: "5 min ago",
      unread: true,
      type: "booking",
    },
    {
      id: 2,
      title: "Room disabled for maintenance",
      message: "Room 305 - Deluxe - AC repair scheduled",
      time: "1 hour ago",
      unread: true,
      type: "maintenance",
    },
    {
      id: 3,
      title: "New booking received",
      message: "Sarah Johnson - Suite Room, Check-in: Dec 23",
      time: "2 hours ago",
      unread: false,
      type: "booking",
    },
    {
      id: 4,
      title: "Room disabled for maintenance",
      message: "Room 108 - Standard - Plumbing issue",
      time: "3 hours ago",
      unread: false,
      type: "maintenance",
    },
  ]
  const unreadCount = notifications.filter((n) => n.unread).length

  if (isAdmin) {
    // Admin layout with sidebar
    return (
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-border flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-sm truncate">{user.hotelName}</h1>
              <p className="text-xs text-muted-foreground truncate">{businessId || 'N/A'}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {adminNavigation.filter(item => {
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
                case "Payments":
                  return user.permissions.payments?.view;
                case "Bookings":
                  return user.permissions.bookings?.view;
                case "Rooms":
                  return user.permissions.rooms?.view;
                case "Staffs":
                  return user.permissions.staff?.view;
                default:
                  return true;
              }
            }).map((item) => {
              const isActive = activeTab === item.name.toLowerCase().replace(/[^a-z]/g, "")
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

          {/* User menu */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    {user.profilePicture && (
                      <Image
                        src={user.profilePicture}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
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
        </aside>

        {/* Main content */}
        <div className="pl-64">
          <main className="p-8">{children}</main>
        </div>
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
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Hotel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-base">{user.hotelName}</h1>
              <p className="text-xs text-muted-foreground">{businessId || 'N/A'}</p>
            </div>
          </Link>

          {/* Notification dropdown */}
          <div className="flex items-center gap-3">
            {/* Notification dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {unreadCount} new
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between w-full">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {notification.unread && <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center justify-center text-indigo-600 cursor-pointer">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
