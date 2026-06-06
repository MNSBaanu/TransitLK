// Module: Depot Management Dashboard

import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import api from '../services/api'

const STATUS_STYLES = {
  'on-time':   'bg-green-100 text-green-700',
  scheduled:   'bg-blue-100 text-blue-700',
  delayed:     'bg-yellow-100 text-yellow-700',
  completed:   'bg-gray-100 text-gray-500',
  cancelled:   'bg-red-100 text-red-600',
}

function StatCard({ label, value, sub, subColor }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor || 'text-on-surface-variant'}`}>{sub}</p>}
    </div>
  )
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-on-surface-variant mb-1">
        <span>{label}</span>
        <span className="font-medium text-neutral-900">{value} / {total}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-container">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      const { data: res } = await api.get('/dashboard')
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-on-surface-variant text-sm">
        Loading dashboard...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500 text-sm">
        Failed to load dashboard data. Make sure the server is running.
      </div>
    )
  }

  const { buses, drivers, maintenance, recentSchedules, totalRoutes, tripCompletion } = data

  return (
    <div className="w-full space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Active Routes" value={totalRoutes} sub="Active routes" subColor="text-green-600" />
        <StatCard label="Buses Available" value={buses.available} sub={`of ${buses.total} Total`} />
        <StatCard label="Drivers on Duty" value={drivers.onDuty} sub="Shift A" />
        <StatCard label="Trip Completion" value={`${tripCompletion}%`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-outline-variant bg-white shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <h3 className="text-base font-semibold text-neutral-900">Real-time Trip Status</h3>
              <button className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
                View All Trips <Icon name="chevron_right" size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 text-left">Route</th>
                    <th className="px-4 py-3 text-left">Driver</th>
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Departure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {recentSchedules.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-on-surface-variant">No scheduled trips yet</td></tr>
                  ) : recentSchedules.map((s) => (
                    <tr key={s._id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 font-semibold text-blue-700">{s.routeName}</td>
                      <td className="px-4 py-3 text-neutral-700">{s.driverName}</td>
                      <td className="px-4 py-3 text-neutral-700">{s.busReg}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-600'}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {s.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{s.departureTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Bus Availability by Type</p>
            <ProgressBar label="Express" value={buses.byServiceType.express} total={buses.total || 1} color="bg-green-500" />
            <ProgressBar label="Ordinary" value={buses.byServiceType.ordinary} total={buses.total || 1} color="bg-blue-700" />
            <ProgressBar label="Semi-Luxury" value={buses.byServiceType.semiLuxury} total={buses.total || 1} color="bg-yellow-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">Recent Alerts</h3>
            {maintenance.alerts.length > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{maintenance.alerts.length} URGENT</span>
            )}
          </div>

          {maintenance.alerts.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-white p-4 text-sm text-on-surface-variant">No active alerts</div>
          ) : maintenance.alerts.map((alert) => (
            <div key={alert._id} className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <Icon name="warning" size={18} className="text-red-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-red-600">MAINTENANCE NEEDED</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-900">Bus {alert.busReg}</p>
                  <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">{alert.description}</p>
                  <button onClick={() => setAlertDetail(alert)} className="mt-2 rounded-lg border border-outline-variant bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-surface-container">DETAILS</button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-outline-variant bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-3">Fleet Summary</p>
            <div className="space-y-2 text-sm">
              {[
                ['Total Buses', buses.total, 'text-neutral-900'],
                ['In Maintenance', buses.maintenance, 'text-red-600'],
                ['Total Drivers', drivers.total, 'text-neutral-900'],
                ['Maintenance Cost', `LKR ${Number(maintenance.totalCost || 0).toLocaleString()}`, 'text-neutral-900'],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className={`font-semibold ${cls}`}>{val}</span>
                </div>
              ))}
            </div>
          </div>

            
        </div>
      </div>
    </div>
  )
}

export default Dashboard


