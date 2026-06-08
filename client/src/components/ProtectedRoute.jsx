import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { homePathForRole, isPathAllowed } from '../config/roles'

/** Requires valid JWT; redirects unauthenticated users to /login */
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (!loading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (loading) return null
  return <Outlet />
}

/** Blocks manual URL access to modules outside the user role */
export function RoleGuard() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (user && !isPathAllowed(user.role, location.pathname)) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }
  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

/** Public route — redirect to role home if already logged in */
export function PublicOnly({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }
  return children
}
