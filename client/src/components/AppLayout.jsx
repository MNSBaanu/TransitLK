import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../context/LayoutContext'
import { useAuth } from '../context/AuthContext'
import Navbar from './Navbar'
import { primePagesForRole } from '../services/pagePrefetch'

function AppLayout() {
  const { user } = useAuth()

  useEffect(() => {
    if (user?.role) primePagesForRole(user.role)
  }, [user?.role])

  return (
    <LayoutProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden font-sans">
        <Navbar />
        <main className="app-mesh-bg min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutProvider>
  )
}

export default AppLayout
