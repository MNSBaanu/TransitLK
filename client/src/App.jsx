import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import RoutesPage from './pages/Routes'
import Schedules from './pages/Schedules'
import Drivers from './pages/Drivers'
import Buses from './pages/Buses'
import Maintenance from './pages/Maintenance'
import Reports from './pages/Reports'
import AppLayout from './components/AppLayout'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/routes" element={<RoutesPage />} />
        <Route path="/schedules" element={<Schedules />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/buses" element={<Buses />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
