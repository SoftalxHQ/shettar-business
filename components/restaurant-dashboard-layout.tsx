"use client";

import type React from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  logout,
  selectUser,
  selectBusinessId,
  selectIsLoading,
} from "@/lib/store/slices/authSlice";
import { logout as storageLogout } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SidebarBrandLogo } from "@/components/sidebar-brand-logo";
import { getRestaurantNavItems } from "@/lib/portal-access";
import { TopBarNotifications } from "@/components/top-bar-notifications";

interface RestaurantDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function RestaurantDashboardLayout({
  children,
  activeTab = "restaurant",
}: RestaurantDashboardLayoutProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const businessId = useAppSelector(selectBusinessId);
  const isLoading = useAppSelector(selectIsLoading);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      dispatch(logout());
      storageLogout();
      toast.success("Signed out");
      router.push("/login");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const navItems = getRestaurantNavItems(user);

  return (
    <div className="h-dvh overflow-hidden flex flex-col bg-[#f4f5f7]">
      <header className="shrink-0 z-50 h-14 bg-white/90 backdrop-blur border-b border-slate-200/80">
        <div className="h-full px-4 md:px-5 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/restaurant"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <SidebarBrandLogo businessId={businessId} />
            <div className="min-w-0">
              <h1 className="font-semibold text-[13px] leading-tight text-slate-900 truncate max-w-[12rem] sm:max-w-[16rem]">
                {user.hotelName}
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wide">Restaurant</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors",
                  activeTab === item.tab
                    ? "bg-indigo-50 text-indigo-700 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.12)]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 shrink-0">
            <TopBarNotifications businessId={businessId} />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2.5 h-auto py-1.5 px-2 rounded-xl hover:bg-slate-50 shrink-0">
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
              <DropdownMenuItem asChild>
                <Link href="/dashboard/notifications" className="cursor-pointer">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>All notifications</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="md:hidden px-2 py-1">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="cursor-pointer w-full">
                      {item.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 gap-2">
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
