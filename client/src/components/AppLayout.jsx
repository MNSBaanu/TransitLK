import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../context/LayoutContext'
import Navbar from './Navbar'

function AppLayout() {
  return (
    <LayoutProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-fleet-canvas font-sans">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-fleet-canvas p-6">
          <Outlet />
        </main>
      </div>
    </LayoutProvider>
  )
}

export default AppLayout
