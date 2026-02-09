"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Hotel, AlertCircle, CheckCircle2, Building2, User, ArrowRight, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              step === currentStep
                ? "bg-blue-600 text-white"
                : step < currentStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500",
            )}
          >
            {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
          {step < totalSteps && (
            <div className={cn("w-12 h-0.5", step < currentStep ? "bg-green-500" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Business data (Step 1)
  const [businessData, setBusinessData] = useState({
    business_name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    category: "Hotel",
    check_in: "15:00",
    check_out: "11:00",
    // Amenities
    wifi: false,
    parking: false,
    breakfast: false,
    restaurant: false,
    gym: false,
    swimming_pool: false,
  })

  // User data (Step 2)
  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirmation: "",
  })

  const totalSteps = 2

  const handleNextStep = () => {
    setError("")

    // Validate current step
    if (currentStep === 1) {
      if (!businessData.business_name || !businessData.address || !businessData.city || !businessData.state) {
        setError("Please fill in all required business information")
        return
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handlePrevStep = () => {
    setError("")
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    // Validate passwords match
    if (userData.password !== userData.password_confirmation) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (userData.password.length < 6) {
      setError("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/users/business_signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business: businessData,
          user: userData,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          `Account created successfully! Your Business ID is: ${data.data.business_id}. Please save this ID for login.`,
        )

        // Redirect to login after 4 seconds
        setTimeout(() => {
          router.push("/login")
        }, 4000)
      } else {
        setError(data.status?.message || "Failed to create account. Please try again.")
      }
    } catch (err: any) {
      console.error("Signup error:", err)
      setError("Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Signup form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-2xl space-y-6">
          {/* Logo and branding */}
          <div className="space-y-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-balance">Create Your Business Account</h1>
              <p className="text-muted-foreground mt-2">
                {currentStep === 1
                  ? "Tell us about your hotel or property"
                  : "Create your administrator account"}
              </p>
            </div>

            <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 text-green-900 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Business Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <Building2 className="w-5 h-5" />
                  <h3 className="font-semibold">Business Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="business_name">
                      Business Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="business_name"
                      type="text"
                      placeholder="Grand Plaza Hotel"
                      value={businessData.business_name}
                      onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="description">Business Description</Label>
                    <Textarea
                      id="description"
                      placeholder="A brief description of your property..."
                      value={businessData.description}
                      onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="address">
                      Street Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="123 Main Street"
                      value={businessData.address}
                      onChange={(e) => setBusinessData({ ...businessData, address: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="New York"
                      value={businessData.city}
                      onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="state"
                      type="text"
                      placeholder="NY"
                      value={businessData.state}
                      onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      type="text"
                      placeholder="10001"
                      value={businessData.zip_code}
                      onChange={(e) => setBusinessData({ ...businessData, zip_code: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="check_in">Check-in Time</Label>
                    <Input
                      id="check_in"
                      type="time"
                      value={businessData.check_in}
                      onChange={(e) => setBusinessData({ ...businessData, check_in: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="check_out">Check-out Time</Label>
                    <Input
                      id="check_out"
                      type="time"
                      value={businessData.check_out}
                      onChange={(e) => setBusinessData({ ...businessData, check_out: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block">Amenities</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "wifi", label: "WiFi" },
                      { key: "parking", label: "Parking" },
                      { key: "breakfast", label: "Breakfast" },
                      { key: "restaurant", label: "Restaurant" },
                      { key: "gym", label: "Gym" },
                      { key: "swimming_pool", label: "Swimming Pool" },
                    ].map((amenity) => (
                      <div key={amenity.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={amenity.key}
                          checked={businessData[amenity.key as keyof typeof businessData] as boolean}
                          onCheckedChange={(checked: boolean) =>
                            setBusinessData({ ...businessData, [amenity.key]: checked })
                          }
                        />
                        <label
                          htmlFor={amenity.key}
                          className="text-sm font-medium leading-none cursor-pointer select-none"
                        >
                          {amenity.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: User Account */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 mb-4">
                  <User className="w-5 h-5" />
                  <h3 className="font-semibold">Administrator Account</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="John"
                      value={userData.first_name}
                      onChange={(e) => setUserData({ ...userData, first_name: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div>
                    <Label htmlFor="last_name">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="last_name"
                      type="text"
                      placeholder="Doe"
                      value={userData.last_name}
                      onChange={(e) => setUserData({ ...userData, last_name: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@hotel.com"
                      value={userData.email}
                      onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input
                      id="phone_number"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={userData.phone_number}
                      onChange={(e) => setUserData({ ...userData, phone_number: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="password">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                      required
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="password_confirmation">
                      Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password_confirmation"
                      type="password"
                      placeholder="••••••••"
                      value={userData.password_confirmation}
                      onChange={(e) => setUserData({ ...userData, password_confirmation: e.target.value })}
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-sm text-blue-900 mb-2">Business Summary</h4>
                  <p className="text-sm text-blue-700">
                    <strong>{businessData.business_name}</strong>
                  </p>
                  <p className="text-sm text-blue-600">
                    {businessData.address}, {businessData.city}, {businessData.state}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={handlePrevStep} className="flex-1 cursor-pointer">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < totalSteps ? (
                <Button type="button" onClick={handleNextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer">
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 cursor-pointer"
                  disabled={isLoading || !!success}
                >
                  {isLoading ? "Creating Account..." : "Create Business Account"}
                </Button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer hover:underline">
              Sign in
            </Link>
          </p>
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-indigo-700/80 to-blue-900/90" />

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-center p-16 text-white text-center">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl animate-in zoom-in duration-700">
            <Hotel className="w-12 h-12 text-blue-200" />
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight text-balance">
            Start Your Hotel <br />
            <span className="text-blue-200">Management Journey</span>
          </h2>

          <p className="text-lg xl:text-xl text-blue-100/90 max-w-md mb-12 leading-relaxed text-balance">
            Join Abri and streamline your hotel operations with our comprehensive management system.
          </p>

          <div className="space-y-6 w-full max-w-sm">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Easy Setup</h3>
                <p className="text-xs text-blue-100/70">Simple 2-step registration</p>
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Business-First</h3>
                <p className="text-xs text-blue-100/70">Securely bound to your property</p>
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Team Ready</h3>
                <p className="text-xs text-blue-100/70">Manage roles and permissions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="absolute bottom-8 left-0 right-0 text-center opacity-40">
          <p className="text-xs tracking-widest uppercase font-medium">Powered by Abri Intelligence</p>
        </div>
      </div>
    </div>
  )
}
