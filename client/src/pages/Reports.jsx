// Assigned to: Baanu
// Module: Reporting & Analytics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import { ModuleHeader, ModuleToast } from '../components/layout/ModuleLayout'

const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-fleet-ink-muted'

function toInputDate(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatRangeLabel(from, to) {
  const a = new Date(from)
  const b = new Date(to)
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${a.toLocaleDateString('en-GB', opts)} – ${b.toLocaleDateString('en-GB', opts)}`
}

function statusBadge(status) {
  const map = {
    OPTIMAL: 'bg-emerald-500/15 text-emerald-800 backdrop-blur-sm',
    STABLE: 'bg-amber-500/15 text-amber-900 backdrop-blur-sm',
    'AT RISK': 'bg-red-500/15 text-red-800 backdrop-blur-sm',
  }
  const dot = {
    OPTIMAL: 'bg-emerald-600',
    STABLE: 'bg-amber-600',
    'AT RISK': 'bg-red-600',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${map[status] || map.STABLE}`}
    >
      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dot[status] || dot.STABLE}`} />
      {status}
    </span>
  )
}

function Reports() {
  const printRef = useRef(null)
  const [period, setPeriod] = useState('monthly')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [toDate, setToDate] = useState(() => toInputDate(new Date()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/reports/dashboard', {
        params: { from: fromDate, to: toDate, period },
      })
      setData(res)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, period])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleCsv = async () => {
    try {
      const { data: blob } = await api.get('/reports/export/csv', {
        params: { from: fromDate, to: toDate },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `transitlk-report-${fromDate}-${toDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV downloaded')
    } catch {
      showToast('CSV export failed')
    }
  }

  const handlePdf = () => {
    window.print()
    showToast('Use print dialog to save as PDF')
  }

  const fuelSegments = useMemo(() => {
    if (!data?.fuel?.byRoute?.length) return []
    const total = data.fuel.byRoute.reduce((s, r) => s + r.liters, 0) || 1
    const colors = ['#1e3a8a', '#4a6fd4', '#93b4f5', '#777681', '#94a3b8']
    let offset = 0
    const circumference = 2 * Math.PI * 40
    return data.fuel.byRoute.map((r, i) => {
      const pct = r.liters / total
      const dash = pct * circumference
      const seg = { dash, offset, color: colors[i % colors.length], ...r }
      offset += dash
      return seg
    })
  }, [data])

  if (loading && !data) {
    return (
      <div className="glass-card flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-fleet-ink-muted">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div ref={printRef} className="reports-print relative w-full">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-depot-blue-light/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 h-48 w-48 rounded-full bg-depot-navy/10 blur-3xl" />

      <ModuleToast message={toast} />

      <ModuleHeader
        title="Reporting & Analytics"
        subtitle="Enterprise performance oversight and sustainability tracking."
        action={
          <div className="glass-panel flex flex-wrap items-center gap-2 p-2">
            <div className="pro-segmented mr-1">
              {['monthly', 'weekly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-4 py-1.5 text-sm capitalize transition-colors ${
                    period === p ? 'pro-segmented-active' : 'text-fleet-ink-muted hover:text-fleet-ink'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="glass-subtle flex items-center gap-2 rounded-lg px-3 py-2">
              <Icon name="calendar_today" size={18} className="text-fleet-ink-muted" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border-none bg-transparent text-sm outline-none"
              />
              <span className="text-fleet-ink-muted">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border-none bg-transparent text-sm outline-none"
              />
            </div>
            <button type="button" onClick={handleCsv} className="btn-outlined flex items-center gap-1.5">
              <Icon name="download" size={18} />
              Download CSV
            </button>
            <button type="button" onClick={handlePdf} className="btn-primary flex items-center gap-1.5">
              <Icon name="picture_as_pdf" size={18} />
              Export PDF
            </button>
          </div>
        }
      />

      {error && (
        <div className="glass-card mb-6 border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="glass-panel mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-fleet-ink-muted">
            <Icon name="insights" size={18} className="text-depot-navy" />
            <span>
              <span className="font-semibold text-fleet-ink">{formatRangeLabel(fromDate, toDate)}</span>
              {' · '}
              {data.totals?.activeTrips ?? 0} active trips · {data.totals?.routes ?? 0} routes
            </span>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Sustainability hero */}
            <div className="glass-dark relative col-span-1 flex flex-col justify-between overflow-hidden rounded-2xl p-6 text-white lg:col-span-2">
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <span className={`${labelClass} text-white/70`}>Sustainability insights</span>
                  <span className="rounded-full border border-white/20 bg-white/10 p-2 backdrop-blur-sm">
                    <Icon name="eco" size={22} className="text-white" />
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-8">
                  <div>
                    <h3 className="text-3xl font-bold leading-tight tracking-tight">
                      {data.sustainability.co2SavedTons} Tons
                    </h3>
                    <p className="mt-1 text-sm text-white/75">Estimated CO₂ saved this period</p>
                  </div>
                  <div className="border-l border-white/20 pl-8">
                    <h3 className="text-xl font-bold">{data.sustainability.electricEfficiencyPct}%</h3>
                    <p className="mt-1 text-sm text-white/75">On-time / completed efficiency</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-white/15 pt-4">
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white/90 backdrop-blur-sm">
                  ↑ {data.sustainability.fleetImpactPct}% operational impact
                </span>
                <button
                  type="button"
                  className="text-sm font-medium text-white/90 underline-offset-2 hover:text-white hover:underline"
                >
                  Full environmental report
                </button>
              </div>
              <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-depot-blue-light/30 blur-3xl" />
              <div className="pointer-events-none absolute -left-8 top-1/2 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            </div>

            {/* Trip completion */}
            <div className="glass-card flex flex-col justify-between p-6 transition-shadow hover:shadow-lg">
              <div>
                <span className={labelClass}>Trip completion rate</span>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-fleet-ink">
                  {data.tripCompletion.rate}%
                </h3>
              </div>
              <div className="mt-4 flex h-16 items-end gap-1">
                {(data.tripCompletion.miniBars || [40, 60, 55, 75, 90, 100]).map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-md transition-all ${
                      i === (data.tripCompletion.miniBars?.length || 6) - 1
                        ? 'bg-depot-navy'
                        : 'bg-depot-navy/25'
                    }`}
                    style={{ height: `${Math.max(12, h)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Active drivers */}
            <div className="glass-card flex flex-col justify-between p-6 transition-shadow hover:shadow-lg">
              <div>
                <span className={labelClass}>Active drivers</span>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-fleet-ink">
                  {data.drivers.active}
                </h3>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-fleet-ink-muted"
                    >
                      <Icon name="person" size={16} />
                    </div>
                  ))}
                  {data.drivers.total > 3 && (
                    <div className="glass-subtle flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-fleet-ink">
                      +{data.drivers.total - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-fleet-ink-muted">
                  {data.drivers.onDutyPct}% on duty
                </span>
              </div>
            </div>

            {/* Weekly completion chart */}
            <div className="glass-card col-span-1 overflow-hidden md:col-span-3 lg:col-span-2">
              <div className="glass-subtle flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-6 py-4">
                <h4 className="text-base font-semibold text-fleet-ink">Trip completion rates</h4>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-fleet-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-depot-navy" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-fleet-line" />
                    Planned
                  </span>
                </div>
              </div>
              <div className="flex h-64 items-end gap-3 p-6">
                {data.weeklyCompletion.map((w) => (
                  <div key={w.label} className="group flex h-full flex-1 flex-col justify-end gap-1">
                    <div
                      className="w-full rounded-t-md bg-fleet-line/50"
                      style={{ height: `${w.planned}%` }}
                    />
                    <div
                      className="w-full rounded-t-md bg-depot-navy transition-all group-hover:bg-depot-blue-light"
                      style={{ height: `${w.actual}%` }}
                    />
                    <span className="mt-1 text-center text-[10px] font-bold uppercase text-fleet-ink-muted">
                      {w.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fuel trends */}
            <div className="glass-card col-span-1 md:col-span-3 lg:col-span-2">
              <div className="glass-subtle flex items-center justify-between border-b border-white/50 px-6 py-4">
                <h4 className="text-base font-semibold text-fleet-ink">Fuel consumption trends</h4>
                <span className={labelClass}>Liters per route</span>
              </div>
              <div className="flex h-64 flex-col items-center gap-6 p-6 sm:flex-row sm:items-center">
                <div className="relative h-40 w-40 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="rgb(255 255 255 / 0.5)"
                      strokeWidth="12"
                    />
                    {fuelSegments.map((seg, i) => (
                      <circle
                        key={i}
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={`${seg.dash} ${251.2}`}
                        strokeDashoffset={-seg.offset}
                      />
                    ))}
                  </svg>
                  <div className="glass-subtle absolute inset-4 flex flex-col items-center justify-center rounded-full">
                    <span className="text-lg font-bold text-fleet-ink">{data.fuel.totalLiters}</span>
                    <span className={labelClass}>Total L</span>
                  </div>
                </div>
                <div className="flex w-full flex-1 flex-col gap-3">
                  {data.fuel.byRoute.length === 0 ? (
                    <p className="text-sm text-fleet-ink-muted">No fuel logs in this period.</p>
                  ) : (
                    data.fuel.byRoute.map((r, i) => (
                      <div
                        key={r.routeName}
                        className="glass-subtle flex items-center justify-between rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: fuelSegments[i]?.color || '#1e3a8a',
                            }}
                          />
                          <span className="text-sm text-fleet-ink">{r.routeName}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-fleet-ink">
                          {r.liters} L
                          {r.litersPerKm !== '—' ? ` · ${r.litersPerKm} L/km` : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Performance table */}
            <div className="glass-card col-span-1 overflow-hidden md:col-span-3 lg:col-span-4">
              <div className="glass-subtle flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-6 py-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-semibold text-fleet-ink">Monthly performance summary</h4>
                  <span className="rounded-full border border-white/40 bg-white/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fleet-ink-muted backdrop-blur-sm">
                    Management view
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadReports}
                  className="flex items-center gap-1 text-sm font-semibold text-depot-navy hover:text-depot-blue-light"
                >
                  Refresh data
                  <Icon name="arrow_forward" size={16} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="glass-table-head text-left">
                      {[
                        'Route / unit',
                        'Operational hours',
                        'Incidents',
                        'Revenue impact',
                        'Status',
                      ].map((h) => (
                        <th
                          key={h}
                          className={`border-b border-white/40 px-6 py-3 ${labelClass} ${
                            h === 'Status' ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-fleet-ink-muted">
                          No schedule data for this period. Add routes and schedules first.
                        </td>
                      </tr>
                    ) : (
                      data.monthlySummary.map((row) => (
                        <tr
                          key={row.depotUnit}
                          className="border-b border-white/30 transition-colors last:border-0 hover:bg-white/25"
                        >
                          <td className="px-6 py-4 font-semibold text-fleet-ink">{row.depotUnit}</td>
                          <td className="px-6 py-4 font-mono text-sm text-fleet-ink-muted">
                            {row.operationalHours}
                          </td>
                          <td className="px-6 py-4 text-fleet-ink-muted">{row.incidentsLabel}</td>
                          <td
                            className={`px-6 py-4 font-mono text-sm ${
                              row.revenueImpact.startsWith('+')
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }`}
                          >
                            {row.revenueImpact}
                          </td>
                          <td className="px-6 py-4 text-right">{statusBadge(row.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
