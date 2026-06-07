// Assigned to: Irfa
// Module: Fuel & Maintenance Log

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import api from '../services/api'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import FieldError from '../components/FieldError'
import { ModuleHeader, ModulePrimaryButton, ModuleSecondaryButton } from '../components/layout/ModuleLayout'
import {
  fieldBorderClass,
  hasErrors,
  validateDateRange,
  validateFuelForm,
  validateMaintenanceForm,
} from '../utils/formValidation'
import { applyReportPeriodRange } from '../utils/scheduleHelpers'

const ITEMS_PER_PAGE = 8

const SERVICE_TYPE_STYLES = {
  'Oil Change':    { dot: 'bg-blue-500',   text: 'text-blue-700' },
  'Brake Check':   { dot: 'bg-red-500',    text: 'text-red-700' },
  'Fueling':       { dot: 'bg-yellow-500', text: 'text-yellow-700' },
  'Inspection':    { dot: 'bg-green-500',  text: 'text-green-700' },
  'Repair':        { dot: 'bg-orange-500', text: 'text-orange-700' },
  'Transmission':  { dot: 'bg-purple-500', text: 'text-purple-700' },
}

function serviceStyle(type) {
  return SERVICE_TYPE_STYLES[type] || { dot: 'bg-gray-400', text: 'text-gray-600' }
}

// ── Maintenance Modal ─────────────────────────────────────────────────────────
function MaintenanceModal({ record, onClose, onSave, preSelectedBusId }) {
  const [form, setForm] = useState(
    record
      ? { bus_id: record.bus_id?._id || record.bus_id, service_date: record.service_date?.slice(0, 10), description: record.description, cost: record.cost }
      : { bus_id: preSelectedBusId || '', service_date: new Date().toISOString().slice(0, 10), description: '', cost: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Update form when preSelectedBusId changes
  useEffect(() => {
    if (preSelectedBusId && !record) {
      setForm(prev => ({ ...prev, bus_id: preSelectedBusId }))
    }
  }, [preSelectedBusId, record])

  const handle = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errors = validateMaintenanceForm(form)
    setFieldErrors(errors)
    if (hasErrors(errors)) return

    setSaving(true)
    setError('')
    try {
      if (record) {
        await api.put(`/maintenance/${record._id}`, form)
      } else {
        await api.post('/maintenance', form)
        // Update bus status to maintenance and update maintenance dates
        if (form.bus_id) {
          await api.put(`/buses/${form.bus_id}`, {
            status: 'maintenance',
            lastMaintenanceDate: form.service_date,
            nextMaintenanceDate: new Date(new Date(form.service_date).getTime() + 28 * 24 * 60 * 60 * 1000).toISOString()
          })
        }
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">{record ? 'Edit Maintenance Log' : 'Log Maintenance'}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Bus ID (MongoDB _id)</label>
            <input name="bus_id" value={form.bus_id} onChange={handle} required placeholder="Enter bus _id"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.bus_id)}`} />
            <FieldError message={fieldErrors.bus_id} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Service Date</label>
            <input name="service_date" type="date" value={form.service_date} onChange={handle} required
              max={new Date().toISOString().slice(0, 10)}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.service_date)}`} />
            <FieldError message={fieldErrors.service_date} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description / Service Type</label>
            <input name="description" value={form.description} onChange={handle} required minLength={3}
              placeholder="e.g. Oil Change, Brake Check"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.description)}`} />
            <FieldError message={fieldErrors.description} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Cost (LKR)</label>
            <input name="cost" type="number" min="0.01" step="0.01" value={form.cost} onChange={handle} required
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.cost)}`} />
            <FieldError message={fieldErrors.cost} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Fuel Modal ────────────────────────────────────────────────────────────────
function FuelModal({ record, onClose, onSave }) {
  const [form, setForm] = useState(
    record
      ? { bus_id: record.bus_id?._id || record.bus_id, fuel_date: record.fuel_date?.slice(0, 10), liters: record.liters, amount: record.amount }
      : { bus_id: '', fuel_date: '', liters: '', amount: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handle = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errors = validateFuelForm(form)
    setFieldErrors(errors)
    if (hasErrors(errors)) return

    setSaving(true)
    setError('')
    try {
      if (record) {
        await api.put(`/fuel/${record._id}`, form)
      } else {
        await api.post('/fuel', form)
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">{record ? 'Edit Fuel Log' : 'Log Fuel Entry'}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Bus ID (MongoDB _id)</label>
            <input name="bus_id" value={form.bus_id} onChange={handle} required placeholder="Enter bus _id"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.bus_id)}`} />
            <FieldError message={fieldErrors.bus_id} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Fuel Date</label>
            <input name="fuel_date" type="date" value={form.fuel_date} onChange={handle} required
              max={new Date().toISOString().slice(0, 10)}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.fuel_date)}`} />
            <FieldError message={fieldErrors.fuel_date} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Liters</label>
              <input name="liters" type="number" min="0.1" step="0.1" value={form.liters} onChange={handle} required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.liters)}`} />
              <FieldError message={fieldErrors.liters} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Amount (LKR)</label>
              <input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={handle} required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.amount)}`} />
              <FieldError message={fieldErrors.amount} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Log Activity Modal (choose type) ─────────────────────────────────────────
function LogActivityModal({ onClose, onSave }) {
  const [type, setType] = useState('maintenance')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">Log New Activity</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-on-surface-variant">What type of activity would you like to log?</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setType('maintenance')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${type === 'maintenance' ? 'border-neutral-900 bg-neutral-50' : 'border-outline-variant hover:bg-surface-container'}`}>
            <Icon name="build" size={24} className="mb-2 text-neutral-700" />
            <p className="text-sm font-semibold text-neutral-900">Maintenance</p>
            <p className="text-xs text-on-surface-variant">Service, repair, inspection</p>
          </button>
          <button onClick={() => setType('fuel')}
            className={`rounded-xl border-2 p-4 text-left transition-all ${type === 'fuel' ? 'border-neutral-900 bg-neutral-50' : 'border-outline-variant hover:bg-surface-container'}`}>
            <Icon name="local_gas_station" size={24} className="mb-2 text-neutral-700" />
            <p className="text-sm font-semibold text-neutral-900">Fuel</p>
            <p className="text-xs text-on-surface-variant">Refuelling log entry</p>
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container">
            Cancel
          </button>
          <button onClick={() => onSave(type)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Summary Report Tab ────────────────────────────────────────────────────────
const INSIGHT_STYLES = {
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-green-200 bg-green-50 text-green-900',
}

function TrendBars({ items, valueKey, colorClass = 'bg-neutral-900' }) {
  const max = Math.max(...items.map((i) => i[valueKey] || 0), 1)
  return (
    <div className="flex items-end gap-2 h-24">
      {items.map((item, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t ${colorClass} opacity-80`}
              style={{ height: `${Math.max(4, ((item[valueKey] || 0) / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-on-surface-variant">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function buildReportCsv(report, from, to, period) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['Fuel & Maintenance Summary Report'],
    ['Period', period],
    ['From', from],
    ['To', to],
    [],
    ['Combined'],
    ['Total operational cost (LKR)', report.combined.totalOperationalCost],
    ['Fuel share (%)', report.combined.fuelSharePct],
    ['Maintenance share (%)', report.combined.maintenanceSharePct],
    [],
    ['Fuel summary'],
    ['Total liters', report.fuel.totalLiters],
    ['Total cost (LKR)', report.fuel.totalCost],
    ['Entries', report.fuel.totalEntries],
    ['Avg liters per entry', report.fuel.avgLitersPerEntry],
    ['Avg cost per liter (LKR)', report.fuel.avgCostPerLiter],
    [],
    ['Fuel by vehicle', 'Reg', 'Liters', 'Cost (LKR)', 'Entries', 'Avg L/entry'],
    ...report.fuel.byVehicle.map((v) => ['', v.regNumber, v.liters, v.amount, v.entries, v.avgLitersPerEntry]),
    [],
    ['Maintenance summary'],
    ['Total cost (LKR)', report.maintenance.totalCost],
    ['Entries', report.maintenance.totalEntries],
    ['Vehicles serviced', report.maintenance.vehiclesServiced],
    [],
    ['Maintenance by service type', 'Type', 'Count', 'Cost (LKR)'],
    ...report.maintenance.byServiceType.map((r) => ['', r.type, r.count, r.cost]),
    [],
    ['Maintenance by vehicle', 'Reg', 'Cost (LKR)', 'Entries'],
    ...report.maintenance.byVehicle.map((v) => ['', v.regNumber, v.cost, v.entries]),
    [],
    ['Insights'],
    ...report.insights.map((i) => [i.type, i.text]),
  ]
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

function SummaryReportPanel({ formatCurrency }) {
  const initialRange = applyReportPeriodRange('monthly')
  const [period, setPeriod] = useState('monthly')
  const [fromDate, setFromDate] = useState(initialRange.from)
  const [toDate, setToDate] = useState(initialRange.to)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [error, setError] = useState('')
  const [dateRangeError, setDateRangeError] = useState('')

  const loadReport = useCallback(async () => {
    const rangeErrors = validateDateRange(fromDate, toDate)
    if (hasErrors(rangeErrors)) {
      setDateRangeError(rangeErrors.toDate || rangeErrors.fromDate)
      setReport(null)
      setLoading(false)
      return
    }
    setDateRangeError('')
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/maintenance/report', {
        params: { from: fromDate, to: toDate, period },
      })
      setReport(data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load summary report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, period])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handlePeriodChange = (p) => {
    setPeriod(p)
    const { from, to } = applyReportPeriodRange(p, fromDate)
    setFromDate(from)
    setToDate(to)
  }

  const handleExportCsv = () => {
    if (!report) return
    const csv = buildReportCsv(report, fromDate, toDate, period)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fuel-maintenance-summary-${fromDate}-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = async () => {
    const rangeErrors = validateDateRange(fromDate, toDate)
    if (hasErrors(rangeErrors)) {
      setDateRangeError(rangeErrors.toDate || rangeErrors.fromDate)
      return
    }
    setExportingPdf(true)
    try {
      const { data: blob } = await api.get('/maintenance/report/pdf', {
        params: { from: fromDate, to: toDate, period },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `fuel-maintenance-summary-${fromDate}-${toDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('PDF export failed')
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs font-medium text-on-surface-variant">Report period</p>
            <div className="flex rounded-lg border border-outline-variant p-0.5">
              {['weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                    period === p ? 'bg-neutral-900 text-white' : 'text-on-surface-variant hover:text-neutral-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-on-surface-variant">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModuleSecondaryButton icon="download" onClick={handleExportCsv} disabled={!report}>
            Export CSV
          </ModuleSecondaryButton>
          <ModuleSecondaryButton icon="picture_as_pdf" onClick={handleExportPdf} disabled={exportingPdf}>
            {exportingPdf ? 'Downloading...' : 'Download PDF'}
          </ModuleSecondaryButton>
        </div>
      </div>

      {dateRangeError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{dateRangeError}</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {loading && !report ? (
        <p className="py-12 text-center text-sm text-on-surface-variant">Loading summary report...</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total spend</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{formatCurrency(report.combined.totalOperationalCost)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">Fuel + maintenance</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Fuel</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{formatCurrency(report.fuel.totalCost)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{report.fuel.totalLiters} L · {report.combined.fuelSharePct}% share</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Maintenance</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{formatCurrency(report.maintenance.totalCost)}</p>
              <p className="mt-1 text-xs text-on-surface-variant">{report.maintenance.totalEntries} records · {report.combined.maintenanceSharePct}% share</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Eco alerts</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{report.combined.highFuelVehicleCount}</p>
              <p className="mt-1 text-xs text-on-surface-variant">High-fuel vehicles</p>
            </div>
          </div>

          {report.insights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-neutral-900">Cost & efficiency insights</h4>
              {report.insights.map((insight, i) => (
                <div
                  key={i}
                  className={`rounded-lg border px-4 py-3 text-sm ${INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info}`}
                >
                  {insight.text}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-outline-variant p-4">
              <h4 className="mb-3 text-sm font-semibold text-neutral-900">Fuel trend</h4>
              {report.fuel.trend.some((t) => t.liters > 0) ? (
                <TrendBars items={report.fuel.trend} valueKey="liters" colorClass="bg-yellow-500" />
              ) : (
                <p className="py-6 text-center text-sm text-on-surface-variant">No fuel data in range</p>
              )}
            </div>
            <div className="rounded-xl border border-outline-variant p-4">
              <h4 className="mb-3 text-sm font-semibold text-neutral-900">Maintenance trend</h4>
              {report.maintenance.trend.some((t) => t.cost > 0) ? (
                <TrendBars items={report.maintenance.trend} valueKey="cost" colorClass="bg-blue-600" />
              ) : (
                <p className="py-6 text-center text-sm text-on-surface-variant">No maintenance data in range</p>
              )}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <div className="border-b border-outline-variant px-4 py-3">
                <h4 className="text-sm font-semibold text-neutral-900">Fuel by vehicle</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-right">Liters</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                    <th className="px-4 py-2 text-right">Avg/entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {report.fuel.byVehicle.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-on-surface-variant">No fuel records</td></tr>
                  ) : report.fuel.byVehicle.map((v) => (
                    <tr key={v.busId} className="hover:bg-surface-container-low">
                      <td className="px-4 py-2 font-medium text-blue-700">{v.regNumber}</td>
                      <td className="px-4 py-2 text-right">{v.liters} L</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(v.amount)}</td>
                      <td className="px-4 py-2 text-right">{v.avgLitersPerEntry ?? '—'} L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <div className="border-b border-outline-variant px-4 py-3">
                <h4 className="text-sm font-semibold text-neutral-900">Maintenance by service type</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-2 text-left">Service type</th>
                    <th className="px-4 py-2 text-right">Count</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {report.maintenance.byServiceType.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-6 text-center text-on-surface-variant">No maintenance records</td></tr>
                  ) : report.maintenance.byServiceType.map((r) => (
                    <tr key={r.type} className="hover:bg-surface-container-low">
                      <td className="px-4 py-2">{r.type}</td>
                      <td className="px-4 py-2 text-right">{r.count}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {report.maintenance.byVehicle.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <div className="border-b border-outline-variant px-4 py-3">
                <h4 className="text-sm font-semibold text-neutral-900">Maintenance by vehicle</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-2 text-left">Vehicle</th>
                    <th className="px-4 py-2 text-right">Entries</th>
                    <th className="px-4 py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {report.maintenance.byVehicle.map((v) => (
                    <tr key={v.busId} className="hover:bg-surface-container-low">
                      <td className="px-4 py-2 font-medium text-blue-700">{v.regNumber}</td>
                      <td className="px-4 py-2 text-right">{v.entries}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(v.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function Maintenance() {
  const [searchParams] = useSearchParams()
  const preSelectedBusId = searchParams.get('busId')
  
  const stale = getStalePageData('/maintenance')
  const [tab, setTab] = useState('maintenance')
  const [maintenance, setMaintenance] = useState(() => stale?.maintenance || [])
  const [fuelLogs, setFuelLogs] = useState(() => stale?.fuelLogs || [])
  const [summary, setSummary] = useState(() => stale?.summary || { totalLiters: 0, totalAmount: 0 })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [minAmount, setMinAmount] = useState('')
  const [logModal, setLogModal] = useState(false)
  const [maintenanceModal, setMaintenanceModal] = useState(null)
  const [fuelModal, setFuelModal] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)

  // Auto-open maintenance modal if busId is in URL
  useEffect(() => {
    if (preSelectedBusId) {
      setMaintenanceModal('new')
      // Clear the URL param after opening modal
      window.history.replaceState({}, '', '/maintenance')
    }
  }, [preSelectedBusId])

  const applyData = useCallback((payload) => {
    setMaintenance(payload?.maintenance || [])
    setFuelLogs(payload?.fuelLogs || [])
    setSummary(payload?.summary || { totalLiters: 0, totalAmount: 0 })
  }, [])

  const { loading, reload } = useFastPageLoad('/maintenance', {
    applyData,
    refreshEnabled: !logModal && !maintenanceModal && !fuelModal,
  })

  const refreshMaintenance = () => {
    invalidatePageData('/maintenance')
    reload({ keepContent: true, force: true })
  }

  const activeList = tab === 'maintenance' ? maintenance : fuelLogs

  const filtered = useMemo(() => {
    return activeList.filter((r) => {
      const busReg = r.bus_id?.regNumber || ''
      const desc = r.description || ''
      const matchSearch = busReg.toLowerCase().includes(search.toLowerCase()) ||
        desc.toLowerCase().includes(search.toLowerCase())
      const amount = Number(r.amount) || 0
      const matchAmount = (tab === 'fuel' && minAmount !== '')
        ? amount >= Number(minAmount)
        : true
      return matchSearch && matchAmount
    })
  }, [activeList, search, tab, minAmount])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('Delete this record?')) return
    await api.delete(`/maintenance/${id}`)
    refreshMaintenance()
  }

  const handleDeleteFuel = async (id) => {
    if (!window.confirm('Delete this record?')) return
    await api.delete(`/fuel/${id}`)
    refreshMaintenance()
  }

  const totalMaintenanceCost = maintenance.reduce((sum, r) => sum + (r.cost || 0), 0)
  const maintenanceOverdue = maintenance.filter((r) => r.bus_id?.status === 'maintenance')

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const formatCurrency = (n) => `LKR ${Number(n || 0).toLocaleString()}`

  return (
    <div className="w-full">
      <ModuleHeader
        title="Fuel & Maintenance"
        subtitle="Manage fleet health and operational expenditures."
        action={
          <ModulePrimaryButton icon="add_circle" onClick={() => setLogModal(true)}>
            Log New Activity
          </ModulePrimaryButton>
        }
      />




      {/* Stats Cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Avg Liters / Entry</p>
            <Icon name="local_gas_station" size={18} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {summary.totalEntries
              ? (summary.totalLiters / summary.totalEntries).toFixed(1)
              : fuelLogs.length
                ? (summary.totalLiters / fuelLogs.length).toFixed(1)
                : '—'}{' '}
            <span className="text-sm font-normal">L</span>
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Based on {summary.totalEntries || fuelLogs.length} entries</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Maint. Cost (Total)</p>
            <Icon name="payments" size={18} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {formatCurrency(totalMaintenanceCost)}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">{maintenance.length} service records</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total Fuel Cost</p>
            <Icon name="speed" size={18} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{formatCurrency(summary.totalAmount)}</p>
          <p className="mt-1 text-xs text-on-surface-variant">{summary.totalLiters?.toFixed(0)} liters total</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Active Service</p>
            <Icon name="build_circle" size={18} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">{maintenanceOverdue.length} <span className="text-sm font-normal">Units</span></p>
          <p className="mt-1 text-xs text-on-surface-variant">In depot workshop</p>
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="rounded-xl border border-outline-variant bg-white shadow-sm">
        {/* Tab bar + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 pt-4 pb-0">
          <div className="flex gap-1">
            {[
              { key: 'maintenance', label: 'Maintenance Logs' },
              { key: 'fuel', label: 'Fuel Logs' },
              { key: 'report', label: 'Summary Report' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => { setTab(key); setPage(1); setSearch(''); setMinAmount('') }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-on-surface-variant hover:text-neutral-900'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            {tab !== 'report' && (
            <>
            <div className="relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search logs..."
                className="rounded-lg border border-outline-variant bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-neutral-900 w-48" />
            </div>
            {tab === 'fuel' && (
              <div className="relative">
                <Icon name="filter_list" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(1) }}
                  placeholder="Min amount (LKR)"
                  className="rounded-lg border border-outline-variant bg-surface py-1.5 pl-8 pr-3 text-sm outline-none focus:border-neutral-900 w-44"
                />
              </div>
            )}
            </>
            )}
          </div>        </div>

        <div className="p-5">
          {/* Summary Report */}
          {tab === 'report' && (
            <SummaryReportPanel formatCurrency={formatCurrency} />
          )}

          {/* Maintenance Table */}
          {tab === 'maintenance' && (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vehicle ID</th>
                    <th className="px-4 py-3 text-left">Service Type</th>
                    <th className="px-4 py-3 text-left">Cost</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-white">
                  {loading && maintenance.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">No maintenance records found</td></tr>
                  ) : paginated.map((r) => {
                    const style = serviceStyle(r.description)
                    return (
                      <tr key={r._id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-3 text-neutral-600">{formatDate(r.service_date)}</td>
                        <td className="px-4 py-3 font-semibold text-blue-700">{r.bus_id?.regNumber || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${style.text}`}>
                            <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                            {r.description}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{formatCurrency(r.cost)}</td>
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button onClick={() => setMenuOpen(menuOpen === r._id ? null : r._id)}
                              className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container">
                              <Icon name="more_vert" size={16} />
                            </button>
                            {menuOpen === r._id && (
                              <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-outline-variant bg-white shadow-lg">
                                <button onClick={() => { setMaintenanceModal(r); setMenuOpen(null) }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container">
                                  <Icon name="edit" size={14} /> Edit
                                </button>
                                <button onClick={() => { handleDeleteMaintenance(r._id); setMenuOpen(null) }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                  <Icon name="delete" size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Fuel Table */}
          {tab === 'fuel' && (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vehicle ID</th>
                    <th className="px-4 py-3 text-left">Liters</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-white">
                  {loading && fuelLogs.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">No fuel logs found</td></tr>
                  ) : paginated.map((r) => (
                    <tr key={r._id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-4 py-3 text-neutral-600">{formatDate(r.fuel_date)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700">{r.bus_id?.regNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-yellow-700">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          {r.liters} L
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-700">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button onClick={() => setMenuOpen(menuOpen === r._id ? null : r._id)}
                            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container">
                            <Icon name="more_vert" size={16} />
                          </button>
                          {menuOpen === r._id && (
                            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-outline-variant bg-white shadow-lg">
                              <button onClick={() => { setFuelModal(r); setMenuOpen(null) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-container">
                                <Icon name="edit" size={14} /> Edit
                              </button>
                              <button onClick={() => { handleDeleteFuel(r._id); setMenuOpen(null) }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                <Icon name="delete" size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {tab !== 'report' && (
          <div className="mt-4 flex items-center justify-between text-sm text-on-surface-variant">
            <span>Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} entries</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-lg p-1.5 hover:bg-surface-container disabled:opacity-40">
                <Icon name="chevron_left" size={18} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium ${n === page ? 'bg-neutral-900 text-white' : 'hover:bg-surface-container'}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-lg p-1.5 hover:bg-surface-container disabled:opacity-40">
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {logModal && (
        <LogActivityModal
          onClose={() => setLogModal(false)}
          onSave={(type) => {
            setLogModal(false)
            if (type === 'maintenance') setMaintenanceModal('new')
            else setFuelModal('new')
          }}
        />
      )}
      {maintenanceModal && (
        <MaintenanceModal
          record={maintenanceModal === 'new' ? null : maintenanceModal}
          onClose={() => setMaintenanceModal(null)}
          onSave={() => { setMaintenanceModal(null); refreshMaintenance() }}
          preSelectedBusId={preSelectedBusId}
        />
      )}
      {fuelModal && (
        <FuelModal
          record={fuelModal === 'new' ? null : fuelModal}
          onClose={() => setFuelModal(null)}
          onSave={() => { setFuelModal(null); refreshMaintenance() }}
        />
      )}
    </div>
  )
}

export default Maintenance
