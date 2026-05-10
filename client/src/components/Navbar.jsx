import { useNavigate } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-base font-semibold text-[#0f2d5e] tracking-wide">
          Smart Route Management & Scheduling System
        </h1>
        <p className="text-xs text-slate-400 tracking-wide">Public Transport Depot Operations</p>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-slate-500 hover:text-red-600 font-medium transition border border-slate-200 px-3 py-1.5 rounded-md hover:border-red-300"
      >
        Sign Out
      </button>
    </header>
  )
}

export default Navbar
