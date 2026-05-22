import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForRole, isPathAllowed } from '../config/roles'

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container">
      <p className="text-sm text-on-surface-variant">Loading session...</p>
    </div>
  )
}

/** Requires valid JWT; redirects unauthenticated users to /login */
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Blocks manual URL access to modules outside the user role */
export function RoleGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading || !user) return <AuthLoading />

  if (!isPathAllowed(user.role, location.pathname)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }

  return <Outlet />
}

/** Public route — redirect to role home if already logged in */
export function PublicOnly({ children }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) return <AuthLoading />
  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }
  return children
}
