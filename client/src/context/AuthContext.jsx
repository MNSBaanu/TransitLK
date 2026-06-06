import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { homePathForRole, isPathAllowed } from '../config/roles'
import { primePagesForRole } from '../services/pagePrefetch'

const AuthContext = createContext(null)

const STORAGE_USER = 'transitlk_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  const persistUser = (profile) => {
    setUser(profile)
    if (profile) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(profile))
    } else {
      localStorage.removeItem(STORAGE_USER)
    }
  }

  const refreshSession = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      persistUser(null)
      setLoading(false)
      return null
    }
    try {
      const { data } = await api.get('/auth/me')
      persistUser(data)
      primePagesForRole(data.role)
      return data
    } catch {
      localStorage.removeItem('token')
      persistUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    const profile = await refreshSession()
    return profile || {
      _id: data._id,
      name: data.name,
      email: data.email,
      role: data.role,
      accountType: data.accountType,
      driverId: data.driverId,
      depotId: data.depotId,
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    persistUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user && localStorage.getItem('token')),
      login,
      logout,
      refreshSession,
      homePath: user ? homePathForRole(user.role) : '/login',
      canAccessPath: (pathname) =>
        user ? isPathAllowed(user.role, pathname) : false,
    }),
    [user, loading, refreshSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
