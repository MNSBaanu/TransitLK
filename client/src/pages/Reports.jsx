// Assigned to: Baanu
// Module: Reporting & Analytics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import { ModuleHeader, ModuleToast } from '../components/layout/ModuleLayout'

const labelClass = 'text-[10px] font-bold uppercase tracking-wider text-fleet-ink-muted'

const REPORT_SECTIONS = [
  { id: 'trip-completion', title: 'Trip completion rate', icon: 'check_circle' },
  { id: 'route-performance', title: 'Route performance', icon: 'map' },
  { id: 'fuel-trends', title: 'Fuel consumption trend', icon: 'local_gas_station' },
]

function toInputDate(d) {
  const x = new Date(d)
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek(date) {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return d
}

function startOfMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function applyPeriodRange(period, anchor = new Date()) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  if (period === 'weekly') {
    const start = startOfWeek(anchor)
    const end = endOfWeek(anchor)
    return {
      from: toInputDate(start),
      to: toInputDate(end > today ? today : end),
    }
  }
  const start = startOfMonth(anchor)
  const end = endOfMonth(anchor)
  return {
    from: toInputDate(start),
    to: toInputDate(end > today ? today : end),
  }
}

function formatRangeLabel(from, to) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(from).toLocaleDateString('en-GB', opts)} – ${new Date(to).toLocaleDateString('en-GB', opts)}`
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

function ReportSectionHeader({ index, title, icon, periodLabel }) {
  return (
    <div className="glass-subtle flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-depot-navy/10 text-depot-navy">
          <Icon name={icon} size={22} />
        </span>
        <div>
          <p className={labelClass}>
            {periodLabel} report · Section {index}
          </p>
          <h4 className="text-base font-semibold text-fleet-ink">{title}</h4>
        </div>
      </div>
    </div>
  )
}

function MetricPill({ label, value }) {
  return (
    <div className="glass-subtle rounded-xl px-4 py-3">
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-lg font-bold text-fleet-ink">{value}</p>
    </div>
  )
}

function FuelTrendBars({ trend = [] }) {
  if (!trend.length) {
    return <p className="text-sm text-fleet-ink-muted">No fuel logs in this period.</p>
  }
  const max = Math.max(...trend.map((t) => t.liters), 1)
  return (
    <div className="flex h-48 items-end gap-2">
      {trend.map((t) => (
        <div key={t.label} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-semibold text-fleet-ink">{t.liters}L</span>
          <div
            className="w-full rounded-t-md bg-depot-blue-light"
            style={{ height: `${Math.max(12, (t.liters / max) * 100)}%` }}
          />
          <span className="text-[9px] font-bold uppercase text-fleet-ink-muted">{t.label}</span>
        </div>
      ))}
    </div>
  )
}

function Reports() {
  const printRef = useRef(null)
  const [period, setPeriod] = useState('monthly')
  const initialRange = applyPeriodRange('monthly')
  const [fromDate, setFromDate] = useState(initialRange.from)
  const [toDate, setToDate] = useState(initialRange.to)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handlePeriodChange = (p) => {
    setPeriod(p)
    const { from, to } = applyPeriodRange(p, toDate)
    setFromDate(from)
    setToDate(to)
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

  const reportParams = { from: fromDate, to: toDate, period }

  const handleCsv = async () => {
    try {
      const { data: blob } = await api.get('/reports/export/csv', {
        params: reportParams,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `transitlk-${period}-report-${fromDate}-${toDate}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV downloaded')
    } catch {
      showToast('CSV export failed')
    }
  }

  const handlePdf = async () => {
    try {
      const { data: blob } = await api.get('/reports/export/pdf', {
        params: reportParams,
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `transitlk-${period}-report-${fromDate}-${toDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      showToast('PDF downloaded')
    } catch {
      showToast('PDF export failed')
    }
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

  const periodLabel = period === 'weekly' ? 'Weekly' : 'Monthly'
  const routeRows =
    (data?.monthlySummary || []).length > 0
      ? data.monthlySummary
      : (data?.routes || []).filter((r) => r.tripCount > 0).map((r) => ({
          depotUnit: r.routeName,
          operationalHours: `${r.operationalHours} hrs`,
          incidentsLabel:
            r.delayed + r.cancelled === 0
              ? '0'
              : `${r.delayed} delayed · ${r.cancelled} cancelled`,
          tripCount: r.tripCount,
          completionRate: r.completionRate,
          fuelLiters: 0,
          status:
            r.completionRate >= 85 && r.delayed < 2
              ? 'OPTIMAL'
              : r.completionRate >= 70
                ? 'STABLE'
                : 'AT RISK',
        }))

  if (loading && !data) {
    return (
      <div className="glass-card flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-fleet-ink-muted">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div ref={printRef} className="reports-print relative w-full space-y-6">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-depot-blue-light/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-32 h-48 w-48 rounded-full bg-depot-navy/10 blur-3xl" />

      <ModuleToast message={toast} />

      <ModuleHeader
        title="Reporting & Analytics"
        subtitle="Trip completion, route performance, and fuel trends from live operations data"
        action={
          <div className="glass-panel flex flex-wrap items-center gap-3 p-2">
            <div>
              <p className={`${labelClass} mb-1 px-1`}>Report period</p>
              <div className="pro-segmented">
                {['weekly', 'monthly'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodChange(p)}
                    className={`rounded-md px-4 py-1.5 text-sm capitalize transition-colors ${
                      period === p ? 'pro-segmented-active' : 'text-fleet-ink-muted hover:text-fleet-ink'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
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
              CSV
            </button>
            <button type="button" onClick={handlePdf} className="btn-primary flex items-center gap-1.5">
              <Icon name="picture_as_pdf" size={18} />
              PDF
            </button>
          </div>
        }
      />

      {error && (
        <div className="glass-card border-red-200/60 bg-red-50/70 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
            <Icon name="insights" size={20} className="text-depot-navy" />
            <div>
              <p className="text-sm font-semibold text-fleet-ink">
                {periodLabel} operations report
              </p>
              <p className="text-xs text-fleet-ink-muted">{formatRangeLabel(fromDate, toDate)}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {REPORT_SECTIONS.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full border border-white/40 bg-white/30 px-3 py-1 text-[10px] font-bold text-fleet-ink-muted backdrop-blur-sm"
                >
                  {s.title}
                </span>
              ))}
            </div>
          </div>

          {!data.hasData && (
            <div className="glass-card px-4 py-3 text-sm text-fleet-ink-muted">
              No data for this {period} range. Add schedules and fuel logs, or change the report period.
            </div>
          )}

          {/* 1 — Trip completion rate */}
          <section className="glass-card relative overflow-hidden">
            <ReportSectionHeader
              index={1}
              title={REPORT_SECTIONS[0].title}
              icon={REPORT_SECTIONS[0].icon}
              periodLabel={periodLabel}
            />
            <div className="grid gap-4 p-6 md:grid-cols-4">
              <MetricPill label="Completion rate" value={`${data.tripCompletion.rate}%`} />
              <MetricPill label="Completed" value={String(data.summary?.completedTrips ?? 0)} />
              <MetricPill label="Delayed" value={String(data.summary?.delayedTrips ?? 0)} />
              <MetricPill label="Cancelled" value={String(data.summary?.cancelledTrips ?? 0)} />
            </div>
            <div className="border-t border-white/40 px-6 pb-6">
              <div className="mb-3 flex items-center justify-between">
                <p className={labelClass}>
                  {period === 'weekly' ? 'Daily breakdown' : 'Weekly breakdown'}
                </p>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-fleet-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-depot-navy" />
                    Actual
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-fleet-line" />
                    Scheduled
                  </span>
                </div>
              </div>
              <div className="flex h-64 items-end gap-3">
                {(data.weeklyCompletion || []).length === 0 ? (
                  <p className="w-full text-center text-sm text-fleet-ink-muted">No schedule data.</p>
                ) : (
                  data.weeklyCompletion.map((w) => (
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
                  ))
                )}
              </div>
            </div>
          </section>

          {/* 2 — Route performance */}
          <section className="glass-card overflow-hidden">
            <ReportSectionHeader
              index={2}
              title={REPORT_SECTIONS[1].title}
              icon={REPORT_SECTIONS[1].icon}
              periodLabel={periodLabel}
            />
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <MetricPill label="Routes tracked" value={String(data.summary?.totalRoutes ?? 0)} />
              <MetricPill
                label="Active routes"
                value={String(data.summary?.activeRoutes ?? 0)}
              />
              <MetricPill
                label="At risk"
                value={String(routeRows.filter((r) => r.status === 'AT RISK').length)}
              />
            </div>
            <div className="overflow-x-auto border-t border-white/40">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="glass-table-head text-left">
                    {['Route', 'Trips', 'Completion', 'Hours', 'Incidents', 'Status'].map((h) => (
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
                  {routeRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-fleet-ink-muted">
                        No route activity for this {period} report.
                      </td>
                    </tr>
                  ) : (
                    routeRows.map((row) => (
                      <tr
                        key={row.depotUnit}
                        className="border-b border-white/30 transition-colors last:border-0 hover:bg-white/25"
                      >
                        <td className="px-6 py-4 font-semibold text-fleet-ink">{row.depotUnit}</td>
                        <td className="px-6 py-4 tabular-nums">{row.tripCount ?? 0}</td>
                        <td className="px-6 py-4 font-semibold">{row.completionRate ?? 0}%</td>
                        <td className="px-6 py-4 font-mono text-sm text-fleet-ink-muted">
                          {row.operationalHours}
                        </td>
                        <td className="px-6 py-4 text-fleet-ink-muted">{row.incidentsLabel}</td>
                        <td className="px-6 py-4 text-right">{statusBadge(row.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 — Fuel consumption trend */}
          <section className="glass-card overflow-hidden">
            <ReportSectionHeader
              index={3}
              title={REPORT_SECTIONS[2].title}
              icon={REPORT_SECTIONS[2].icon}
              periodLabel={periodLabel}
            />
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <MetricPill label="Total liters" value={`${data.fuel?.totalLiters ?? 0} L`} />
              <MetricPill
                label="Total cost"
                value={`LKR ${(data.fuel?.totalCost ?? 0).toLocaleString()}`}
              />
              <MetricPill
                label="Fuel entries"
                value={String(data.recordCounts?.fuelLogs ?? 0)}
              />
            </div>
            <div className="grid gap-6 border-t border-white/40 p-6 lg:grid-cols-2">
              <div>
                <p className={`${labelClass} mb-3`}>
                  {period === 'weekly' ? 'Daily consumption' : 'Weekly consumption'}
                </p>
                <FuelTrendBars trend={data.fuel?.trend} />
              </div>
              <div>
                <p className={`${labelClass} mb-3`}>By route</p>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  <div className="relative mx-auto h-36 w-36 shrink-0 sm:mx-0">
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
                      <span className="text-base font-bold text-fleet-ink">
                        {data.fuel?.totalLiters ?? 0}
                      </span>
                      <span className={labelClass}>Total L</span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {(data.fuel?.byRoute || []).length === 0 ? (
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
                              style={{ backgroundColor: fuelSegments[i]?.color || '#1e3a8a' }}
                            />
                            <span className="text-sm text-fleet-ink">{r.routeName}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            {r.liters} L
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={loadReports}
              className="flex items-center gap-1 text-sm font-semibold text-depot-navy hover:text-depot-blue-light"
            >
              Refresh report
              <Icon name="arrow_forward" size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
