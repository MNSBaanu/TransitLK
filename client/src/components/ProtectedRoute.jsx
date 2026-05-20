import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../context/LayoutContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

function ProtectedRoute() {
  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden bg-surface">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface [&:not(:has(.routes-workspace))]:overflow-y-auto [&:not(:has(.routes-workspace))]:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}

export default ProtectedRoute
