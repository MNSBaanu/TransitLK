import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../context/LayoutContext'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

function AppLayout() {
  return (
    <LayoutProvider>
      <div className="flex h-screen w-full overflow-hidden bg-fleet-canvas font-sans">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar />
          <main className="min-h-0 flex-1 overflow-y-auto bg-fleet-canvas p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}

export default AppLayout
