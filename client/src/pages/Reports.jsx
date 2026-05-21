// Assigned to: Baanu
// Module: Reporting & Analytics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import { ModuleHeader, ModuleToast } from '../components/layout/ModuleLayout'

const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-on-surface-variant'

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
    OPTIMAL: 'bg-emerald-100 text-emerald-800',
    STABLE: 'bg-amber-100 text-amber-800',
    'AT RISK': 'bg-red-100 text-red-800',
  }
  const dot = {
    OPTIMAL: 'bg-emerald-600',
    STABLE: 'bg-amber-600',
    'AT RISK': 'bg-red-600',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${map[status] || map.STABLE}`}
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
    const colors = ['#000249', '#464650', '#7a0016', '#777681', '#94a3b8']
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
      <div className="flex min-h-[320px] items-center justify-center text-on-surface-variant">
        Loading analytics...
      </div>
    )
  }

  return (
    <div ref={printRef} className="reports-print w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="Reporting & Analytics"
        subtitle="Enterprise performance oversight and sustainability tracking."
        action={
        <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-2 rounded-lg border border-fleet-line bg-fleet-surface px-3 py-2 shadow-xs">
            <Icon name="calendar_today" size={18} className="text-outline" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border-none bg-transparent text-sm outline-none"
            />
            <span className="text-on-surface-variant">–</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border-none bg-transparent text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleCsv}
            className="btn-outlined flex items-center gap-1.5"
          >
            <Icon name="download" size={18} />
            Download CSV
          </button>
          <button type="button" onClick={handlePdf} className="btn-primary flex items-center gap-1.5">
            <Icon name="picture_as_pdf" size={18} />
            Export PDF Report
          </button>
        </div>
        }
      />

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <p className="mb-6 text-sm text-on-surface-variant">
            Period: {formatRangeLabel(fromDate, toDate)} · {data.totals?.activeTrips ?? 0} active
            trips across {data.totals?.routes ?? 0} routes
          </p>

          {/* Bento grid */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {/* Sustainability — depot navy */}
            <div className="relative col-span-1 flex flex-col justify-between overflow-hidden rounded-xl bg-[#000249] p-6 text-white lg:col-span-2">
              <div className="relative z-10">
                <div className="mb-6 flex items-center justify-between">
                  <span className={`${labelClass} text-white/70`}>Sustainability insights</span>
                  <span className="rounded-full bg-white/10 p-2">
                    <Icon name="eco" size={22} className="text-white" />
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline gap-8">
                  <div>
                    <h3 className="text-3xl font-bold leading-tight">
                      {data.sustainability.co2SavedTons} Tons
                    </h3>
                    <p className="mt-1 text-sm text-white/80">Estimated CO₂ saved this period</p>
                  </div>
                  <div className="border-l border-white/20 pl-8">
                    <h3 className="text-xl font-bold">{data.sustainability.electricEfficiencyPct}%</h3>
                    <p className="mt-1 text-sm text-white/80">On-time / completed efficiency</p>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm font-medium text-white/80">
                  ↑ {data.sustainability.fleetImpactPct}% operational impact
                </span>
                <button type="button" className="text-sm font-medium text-white underline">
                  Full environmental report
                </button>
              </div>
              <div className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
            </div>

            {/* Trip completion */}
            <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <div>
                <span className={labelClass}>Trip completion rate</span>
                <h3 className="mt-2 text-xl font-bold text-neutral-900">
                  {data.tripCompletion.rate}%
                </h3>
              </div>
              <div className="mt-4 flex h-16 items-end gap-1">
                {(data.tripCompletion.miniBars || [40, 60, 55, 75, 90, 100]).map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${
                      i === (data.tripCompletion.miniBars?.length || 6) - 1
                        ? 'bg-[#000249]'
                        : 'bg-[#000249]/20'
                    }`}
                    style={{ height: `${Math.max(12, h)}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Active drivers */}
            <div className="flex flex-col justify-between rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <div>
                <span className={labelClass}>Active drivers</span>
                <h3 className="mt-2 text-xl font-bold text-neutral-900">{data.drivers.active}</h3>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface-container text-[10px] font-bold text-neutral-600"
                    >
                      <Icon name="person" size={16} />
                    </div>
                  ))}
                  {data.drivers.total > 3 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-surface-container text-[10px] font-bold text-neutral-600">
                      +{data.drivers.total - 3}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-on-surface-variant">
                  {data.drivers.onDutyPct}% on duty
                </span>
              </div>
            </div>

            {/* Weekly completion chart */}
            <div className="col-span-1 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm md:col-span-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
                <h4 className="text-base font-semibold text-neutral-900">Trip completion rates</h4>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-[#000249]" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-outline-variant" />
                    Planned
                  </span>
                </div>
              </div>
              <div className="flex h-64 items-end gap-3 p-6">
                {data.weeklyCompletion.map((w) => (
                  <div key={w.label} className="group flex h-full flex-1 flex-col justify-end gap-1">
                    <div
                      className="w-full rounded-t-sm bg-outline-variant/30"
                      style={{ height: `${w.planned}%` }}
                    />
                    <div
                      className="w-full rounded-t-sm bg-[#000249] transition-colors group-hover:bg-[#000249]/80"
                      style={{ height: `${w.actual}%` }}
                    />
                    <span className="mt-1 text-center text-[10px] font-bold uppercase text-on-surface-variant">
                      {w.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fuel trends */}
            <div className="col-span-1 rounded-xl border border-outline-variant bg-white shadow-sm md:col-span-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
                <h4 className="text-base font-semibold text-neutral-900">Fuel consumption trends</h4>
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
                      stroke="#f1f5f9"
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{data.fuel.totalLiters}</span>
                    <span className={labelClass}>Total L</span>
                  </div>
                </div>
                <div className="flex w-full flex-1 flex-col gap-3">
                  {data.fuel.byRoute.length === 0 ? (
                    <p className="text-sm text-on-surface-variant">No fuel logs in this period.</p>
                  ) : (
                    data.fuel.byRoute.map((r, i) => (
                      <div key={r.routeName} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                fuelSegments[i]?.color || '#000249',
                            }}
                          />
                          <span className="text-sm">{r.routeName}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {r.liters} L
                          {r.litersPerKm !== '—' ? ` · ${r.litersPerKm} L/km` : ''}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Monthly performance table */}
            <div className="col-span-1 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm md:col-span-3 lg:col-span-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-6 py-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-semibold text-neutral-900">
                    Monthly performance summary
                  </h4>
                  <span className="rounded bg-surface-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Management view
                  </span>
                </div>
                <button
                  type="button"
                  onClick={loadReports}
                  className="flex items-center gap-1 text-sm font-semibold text-[#000249] hover:underline"
                >
                  Refresh data
                  <Icon name="arrow_forward" size={16} />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-container text-left">
                      {[
                        'Route / unit',
                        'Operational hours',
                        'Incidents',
                        'Revenue impact',
                        'Status',
                      ].map((h) => (
                        <th
                          key={h}
                          className={`border-b border-outline-variant px-6 py-2 ${labelClass} ${
                            h === 'Status' ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {data.monthlySummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant">
                          No schedule data for this period. Add routes and schedules first.
                        </td>
                      </tr>
                    ) : (
                      data.monthlySummary.map((row) => (
                        <tr key={row.depotUnit} className="transition-colors hover:bg-surface-container/50">
                          <td className="px-6 py-4 font-semibold text-neutral-900">
                            {row.depotUnit}
                          </td>
                          <td className="px-6 py-4 font-mono text-sm text-on-surface-variant">
                            {row.operationalHours}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant">
                            {row.incidentsLabel}
                          </td>
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
