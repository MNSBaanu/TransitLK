import { Outlet } from 'react-router-dom'
import { LayoutProvider } from '../context/LayoutContext'
import Navbar from './Navbar'

function AppLayout() {
  return (
    <LayoutProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-fleet-canvas font-sans">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-fleet-canvas">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutProvider>
  )
}

export default AppLayout
