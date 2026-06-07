// Module: Depot Management Dashboard

import { useCallback, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData } from '../services/pagePrefetch'

const EMPTY_DASHBOARD = {
  buses: {
    total: 0,
    available: 0,
    inService: 0,
    maintenance: 0,
    byServiceType: { express: 0, ordinary: 0, semiLuxury: 0 },
    byServiceTypeTotal: { express: 0, ordinary: 0, semiLuxury: 0 },
  },
  drivers: { total: 0, onDuty: 0, onLeave: 0, offDuty: 0 },
  maintenance: { totalCost: 0, alerts: [], urgentCount: 0 },
  recentSchedules: [],
  totalRoutes: 0,
  tripCompletion: 0,
}

const STATUS_STYLES = {
  'on-time':   'bg-green-100 text-green-700',
  scheduled:   'bg-blue-100 text-blue-700',
  delayed:     'bg-yellow-100 text-yellow-700',
  completed:   'bg-gray-100 text-gray-500',
  cancelled:   'bg-red-100 text-red-600',
}

const ALERT_STYLES = {
  urgent: {
    wrap: 'border-red-200 bg-red-50',
    title: 'text-red-600',
    icon: 'text-red-600',
  },
  warning: {
    wrap: 'border-yellow-200 bg-yellow-50',
    title: 'text-yellow-700',
    icon: 'text-yellow-700',
  },
  info: {
    wrap: 'border-blue-200 bg-blue-50',
    title: 'text-blue-700',
    icon: 'text-blue-700',
  },
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
  const { user } = useAuth()
  const [data, setData] = useState(() => getStalePageData('/dashboard')?.data || null)

  const depotLabel = useMemo(() => {
    const depot = user?.depotId
    if (!depot) return { name: 'Depot Dashboard', code: null }
    if (typeof depot === 'object') {
      return {
        name: depot.depotName || 'Depot Dashboard',
        code: depot.depotCode || null,
      }
    }
    return { name: 'Depot Dashboard', code: null }
  }, [user?.depotId])

  const applyData = useCallback((payload) => {
    setData(payload?.data || null)
  }, [])

  const { loading, refreshing } = useFastPageLoad('/dashboard', { applyData, forceRefresh: true })

  if (!loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500 text-sm">
        Failed to load dashboard data. Make sure the server is running.
      </div>
    )
  }

  const { buses, drivers, maintenance, recentSchedules, totalRoutes, tripCompletion } =
    data || EMPTY_DASHBOARD

  const typeTotals = buses.byServiceTypeTotal || buses.byServiceType
  const urgentAlerts = maintenance.urgentCount ?? maintenance.alerts.filter((a) => a.severity === 'urgent').length

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-depot-blue-light/25 bg-gradient-to-r from-depot-navy/5 to-depot-blue-light/10 px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-depot-blue-light">
            Depot
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight text-depot-navy sm:text-2xl">
            {depotLabel.name}
          </h1>
        </div>
        {depotLabel.code && (
          <span className="rounded-lg border border-depot-blue-light/40 bg-depot-navy/10 px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-depot-navy">
            {depotLabel.code}
          </span>
        )}
      </div>

      {refreshing && (
        <p className="text-right text-xs text-on-surface-variant">Updating live data…</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Active Routes" value={totalRoutes} sub="Active routes" subColor="text-green-600" />
        <StatCard label="Buses Available" value={buses.available} sub={`${buses.inService || 0} in service · ${buses.maintenance} in maintenance`} />
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
            <ProgressBar label="Express" value={buses.byServiceType.express} total={typeTotals.express || buses.total || 1} color="bg-green-500" />
            <ProgressBar label="Ordinary" value={buses.byServiceType.ordinary} total={typeTotals.ordinary || buses.total || 1} color="bg-blue-700" />
            <ProgressBar label="Semi-Luxury" value={buses.byServiceType.semiLuxury} total={typeTotals.semiLuxury || buses.total || 1} color="bg-yellow-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">Recent Alerts</h3>
            {urgentAlerts > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{urgentAlerts} URGENT</span>
            )}
          </div>

          {maintenance.alerts.length === 0 ? (
            <div className="rounded-xl border border-outline-variant bg-white p-4 text-sm text-on-surface-variant">No active alerts</div>
          ) : maintenance.alerts.map((alert) => {
            const styles = ALERT_STYLES[alert.severity] || ALERT_STYLES.info
            return (
            <div key={alert._id} className={`rounded-xl border p-4 ${styles.wrap}`}>
              <div className="flex items-start gap-3">
                <Icon name="warning" size={18} className={`${styles.icon} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold uppercase tracking-wide ${styles.title}`}>{alert.title}</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-900">Bus {alert.busReg}</p>
                  {alert.busStatus && (
                    <p className="mt-0.5 text-xs font-medium capitalize text-on-surface-variant">Status: {alert.busStatus.replace('-', ' ')}</p>
                  )}
                  <p className="mt-0.5 text-xs text-on-surface-variant line-clamp-2">{alert.description}</p>
                </div>
              </div>
            </div>
            )
          })}

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


