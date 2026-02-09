"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { User } from "./mock-auth"
import {
  getStoredBusinessId,
  setStoredBusinessId,
  getStoredBusinessName,
  setStoredBusinessName,
  getAuthToken,
  setAuthToken,
  getUserData,
  setUserData,
  logout as storageLogout,
  changeBusiness as storageChangeBusiness,
  getOrCreateDeviceId,
} from "./storage"
import { toast } from "sonner"

interface AuthContextType {
  user: User | null
  businessId: string | null
  businessName: string | null
  deviceId: string
  login: (user: User, businessId: string, businessName: string, token: string) => void
  logout: (skipApiCall?: boolean) => void
  changeBusiness: () => void
  updateUser: (updates: Partial<User>) => void
  isLoading: boolean
  isFirstTimeSetup: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [deviceId] = useState<string>(() => getOrCreateDeviceId())
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)
  const router = useRouter()
  const isLoggingOutRef = useRef(false)

  useEffect(() => {
    // Check for stored data on mount
    const storedBusinessId = getStoredBusinessId()
    const storedBusinessName = getStoredBusinessName()
    const storedToken = getAuthToken()
    const storedUser = getUserData()

    if (storedBusinessId) {
      setBusinessId(storedBusinessId)
      setBusinessName(storedBusinessName)
      setIsFirstTimeSetup(false)
    } else {
      setIsFirstTimeSetup(true)
    }

    if (storedUser && storedToken) {
      setUser(storedUser)
    }

    setIsLoading(false)
  }, [])

  const login = (userData: User, userBusinessId: string, userBusinessName: string, token: string) => {
    isLoggingOutRef.current = false // Reset logout lock
    setUser(userData)
    setUserData(userData)
    setAuthToken(token)

    // Store business ID and name for this device
    setBusinessId(userBusinessId)
    setStoredBusinessId(userBusinessId)
    setBusinessName(userBusinessName)
    setStoredBusinessName(userBusinessName)
    setIsFirstTimeSetup(false)

    // Show success toast
    toast.success(`Welcome back, ${userData.name}!`, {
      description: `Signed in to ${userBusinessName}`,
    })
  }

  const logout = useCallback(async (skipApiCall = false) => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    const currentBusinessName = businessName

    try {
      if (!skipApiCall) {
        // Call backend to invalidate JWT token
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
        const token = getAuthToken()

        if (token) {
          await fetch(`${API_URL}/users/sign_out`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })
        }
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
      // Continue with local logout even if API fails
    } finally {
      // Clear local state and storage
      setUser(null)
      storageLogout()

      if (skipApiCall) {
        toast.error("Session expired. Please login again.")
      } else {
        // Show success toast
        toast.success("Signed out successfully", {
          description: `You've been logged out of ${currentBusinessName || "your account"}`,
        })
      }

      router.push("/login")
    }
  }, [businessName, router])

  // Global fetch interceptor to handle 401 Unauthorized (expired tokens)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (response.status === 401) {
          // Get the URL from search parameters or the first argument
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url || '';

          // Don't intercept 401s for login/logout requests to avoid infinite loops
          if (!url.includes('/users/sign_in') && !url.includes('/users/sign_out')) {
            console.warn("Unauthorized API call detected, logging out...", url);
            logout(true);
          }
        }
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [logout]);

  const changeBusiness = () => {
    setUser(null)
    setBusinessId(null)
    setBusinessName(null)
    storageChangeBusiness()
    setIsFirstTimeSetup(true)

    // Show info toast
    toast.info("Business cleared", {
      description: "You can now sign in to a different business",
    })
  }

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates }
      setUser(updatedUser)
      setUserData(updatedUser)
    }
  }

  const contextValue = useMemo(() => ({
    user,
    businessId,
    businessName,
    deviceId,
    login,
    logout,
    changeBusiness,
    updateUser,
    isLoading,
    isFirstTimeSetup
  }), [user, businessId, businessName, deviceId, login, logout, changeBusiness, updateUser, isLoading, isFirstTimeSetup])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
