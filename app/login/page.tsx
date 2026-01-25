"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/lib/auth-context"
import { Hotel, AlertCircle, Info } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login, businessId: storedBusinessId, businessName: storedBusinessName, isFirstTimeSetup } = useAuth()
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
      // Real API call - adjust URL as needed
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/users/sign_in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: {
            email,
            password,
            business_id: businessIdToUse,
          },
        }),
      })

      const data = await response.json()
      console.log("Login API Response:", data)

      if (response.ok && data.status.code === 200) {
        // Extract JWT token from Authorization header
        const authHeader = response.headers.get("Authorization")
        const token = authHeader?.replace("Bearer ", "") || ""

        // Login with real data
        login(
          {
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
            })(),
            hotelId: data.data.business?.id.toString() || "",
            hotelName: data.data.business?.name || "",
            businessId: data.data.business?.business_unique_id || businessIdToUse || "",
            permissions: data.data.business?.permissions,
          },
          data.data.business?.business_unique_id || businessIdToUse || "", // Business ID (for API calls)
          data.data.business?.name || "Your Business", // Business Name (for display)
          token,
        )

        router.push("/dashboard")
      } else {
        setError(data.status?.message || "Invalid credentials or business ID")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError("Unable to connect to server. Please try again.")
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
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-balance">
                {isFirstTimeSetup ? "Welcome to Abri" : "Welcome Back"}
              </h1>
              <p className="text-muted-foreground mt-2">
                {isFirstTimeSetup
                  ? "Set up your device for this business"
                  : `Sign in to ${storedBusinessName || "your account"}`}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Business ID field - only shown on first time setup */}
            {isFirstTimeSetup && (
              <div className="space-y-2">
                <Label htmlFor="businessId">Business ID</Label>
                <Input
                  id="businessId"
                  type="text"
                  placeholder="e.g., GPHF8A2C1"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value.toUpperCase())}
                  required
                  className="h-11 font-mono"
                />
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Enter your business unique ID. This device will be bound to this business. Contact your
                    administrator if you don't have this ID.
                  </span>
                </p>
              </div>
            )}



            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 cursor-pointer" disabled={isLoading}>
              {isLoading ? "Signing in..." : isFirstTimeSetup ? "Set Up & Sign In" : "Sign In"}
            </Button>
          </form>



          {/* Signup link - only shown if no business ID in storage */}
          {isFirstTimeSetup && (
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900 font-medium mb-2">Don't have a business account yet?</p>
              <p className="text-xs text-green-700 mb-3">
                Create your business and administrator account to get started with Abri.
              </p>
              <Link href="/signup">
                <Button type="button" variant="outline" className="w-full border-green-600 text-green-700 hover:bg-green-50 cursor-pointer">
                  Create Business Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Business cover image */}
      <div className="hidden lg:block relative bg-gradient-to-br from-blue-600 to-blue-800">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: "url(/placeholder.svg?height=1080&width=1920&query=luxury hotel lobby)",
          }}
        />
        <div className="relative h-full flex flex-col items-center justify-center p-12 text-white">
          <h2 className="text-4xl font-bold mb-4 text-balance">Professional Hotel Management</h2>
          <p className="text-xl text-blue-100 max-w-md text-center text-balance">
            Streamline your operations with our comprehensive hotel management system
          </p>

          {isFirstTimeSetup && (
            <div className="mt-12 p-6 bg-white/10 backdrop-blur-sm rounded-lg max-w-md">
              <h3 className="font-semibold mb-2">🔐 Device-First Security</h3>
              <p className="text-sm text-blue-100">
                This device will be permanently bound to your business after first login. You won't need to enter
                the business ID again on this machine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
