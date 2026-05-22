import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RoutesPage from './pages/Routes'
import Schedules from './pages/Schedules'
import Drivers from './pages/Drivers'
import Buses from './pages/Buses'
import Maintenance from './pages/Maintenance'
import Reports from './pages/Reports'
import Login from './pages/Login'
import DriverTrips from './pages/DriverTrips'
import AppLayout from './components/AppLayout'
import { RequireAuth, RoleGuard, PublicOnly } from './components/ProtectedRoute'
import { homePathForRole } from './config/roles'
import { useAuth } from './context/AuthContext'

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />
  }
  return <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route element={<RoleGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/schedules" element={<Schedules />} />
            <Route path="/buses" element={<Buses />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/my-trips" element={<DriverTrips />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default App
