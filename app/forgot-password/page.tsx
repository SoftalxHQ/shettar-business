"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Hotel, ArrowLeft, Mail, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/users/reset_password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: {
            email,
          },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep('reset')
      } else {
        setError(data.error?.[0]?.message || "Failed to send reset instructions. Please try again.")
      }
    } catch (err) {
      console.error("Forgot password error:", err)
      setError("Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
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
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

      const response = await fetch(`${API_URL}/users/update_password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: {
            reset_password_token: resetToken,
            password: password,
            password_confirmation: passwordConfirmation,
          },
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setStep('success')
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      } else {
        setError(data.error?.[0]?.message || "Invalid or expired reset code. Please try again.")
      }
    } catch (err) {
      console.error("Reset password error:", err)
      setError("Unable to connect to server. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (step === 'success') {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Password Reset Successful!
              </h1>
              <p className="text-slate-600 leading-relaxed">
                Your password has been updated successfully. You can now sign in with your new password.
              </p>
              <div className="pt-6">
                <Link href="/login">
                  <Button className="w-full bg-indigo-500 hover:bg-indigo-600">
                    Continue to Sign In
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-slate-500 pt-4">
                Redirecting automatically in 3 seconds...
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/80 to-violet-900/90" />

          <div className="relative h-full flex flex-col items-center justify-center p-16 text-white text-center">
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
              <Hotel className="w-12 h-12 text-indigo-200" />
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight">
              You're All Set! <br />
              <span className="text-indigo-200">Welcome Back</span>
            </h2>
            <p className="text-lg text-indigo-100/90 max-w-md leading-relaxed">
              Your account is secure and ready to use with your new password.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Reset password form (after email sent)
  if (step === 'reset') {
    return (
      <div className="min-h-screen grid lg:grid-cols-2">
        <div className="flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-4">
              <button
                onClick={() => setStep('email')}
                className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Change email
              </button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                  Reset Your Password
                </h1>
                <p className="text-slate-500 mt-2">
                  We've sent a 6-digit code to <span className="font-semibold">{email}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-6">
              {error && (
                <div className="bg-rose-100 text-rose-600 px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="resetToken" className="block text-sm font-medium mb-1 text-slate-800">
                  Reset Code
                </Label>
                <input
                  id="resetToken"
                  className="form-input w-full font-mono text-center text-2xl tracking-widest shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <p className="text-xs text-slate-500">
                  Check your email for the 6-digit code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm font-medium mb-1 text-slate-800">
                  New Password
                </Label>
                <div className="relative">
                  <input
                    id="password"
                    className="form-input w-full shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x pr-10"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation" className="block text-sm font-medium mb-1 text-slate-800">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <input
                    id="passwordConfirmation"
                    className="form-input w-full shadow-none border border-slate-300 focus:border-indigo-600 focus:border-1x pr-10"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn bg-indigo-500 hover:bg-indigo-600 text-white shadow-none rounded-md"
                disabled={isLoading}
              >
                {isLoading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>

            <div className="pt-4 mt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-500">
                Didn't receive the code?{" "}
                <button
                  onClick={() => {
                    setStep('email')
                    setResetToken("")
                    setPassword("")
                    setPasswordConfirmation("")
                  }}
                  className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Try again
                </button>
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Didn't receive the email?</strong> Check your spam folder, or wait a few minutes and try again.
              </p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/80 to-violet-900/90" />

          <div className="relative h-full flex flex-col items-center justify-center p-16 text-white text-center">
            <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
              <Hotel className="w-12 h-12 text-indigo-200" />
            </div>
            <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight">
              Secure Account <br />
              <span className="text-indigo-200">Recovery</span>
            </h2>
            <p className="text-lg text-indigo-100/90 max-w-md leading-relaxed">
              Create a strong password to keep your account secure.
            </p>

            <div className="mt-12 p-6 bg-indigo-500/20 backdrop-blur-md rounded-2xl max-w-md border border-white/10 shadow-xl">
              <h3 className="font-semibold mb-2 flex items-center justify-center gap-2 text-indigo-100">
                <span className="p-1 bg-indigo-400/30 rounded">🔒</span> Password Tips
              </h3>
              <ul className="text-sm text-indigo-50/80 text-left space-y-1">
                <li>• Use at least 8 characters</li>
                <li>• Mix letters, numbers, and symbols</li>
                <li>• Avoid common words or patterns</li>
                <li>• Don't reuse old passwords</li>
              </ul>
            </div>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center opacity-40">
            <p className="text-xs tracking-widest uppercase font-medium">Powered by Abri Intelligence</p>
          </div>
        </div>
      </div>
    )
  }

  // Email input form (initial step)

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4">
            <Link href="/login" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to sign in
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-800">
                Forgot Your Password?
              </h1>
              <p className="text-slate-500 mt-2">
                No worries! Enter your email address and we'll send you a reset code.
              </p>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-100 text-rose-600 px-3 py-2 rounded text-sm flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="block text-sm font-medium mb-1 text-slate-800">
                Email Address
              </Label>
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

            <Button
              type="submit"
              className="w-full btn bg-indigo-500 hover:bg-indigo-600 text-white shadow-none rounded-md"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Code"}
            </Button>
          </form>

          <div className="pt-4 mt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-500">
              Remember your password?{" "}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Sign in instead
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Same as login page */}
      <div className="hidden lg:block relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1920')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-800/80 to-violet-900/90" />

        <div className="relative h-full flex flex-col items-center justify-center p-16 text-white text-center">
          <div className="mb-8 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
            <Hotel className="w-12 h-12 text-indigo-200" />
          </div>
          <h2 className="text-4xl xl:text-5xl font-bold mb-6 tracking-tight">
            Secure Account <br />
            <span className="text-indigo-200">Recovery</span>
          </h2>
          <p className="text-lg text-indigo-100/90 max-w-md leading-relaxed">
            Your account security is our priority. We'll help you get back in safely.
          </p>
        </div>

        <div className="absolute bottom-8 left-0 right-0 text-center opacity-40">
          <p className="text-xs tracking-widest uppercase font-medium">Powered by Abri Intelligence</p>
        </div>
      </div>
    </div>
  )
}
