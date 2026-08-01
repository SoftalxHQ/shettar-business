"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { api } from "@/lib/api-client"

const fieldClass =
  "form-input w-full shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x"

function BrandPanel({
  title,
  highlight,
  description,
  showTips,
}: {
  title: string
  highlight: string
  description: string
  showTips?: boolean
}) {
  return (
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
          {title} <br />
          <span className="text-indigo-200">{highlight}</span>
        </h2>

        <p className="text-lg xl:text-xl text-indigo-100/90 max-w-md leading-relaxed text-balance">
          {description}
        </p>

        {showTips && (
          <div className="mt-12 p-6 bg-indigo-500/20 backdrop-blur-md rounded-2xl max-w-md border border-white/10 shadow-xl">
            <h3 className="font-semibold mb-2 text-indigo-100">Password Tips</h3>
            <ul className="text-sm text-indigo-50/80 text-left space-y-1">
              <li>• Use at least 8 characters</li>
              <li>• Mix letters, numbers, and symbols</li>
              <li>• Avoid common words or patterns</li>
              <li>• Don&apos;t reuse old passwords</li>
            </ul>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center opacity-40 pointer-events-none">
        <p className="text-xs tracking-widest uppercase font-medium">
          Powered by Shettar Intelligence
        </p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [resetToken, setResetToken] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== passwordConfirmation) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (resetToken.length !== 6) {
      setError("Reset code must be 6 digits")
      return
    }

    setIsLoading(true)

    try {
      await api.put("/users/update_password", {
        user: {
          reset_password_token: resetToken,
          password: password,
          password_confirmation: passwordConfirmation,
        },
      })

      setIsSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      console.error("Reset password error:", err)
      setError(err.message || "Invalid or expired reset code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-dvh overflow-hidden grid lg:grid-cols-2 app-safe-shell">
      <div className="h-full min-h-0 flex flex-col bg-white">
        <div className="flex-1 min-h-0 overflow-y-auto px-6 sm:px-8 pt-6 sm:pt-8">
          <div className="w-full max-w-md mx-auto space-y-6 pb-4">
            {isSuccess ? (
              <div className="text-center space-y-4 pt-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                  Password Reset Successful!
                </h1>
                <p className="text-slate-600 leading-relaxed">
                  Your password has been updated successfully. You can now sign in with your new
                  password.
                </p>
                <p className="text-xs text-slate-500 pt-2">
                  Redirecting automatically in 3 seconds...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to sign in
                  </Link>

                  <Image
                    src="/shettar-logo.png"
                    alt="Shettar Logo"
                    width={48}
                    height={48}
                    className="mb-2"
                    priority
                  />

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                      Reset Your Password
                    </h1>
                    <p className="text-slate-500 mt-2">
                      Enter the 6-digit code sent to your email and choose a new password.
                    </p>
                  </div>
                </div>

                <form id="reset-password-form" onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-rose-100 text-rose-600 px-3 py-2 rounded text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label
                      htmlFor="resetToken"
                      className="block text-sm font-medium mb-1 text-slate-800"
                    >
                      Reset Code
                    </Label>
                    <input
                      id="resetToken"
                      className={`${fieldClass} font-mono text-center text-2xl tracking-widest`}
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ""))}
                      required
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-slate-500">Check your email for the 6-digit code</p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="block text-sm font-medium mb-1 text-slate-800"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <input
                        id="password"
                        className={`${fieldClass} pr-10`}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Must be at least 6 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="passwordConfirmation"
                      className="block text-sm font-medium mb-1 text-slate-800"
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <input
                        id="passwordConfirmation"
                        className={`${fieldClass} pr-10`}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={passwordConfirmation}
                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-6 sm:px-8 py-4">
          <div className="w-full max-w-md mx-auto space-y-3">
            {isSuccess ? (
              <Link href="/login" className="block">
                <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                  Continue to Sign In
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  type="submit"
                  form="reset-password-form"
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white shadow-none rounded-md"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </Button>
                <p className="text-xs text-center text-slate-500">
                  Didn&apos;t receive the code?{" "}
                  <Link
                    href="/forgot-password"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Request a new one
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {isSuccess ? (
        <BrandPanel
          title="You're All Set!"
          highlight="Welcome Back"
          description="Your account is secure and ready to use with your new password."
        />
      ) : (
        <BrandPanel
          title="Secure Account"
          highlight="Recovery"
          description="Create a strong password to keep your account secure."
          showTips
        />
      )}
    </div>
  )
}
