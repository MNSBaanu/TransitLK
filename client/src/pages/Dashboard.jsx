// Module: Depot Management Dashboard

import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import ScheduleTripDetailsDrawer from '../components/schedules/ScheduleTripDetailsDrawer'
import { useAuth } from '../context/AuthContext'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import api from '../services/api'
import { getStalePageData } from '../services/pagePrefetch'
import {
  formatScheduleStatusLabel,
  formatTimeRange,
  scheduleStatusClass,
} from '../utils/scheduleHelpers'

const EMPTY_DASHBOARD = {
  buses: {
    total: 0,
    available: 0,
    inService: 0,
    maintenance: 0,
    byServiceType: { express: 0, ordinary: 0, semiLuxury: 0 },
    byServiceTypeTotal: { express: 0, ordinary: 0, semiLuxury: 0 },
  },
  drivers: { total: 0, available: 0, onDuty: 0, onLeave: 0, offDuty: 0 },
  maintenance: { totalCost: 0, alerts: [], urgentCount: 0 },
  operations: [],
  totalRoutes: 0,
  tripCompletion: 0,
  vehicleUtilization: { rate: 0, busesUsed: 0, busesTotal: 0 },
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

const BUS_TYPE_BAR_COLORS = {
  express: 'bg-depot-navy',
  ordinary: 'bg-depot-blue-light',
  semiLuxury: 'bg-depot-blue-muted',
}

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex justify-between text-xs text-on-surface-variant">
        <span className="font-medium text-fleet-ink">{label}</span>
        <span className="font-semibold text-depot-navy">{value} / {total}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-fleet-muted">
        <div className={`h-2.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(() => getStalePageData('/dashboard')?.data || null)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showTripDetails, setShowTripDetails] = useState(false)

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

  const { loading, refreshing } = useFastPageLoad('/dashboard', { applyData })

  if (!loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center text-red-500 text-sm">
        Failed to load dashboard data. Make sure the server is running.
      </div>
    )
  }

  const {
    buses,
    drivers,
    maintenance,
    operations: operationsFromApi,
    ongoingOperations,
    recentSchedules,
    totalRoutes,
    tripCompletion,
    vehicleUtilization,
  } = data || EMPTY_DASHBOARD

  const operations = (operationsFromApi?.length
    ? operationsFromApi
    : ongoingOperations?.length
      ? ongoingOperations
      : recentSchedules || []
  ).map((trip) => ({
    ...trip,
    routeLabel: trip.routeLabel || trip.routeName || '—',
  }))

  const typeTotals = buses.byServiceTypeTotal || buses.byServiceType

  const tripSummaryFromRow = (trip) => ({
    _id: trip._id,
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    status: trip.status,
    routeId: {
      routeName: trip.routeName,
    },
    busId: trip.busReg ? { regNumber: trip.busReg } : null,
    driverId: trip.driverName ? { name: trip.driverName } : null,
  })

  const openTripDetails = (trip) => {
    setSelectedTrip(tripSummaryFromRow(trip))
    setShowTripDetails(true)
    api
      .get(`/schedules/${trip._id}`)
      .then(({ data: fullTrip }) => setSelectedTrip(fullTrip))
      .catch(() => {})
  }

  const closeTripDetails = () => {
    setShowTripDetails(false)
    setSelectedTrip(null)
  }

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Active Routes" value={totalRoutes} sub="Active routes" subColor="text-green-600" />
        <StatCard label="Buses Available" value={buses.available} sub={`${buses.inService || 0} in service · ${buses.maintenance} in maintenance`} />
        <StatCard label="Available Drivers" value={drivers.available} />
        <StatCard
          label="Vehicle Utilization"
          value={`${vehicleUtilization.rate}%`}
          sub={`${vehicleUtilization.busesUsed} of ${vehicleUtilization.busesTotal} buses on trips this month`}
        />
        <StatCard label="Trip Completion" value={`${tripCompletion}%`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-depot-blue-light">Bus Availability by Type</p>
            <ProgressBar label="Express" value={buses.byServiceType.express} total={typeTotals.express || buses.total || 1} color={BUS_TYPE_BAR_COLORS.express} />
            <ProgressBar label="Ordinary" value={buses.byServiceType.ordinary} total={typeTotals.ordinary || buses.total || 1} color={BUS_TYPE_BAR_COLORS.ordinary} />
            <ProgressBar label="Semi-Luxury" value={buses.byServiceType.semiLuxury} total={typeTotals.semiLuxury || buses.total || 1} color={BUS_TYPE_BAR_COLORS.semiLuxury} />
          </div>
        </div>

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

      <div className="rounded-xl border border-outline-variant bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">Today&apos;s Schedule</h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {operations.length} trip{operations.length !== 1 ? 's' : ''} · view only
            </p>
          </div>
          <Link
            to="/schedules"
            className="flex items-center gap-1 text-sm font-medium text-depot-blue-light hover:underline"
          >
            View schedules <Icon name="chevron_right" size={16} />
          </Link>
        </div>
        <div className="min-h-[24rem] max-h-[44rem] overflow-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10 bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="min-w-[12rem] px-5 py-3.5 text-left">Active route</th>
                <th className="min-w-[9rem] px-5 py-3.5 text-left">Assigned driver</th>
                <th className="min-w-[8rem] px-5 py-3.5 text-left">Assigned bus</th>
                <th className="min-w-[11rem] px-5 py-3.5 text-left">Trip window</th>
                <th className="min-w-[8rem] px-5 py-3.5 text-left">Trip status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {operations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-on-surface-variant">
                    No trips scheduled for today
                  </td>
                </tr>
              ) : (
                operations.map((trip) => (
                  <tr
                    key={trip._id}
                    tabIndex={0}
                    onClick={() => openTripDetails(trip)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openTripDetails(trip)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-surface-container/40 focus:bg-surface-container/50 focus:outline-none"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-neutral-900">{trip.routeLabel}</p>
                      {trip.routeName && trip.routeName !== trip.routeLabel ? (
                        <p className="mt-0.5 text-xs text-on-surface-variant">{trip.routeName}</p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 font-medium text-neutral-800">{trip.driverName}</td>
                    <td className="px-5 py-4 font-medium text-neutral-800">{trip.busReg}</td>
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-lg bg-depot-navy/5 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-depot-navy">
                        {formatTimeRange(trip.departureTime, trip.arrivalTime)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${scheduleStatusClass(trip.status)}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {formatScheduleStatusLabel(trip.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ScheduleTripDetailsDrawer
        open={showTripDetails}
        onClose={closeTripDetails}
        selected={selectedTrip}
        canAdjustSchedules={false}
      />
    </div>
  )
}

export default Dashboard


