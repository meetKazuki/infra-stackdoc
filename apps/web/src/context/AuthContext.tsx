import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchMe, logout as apiLogout, loginUrl, AUTH_INVALIDATED } from '../lib/api'
import type { User } from '../lib/api.types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isLoggedIn: boolean
  login: () => void
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe()
      setUser(me)
    } catch (err) {
      console.error('Failed to fetch current user:', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Any auth-required API call that 401s dispatches AUTH_INVALIDATED. When we
  // receive it, drop the cached user — the next render flips back to SIGN IN
  // and any protected page (e.g. <MyConfigsPage>) self-redirects.
  useEffect(() => {
    const handler = () => setUser(null)
    window.addEventListener(AUTH_INVALIDATED, handler)
    return () => window.removeEventListener(AUTH_INVALIDATED, handler)
  }, [])

  const login = useCallback(() => {
    window.location.href = loginUrl()
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch (error) {
      console.error('Logout request failed:', error)
    }
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isLoading,
    isLoggedIn: user !== null,
    login,
    logout,
    refresh,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
