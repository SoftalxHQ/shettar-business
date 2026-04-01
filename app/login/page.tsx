"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { login as loginAction, selectBusinessId as selectStoredBusinessId, selectBusinessName as selectStoredBusinessName, selectIsFirstTimeSetup } from "@/lib/store/slices/authSlice"
import {
  setAuthToken,
  setUserData,
  setStoredBusinessId,
  setStoredBusinessName,
} from "@/lib/storage"
import { Hotel, AlertCircle, Info } from "lucide-react"
import { api } from "@/lib/api-client"
import Image from "next/image"

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const storedBusinessId = useAppSelector(selectStoredBusinessId)
  const storedBusinessName = useAppSelector(selectStoredBusinessName)
  const isFirstTimeSetup = useAppSelector(selectIsFirstTimeSetup)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [businessId, setBusinessId] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // If this is first time setup, business ID is required
    const businessIdToUse = storedBusinessId || businessId

    if (isFirstTimeSetup && !businessId) {
      setError("Business ID is required for first-time setup")
      setIsLoading(false)
      return
    }

    try {
      const data: any = await api.login(email, password, businessIdToUse)
      console.log("Login API Response:", data)

      const user = {
          id: data.data.id,
          email: data.data.email,
          name: `${data.data.first_name} ${data.data.last_name}`,
          first_name: data.data.first_name,
          last_name: data.data.last_name,
          phone_number: data.data.phone_number,
          address: data.data.address,
          zip_code: data.data.zip_code,
          profilePicture: data.data.avatar_url,
          role: (() => {
            const apiRole = (data.data.business?.role || "staff").toLowerCase()
            const title = (data.data.business?.title || "").toLowerCase()
            if (apiRole === "admin") return "admin"
            if (title.includes("manager")) return "manager"
            return apiRole
          })() as "admin" | "manager" | "staff",
          hotelId: data.data.business?.id.toString() || "",
          hotelName: data.data.business?.name || "",
          businessId: data.data.business?.business_unique_id || businessIdToUse || "",
          permissions: data.data.business?.permissions,
        }
      const resolvedBusinessId = data.data.business?.business_unique_id || businessIdToUse || ""
      const resolvedBusinessName = data.data.business?.name || "Your Business"

      // Dispatch to Redux store
      dispatch(loginAction({ user, token: data.token, businessId: resolvedBusinessId, businessName: resolvedBusinessName }))

      // Keep api-client.ts working (reads directly from localStorage)
      setAuthToken(data.token)
      setUserData(user)
      setStoredBusinessId(resolvedBusinessId)
      setStoredBusinessName(resolvedBusinessName)

      router.push("/dashboard")
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Login form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and branding */}
          <div className="space-y-4">
            <Image 
              src="/shettar-logo.png" 
              alt="Shettar Logo" 
              width={48} 
              height={48} 
              className="mb-4"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                {isFirstTimeSetup ? "Welcome to Shettar! ✨" : "Welcome back! ✨"}
              </h1>
              <p className="text-slate-500 mt-2">
                {isFirstTimeSetup
                  ? "Set up your device for this business"
                  : `Sign in to ${storedBusinessName || "your account"}`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-100 text-rose-600 px-3 py-2 rounded text-sm mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Business ID field - only shown on first time setup */}
            {isFirstTimeSetup && (
              <div className="space-y-2">
                <Label htmlFor="businessId" className="block text-sm font-medium mb-1 text-slate-800">Business ID</Label>
                <input
                  id="businessId"
                  className="form-input w-full font-mono uppercase shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x"
                  type="text"
                  placeholder="e.g., GPHF8A2C1"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value.toUpperCase())}
                  required
                />
                <div className="text-xs text-slate-500 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Enter your business unique ID. This device will be bound to this business. Contact your
                    administrator if you don't have this ID.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-800">Email Address</Label>
              <input
                id="email"
                className="form-input w-full shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x"
                type="email"
                placeholder="your.email@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="block text-sm font-medium mb-1 text-slate-800">Password</Label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                className="form-input w-full shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full btn bg-indigo-500 hover:bg-indigo-600 text-white shadow-none rounded-md" disabled={isLoading}>
              {isLoading ? "Signing in..." : isFirstTimeSetup ? "Set Up & Sign In" : "Sign In"}
            </Button>
          </form>

          {/* Additional Links/Footer Info */}
          <div className="pt-4 mt-6 border-t border-slate-100 space-y-4">
            {isFirstTimeSetup && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-sm text-emerald-800 font-medium mb-1">Don't have a business account?</p>
                <p className="text-xs text-emerald-600 mb-3">
                  Create your business and administrator account to get started with Shettar.
                </p>
                <Link href="/signup">
                  <Button type="button" variant="outline" className="w-full text-xs h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 bg-white">
                    Create Business Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Business cover image */}
      <div className="hidden lg:block relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/80 to-violet-900/90" />

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-center p-16 text-white text-center">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl animate-in zoom-in duration-700">
            <Image 
              src="/shettar-logo.png" 
              alt="Shettar Logo" 
              width={64} 
              height={64} 
              className="brightness-0 invert"
            />
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight text-balance">
            Professional Hotel <br />
            <span className="text-indigo-200">Management System</span>
          </h2>

          <p className="text-lg xl:text-xl text-indigo-100/90 max-w-md mb-12 leading-relaxed text-balance">
            Elevate your guest experience and streamline operations with Shettar's intelligent hospitality cloud.
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white mb-0.5">Real-time</div>
              <div className="text-xs text-indigo-200 uppercase tracking-widest font-semibold">Analytics</div>
            </div>
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="text-2xl font-bold text-white mb-0.5">Automated</div>
              <div className="text-xs text-indigo-200 uppercase tracking-widest font-semibold">Bookings</div>
            </div>
          </div>

          {isFirstTimeSetup && (
            <div className="mt-12 p-6 bg-indigo-500/20 backdrop-blur-md rounded-2xl max-w-md border border-white/10 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h3 className="font-semibold mb-2 flex items-center justify-center gap-2 text-indigo-100">
                <span className="p-1 bg-indigo-400/30 rounded">🔐</span> Device-First Security
              </h3>
              <p className="text-sm text-indigo-50/80 leading-relaxed">
                This device will be securely bound to your business after your first login. You won't need to enter
                your business ID on this machine again.
              </p>
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div className="absolute bottom-8 left-0 right-0 text-center opacity-40">
          <p className="text-xs tracking-widest uppercase font-medium">Powered by Shettar Intelligence</p>
        </div>
      </div>
    </div>
  )
}
