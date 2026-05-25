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
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-border">
        <div className="h-full px-6 flex items-center justify-between gap-4">
          <Link
            href="/dashboard/restaurant"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0"
          >
            <SidebarBrandLogo businessId={businessId} />
            <div>
              <h1 className="font-semibold text-base">{user.hotelName}</h1>
              <p className="text-xs text-muted-foreground">Restaurant</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.tab
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <TopBarNotifications businessId={businessId} />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-3 h-auto py-2 px-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
                <Avatar className="h-9 w-9">
                  {user.profilePicture && !imgError && (
                    <Image
                      src={user.profilePicture}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                      onError={() => setImgError(true)}
                      unoptimized={user.profilePicture.startsWith("data:")}
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

      <div className="pt-16">
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
