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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import Image from "next/image"
import {
  AlertCircle,
  CheckCircle2,
  Building2,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api-client"
import { LocationFields } from "@/components/location-fields"

const STEP_COPY = [
  "Tell us about your hotel or property",
  "Add location, hours, and amenities",
  "Create your administrator account",
] as const

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
              step === currentStep
                ? "bg-indigo-600 text-white"
                : step < currentStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500",
            )}
          >
            {step < currentStep ? <CheckCircle2 className="w-4 h-4" /> : step}
          </div>
          {step < totalSteps && (
            <div className={cn("w-8 sm:w-12 h-0.5", step < currentStep ? "bg-green-500" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [businessData, setBusinessData] = useState({
    business_name: "",
    referrer_code: "",
    description: "",
    address: "",
    country: "",
    state: "",
    lga: "",
    city: "",
    zip_code: "",
    category: "Hotels",
    check_in: "15:00",
    check_out: "11:00",
    wifi: false,
    parking: false,
    breakfast: false,
    restaurant: false,
    gym: false,
    swimming_pool: false,
  })

  const [userData, setUserData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    password_confirmation: "",
  })

  const totalSteps = 3

  const handleNextStep = () => {
    setError("")

    if (currentStep === 1) {
      if (!businessData.business_name || !businessData.category) {
        setError("Please fill in all required business information")
        return
      }
    }

    if (currentStep === 2) {
      if (
        !businessData.address ||
        !businessData.country ||
        !businessData.state ||
        !businessData.lga ||
        !businessData.city
      ) {
        setError("Please fill in all required location information")
        return
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
  }

  const handlePrevStep = () => {
    setError("")
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const createAccount = async () => {
    if (currentStep !== totalSteps) return

    setError("")
    setSuccess("")
    setIsLoading(true)

    if (!userData.first_name || !userData.last_name || !userData.email) {
      setError("Please fill in all required account fields")
      setIsLoading(false)
      return
    }

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
      const data: any = await api.post("/users/business_signup", {
        business: businessData,
        user: userData,
      })

      setSuccess(
        `Account created successfully! Your Business ID is: ${data.data.business_id}. Please save this ID for login.`,
      )

      setTimeout(() => {
        router.push("/login")
      }, 4000)
    } catch (err: any) {
      console.error("Signup error:", err)
      setError(err.message || "Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  // Enter in an input would otherwise submit the form; only the Create button should.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return
    const target = e.target as HTMLElement
    if (target.tagName === "TEXTAREA") return
    e.preventDefault()
    if (currentStep < totalSteps) {
      handleNextStep()
    }
  }

  return (
    <div className="h-dvh overflow-hidden grid lg:grid-cols-2 app-safe-shell">
      {/* Left side - Signup form */}
      <div className="h-full min-h-0 flex flex-col bg-white">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 pt-6 sm:pt-8">
          <div className="w-full max-w-md mx-auto space-y-6 pb-4">
            <div className="space-y-4">
              <Image
                src="/shettar-logo.png"
                alt="Shettar Logo"
                width={48}
                height={48}
                className="mb-2"
                priority
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800 text-balance">
                  Create Your Business Account
                </h1>
                <p className="text-slate-500 mt-2">{STEP_COPY[currentStep - 1]}</p>
              </div>

              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </div>

            <form
              id="signup-form"
              onSubmit={handleSubmit}
              onKeyDown={handleFormKeyDown}
              className="space-y-6"
            >
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

              {/* Step 1: Business basics */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <Building2 className="w-5 h-5" />
                    <h3 className="font-semibold">Business Information</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="business_name">
                        Business Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="business_name"
                        type="text"
                        placeholder="Grand Plaza Hotel"
                        value={businessData.business_name}
                        onChange={(e) =>
                          setBusinessData({ ...businessData, business_name: e.target.value })
                        }
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">
                        Property Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={businessData.category}
                        onValueChange={(value) =>
                          setBusinessData({ ...businessData, category: value })
                        }
                      >
                        <SelectTrigger id="category" className="h-11 w-full">
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hotels">Hotels</SelectItem>
                          <SelectItem value="Apartments">Apartments</SelectItem>
                          <SelectItem value="Guest House">Guest House</SelectItem>
                          <SelectItem value="Rentals">Rentals</SelectItem>
                          <SelectItem value="Resort">Resort</SelectItem>
                          <SelectItem value="Villa">Villa</SelectItem>
                          <SelectItem value="Lodge">Lodge</SelectItem>
                          <SelectItem value="Cottage">Cottage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Business Description</Label>
                      <Textarea
                        id="description"
                        placeholder="A brief description of your property..."
                        value={businessData.description}
                        onChange={(e) =>
                          setBusinessData({ ...businessData, description: e.target.value })
                        }
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referrer_code">Referrer code (optional)</Label>
                      <Input
                        id="referrer_code"
                        type="text"
                        placeholder="STRXXXXXX"
                        value={businessData.referrer_code}
                        onChange={(e) =>
                          setBusinessData({ ...businessData, referrer_code: e.target.value })
                        }
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        If a marketer referred you, enter their code.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location & property details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <MapPin className="w-5 h-5" />
                    <h3 className="font-semibold">Location & Details</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <LocationFields
                        detectCountry
                        value={{
                          country: businessData.country,
                          state: businessData.state,
                          lga: businessData.lga,
                          city: businessData.city,
                        }}
                        onChange={({ country, state, lga, city }) =>
                          setBusinessData((prev) => ({ ...prev, country, state, lga, city }))
                        }
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">
                        Street Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="123 Main Street"
                        value={businessData.address}
                        onChange={(e) =>
                          setBusinessData({ ...businessData, address: e.target.value })
                        }
                        required
                        className="h-11"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="zip_code">ZIP / Postal Code</Label>
                      <Input
                        id="zip_code"
                        type="text"
                        placeholder="100001"
                        value={businessData.zip_code}
                        onChange={(e) =>
                          setBusinessData({ ...businessData, zip_code: e.target.value })
                        }
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Check-in Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={businessData.check_in.split(":")[0]}
                          onValueChange={(h) =>
                            setBusinessData({
                              ...businessData,
                              check_in: `${h}:${businessData.check_in.split(":")[1]}`,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {hours.map((h) => (
                              <SelectItem key={`in-h-${h}`} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center text-gray-400">:</div>
                        <Select
                          value={businessData.check_in.split(":")[1]}
                          onValueChange={(m) =>
                            setBusinessData({
                              ...businessData,
                              check_in: `${businessData.check_in.split(":")[0]}:${m}`,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map((m) => (
                              <SelectItem key={`in-m-${m}`} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Check-out Time</Label>
                      <div className="flex gap-2">
                        <Select
                          value={businessData.check_out.split(":")[0]}
                          onValueChange={(h) =>
                            setBusinessData({
                              ...businessData,
                              check_out: `${h}:${businessData.check_out.split(":")[1]}`,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 flex-1">
                            <SelectValue placeholder="HH" />
                          </SelectTrigger>
                          <SelectContent>
                            {hours.map((h) => (
                              <SelectItem key={`out-h-${h}`} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center text-gray-400">:</div>
                        <Select
                          value={businessData.check_out.split(":")[1]}
                          onValueChange={(m) =>
                            setBusinessData({
                              ...businessData,
                              check_out: `${businessData.check_out.split(":")[0]}:${m}`,
                            })
                          }
                        >
                          <SelectTrigger className="h-11 flex-1">
                            <SelectValue placeholder="MM" />
                          </SelectTrigger>
                          <SelectContent>
                            {minutes.map((m) => (
                              <SelectItem key={`out-m-${m}`} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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

              {/* Step 3: Administrator account */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <User className="w-5 h-5" />
                    <h3 className="font-semibold">Administrator Account</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
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

                    <div className="space-y-2">
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

                    <div className="col-span-2 space-y-2">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        You can use the same email for more than one hotel — login is per business ID.
                      </p>
                    </div>

                    <div className="col-span-2 space-y-2">
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

                    <div className="col-span-2 space-y-2">
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

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="password_confirmation">
                        Confirm Password <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="password_confirmation"
                        type="password"
                        placeholder="••••••••"
                        value={userData.password_confirmation}
                        onChange={(e) =>
                          setUserData({ ...userData, password_confirmation: e.target.value })
                        }
                        required
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="mt-2 p-4 bg-indigo-50 rounded-lg">
                    <h4 className="font-medium text-sm text-indigo-900 mb-2">Business Summary</h4>
                    <p className="text-sm text-indigo-700">
                      <strong>{businessData.business_name}</strong>
                      <span className="text-indigo-500"> · {businessData.category}</span>
                    </p>
                    <p className="text-sm text-indigo-600">
                      {businessData.address}, {businessData.city}, {businessData.lga},{" "}
                      {businessData.state}
                      {businessData.country ? ` · ${businessData.country}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-6 sm:px-8 py-4">
          <div className="w-full max-w-md mx-auto space-y-3">
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="flex-1"
                  disabled={isLoading || !!success}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                  disabled={isLoading || !!success}
                  onClick={() => {
                    void createAccount()
                  }}
                >
                  {isLoading ? "Creating Account..." : "Create Business Account"}
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Formal brand panel */}
      <div className="hidden lg:block relative h-full min-h-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/80 to-violet-900/90" />

        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative h-full flex flex-col items-center justify-center p-12 xl:p-16 text-white text-center overflow-y-auto">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
            <Image
              src="/shettar-logo.png"
              alt="Shettar Logo"
              width={64}
              height={64}
              className="brightness-0 invert"
            />
          </div>

          <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight text-balance">
            Start Your Hotel <br />
            <span className="text-indigo-200">Management Journey</span>
          </h2>

          <p className="text-lg xl:text-xl text-indigo-100/90 max-w-md mb-12 leading-relaxed text-balance">
            Join Shettar and streamline your hotel operations with our comprehensive management
            system.
          </p>

          <div className="space-y-4 w-full max-w-sm">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Easy Setup</h3>
                <p className="text-xs text-indigo-100/70">Simple 3-step registration</p>
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Business-First</h3>
                <p className="text-xs text-indigo-100/70">Securely bound to your property</p>
              </div>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Team Ready</h3>
                <p className="text-xs text-indigo-100/70">Manage roles and permissions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center opacity-40 pointer-events-none">
          <p className="text-xs tracking-widest uppercase font-medium">
            Powered by Shettar Intelligence
          </p>
        </div>
      </div>
    </div>
  )
}
