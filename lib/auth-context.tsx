"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"
import type { User } from "./mock-auth"
import {
  getStoredBusinessId,
  setStoredBusinessId,
  getAuthToken,
  setAuthToken,
  getUserData,
  setUserData,
  logout as storageLogout,
  changeBusiness as storageChangeBusiness,
  getOrCreateDeviceId,
} from "./storage"

interface AuthContextType {
  user: User | null
  businessId: string | null
  deviceId: string
  login: (user: User, businessId: string, token: string) => void
  logout: () => void
  changeBusiness: () => void
  isLoading: boolean
  isFirstTimeSetup: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [deviceId] = useState<string>(() => getOrCreateDeviceId())
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false)

  useEffect(() => {
    // Check for stored data on mount
    const storedBusinessId = getStoredBusinessId()
    const storedToken = getAuthToken()
    const storedUser = getUserData()

    if (storedBusinessId) {
      setBusinessId(storedBusinessId)
      setIsFirstTimeSetup(false)
    } else {
      setIsFirstTimeSetup(true)
    }

    if (storedUser && storedToken) {
      setUser(storedUser)
    }

    setIsLoading(false)
  }, [])

  const login = (userData: User, userBusinessId: string, token: string) => {
    setUser(userData)
    setUserData(userData)
    setAuthToken(token)

    // Store business ID for this device
    setBusinessId(userBusinessId)
    setStoredBusinessId(userBusinessId)
    setIsFirstTimeSetup(false)
  }

  const logout = () => {
    setUser(null)
    storageLogout()
    // Note: business ID remains in state and storage
  }

  const changeBusiness = () => {
    setUser(null)
    setBusinessId(null)
    storageChangeBusiness()
    setIsFirstTimeSetup(true)
  }

  return (
    <AuthContext.Provider
      value={{ user, businessId, deviceId, login, logout, changeBusiness, isLoading, isFirstTimeSetup }}
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
