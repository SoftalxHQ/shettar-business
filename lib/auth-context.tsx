"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
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
  logout: () => void
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

  const logout = async () => {
    const currentBusinessName = businessName

    try {
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
    } catch (error) {
      console.error("Logout API call failed:", error)
      // Continue with local logout even if API fails
    } finally {
      // Clear local state and storage
      setUser(null)
      storageLogout()

      // Show success toast
      toast.success("Signed out successfully", {
        description: `You've been logged out of ${currentBusinessName || "your account"}`,
      })
    }
  }

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

  return (
    <AuthContext.Provider
      value={{ user, businessId, businessName, deviceId, login, logout, changeBusiness, updateUser, isLoading, isFirstTimeSetup }}
    >
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
