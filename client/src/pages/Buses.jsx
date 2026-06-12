// Assigned to: Irfa
// Module: Fleet & Personnel — Vehicle Management

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import api from '../services/api'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import ConfirmDialog from '../components/ConfirmDialog'
import FieldError from '../components/FieldError'
import ThemeTimeInput from '../components/ThemeTimeInput'
import { ModuleHeader, ModulePrimaryButton, ModuleStats } from '../components/layout/ModuleLayout'
import CsvImportButtons from '../components/import/CsvImportButtons'
import {
  depotIdValue,
  formatServiceType,
  formatWorkingHours,
  formatWorkingHoursDisplay,
  getFleetDeleteDisabledReason,
  parseWorkingHours,
} from '../utils/fleetHelpers'
import {
  fieldBorderClass,
  hasErrors,
  validateBusForm,
  validateDriverForm,
} from '../utils/formValidation'
import { formatRouteEndpointsLabel } from '../utils/scheduleHelpers'
import {
  computeMaintenanceDuration,
  formatMaintenanceStatus,
  maintenanceStatusClass,
} from '../utils/maintenanceHelpers'

function busFormState(bus, currentUser) {
  if (!bus) {
    return {
      regNumber: '',
      capacity: '',
      mileage: '',
      status: 'available',
      depotId: currentUser?.depotId?._id || currentUser?.depotId || '',
      serviceType: 'ordinary',
    }
  }
  return {
    regNumber: bus.regNumber,
    capacity: bus.capacity,
    mileage: bus.mileage ?? '',
    status: bus.status,
    serviceType: bus.serviceType || 'ordinary',
    depotId: depotIdValue(bus.depotId),
  }
}
const STATUS_STYLES = {
  available:     'bg-green-100 text-green-700',
  'in-service':  'bg-blue-100 text-blue-700',
  maintenance:   'bg-red-100 text-red-700',
}

function NotAssignedLabel() {
  return <span className="text-xs italic text-neutral-400">Not assigned</span>
}

function formatCurrentRouteCell(route, { compact = false } = {}) {
  const label = formatRouteEndpointsLabel(route || {})
  if (!label || label === 'Route') {
    return <NotAssignedLabel />
  }
  if (compact) {
    return (
      <div className="min-w-[12rem] max-w-[18rem] leading-tight">
        <p className="truncate font-medium text-neutral-800" title={label}>{label}</p>
        {route?.routeNo && (
          <p className="truncate text-xs text-neutral-400" title={route.routeNo}>{route.routeNo}</p>
        )}
      </div>
    )
  }
  const text = route?.routeNo ? `${label} (${route.routeNo})` : label
  return <span className="font-medium text-neutral-800 whitespace-nowrap">{text}</span>
}

function formatMaintenanceDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const MAINTENANCE_SERVICE_TYPE_STYLES = {
  'Oil Change': { dot: 'bg-blue-500', text: 'text-blue-700' },
  'Brake Check': { dot: 'bg-red-500', text: 'text-red-700' },
  Fueling: { dot: 'bg-yellow-500', text: 'text-yellow-700' },
  Inspection: { dot: 'bg-green-500', text: 'text-green-700' },
  Repair: { dot: 'bg-orange-500', text: 'text-orange-700' },
  Transmission: { dot: 'bg-purple-500', text: 'text-purple-700' },
}

function maintenanceServiceStyle(type) {
  return MAINTENANCE_SERVICE_TYPE_STYLES[type] || { dot: 'bg-gray-400', text: 'text-gray-600' }
}

function formatLicenseExpiryCell(licenseExpiry, { compact = false } = {}) {
  if (!licenseExpiry) {
    return <span className="text-xs text-neutral-400">—</span>
  }
  const s = getLicenseStatus(licenseExpiry)
  const date = new Date(licenseExpiry).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  if (compact) {
    return (
      <div className="leading-tight">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.style}`}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
          {s.label}
        </span>
        <p className="mt-0.5 whitespace-nowrap text-xs text-neutral-500">{date}</p>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${s.style}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {s.label}
      <span className="font-normal text-neutral-500">· {date}</span>
    </span>
  )
}

const ITEMS_PER_PAGE = 8
const MILEAGE_SERVICE_THRESHOLD = 150_000

/** Oldest records first so recently added fleet/drivers appear at the end of the list. */
function sortOldestFirst(items) {
  return [...items].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (ta !== tb) return ta - tb
    const labelA = String(a.regNumber || a.name || a._id || '')
    const labelB = String(b.regNumber || b.name || b._id || '')
    return labelA.localeCompare(labelB)
  })
}

function getBusesNeedingMaintenanceSoon(buses) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneWeekFromNow = new Date(today)
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
  return buses.filter((b) => {
    if (!b.nextMaintenanceDate || b.status === 'maintenance') return false
    const nextDate = new Date(b.nextMaintenanceDate)
    return nextDate <= oneWeekFromNow
  })
}

function buildFleetMaintenanceAlerts(buses) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const alerts = []

  for (const bus of buses) {
    if (bus.status === 'maintenance') {
      alerts.push({
        id: `in-maint-${bus._id}`,
        severity: 'info',
        title: 'In maintenance',
        busReg: bus.regNumber,
        description: 'Vehicle is currently undergoing maintenance.',
      })
      continue
    }

    if ((bus.mileage || 0) >= MILEAGE_SERVICE_THRESHOLD) {
      alerts.push({
        id: `high-mileage-${bus._id}`,
        severity: 'urgent',
        title: 'Maintenance needed',
        busReg: bus.regNumber,
        description: `High mileage (${(bus.mileage || 0).toLocaleString()} km) — service required`,
      })
    }

    if (bus.nextMaintenanceDate) {
      const nextDate = new Date(bus.nextMaintenanceDate)
      const oneWeekFromNow = new Date(today)
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7)
      if (nextDate <= oneWeekFromNow) {
        const daysUntil = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24))
        const isOverdue = daysUntil < 0
        alerts.push({
          id: `due-soon-${bus._id}`,
          severity: isOverdue ? 'urgent' : 'warning',
          title: isOverdue ? 'Service overdue' : 'Service due soon',
          busReg: bus.regNumber,
          description: isOverdue
            ? `Overdue by ${Math.abs(daysUntil)} days · ${nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
            : `Due in ${daysUntil} days · ${nextDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
          busId: bus._id,
        })
      }
    }
  }

  const severityRank = { urgent: 0, warning: 1, info: 2 }
  return alerts.sort(
    (a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)
  )
}

const ALERT_SEVERITY_STYLES = {
  urgent: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
}

function MaintenanceAlertsPanel({ open, onClose, buses, onGoToMaintenance }) {
  if (!open) return null

  const alerts = buildFleetMaintenanceAlerts(buses)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-2">
            <Icon name="warning" size={22} className="text-amber-600" />
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">Maintenance Alerts</h3>
              <p className="text-xs text-on-surface-variant">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''} across the fleet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-surface-container"
            aria-label="Close maintenance alerts"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="check_circle" size={40} className="text-green-500" />
              <p className="mt-3 text-sm font-medium text-neutral-900">No maintenance alerts</p>
              <p className="mt-1 text-xs text-on-surface-variant">All vehicles are in good standing.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-4 ${ALERT_SEVERITY_STYLES[alert.severity] || ALERT_SEVERITY_STYLES.info}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {alert.title}
                      </p>
                      <p className="mt-1 text-sm font-bold">{alert.busReg}</p>
                      <p className="mt-0.5 text-xs opacity-90">{alert.description}</p>
                    </div>
                    {alert.busId && (
                      <button
                        type="button"
                        onClick={() => onGoToMaintenance(alert.busId)}
                        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                      >
                        Log service
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-outline-variant px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-outline-variant py-2 text-sm font-medium hover:bg-surface-container"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
function BusModal({ bus, onClose, onSave }) {
  const { user } = useAuth()
  const isSuperadmin = user?.role === ROLES.SUPERADMINISTRATOR
  const creatorDepotId = user?.depotId?._id || user?.depotId || ''
  const creatorDepotName = bus?.depotId?.depotName || user?.depotId?.depotName || 'Assigned depot'

  const [form, setForm] = useState(() => busFormState(bus, user))
  const [depots, setDepots] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isSuperadmin) {
      api.get('/depots').then(({ data }) => {
        setDepots(data)
      }).catch(() => {})
    }
  }, [isSuperadmin])

  const handle = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errors = validateBusForm(form)
    setFieldErrors(errors)
    if (hasErrors(errors)) return

    setSaving(true)
    setError('')
    try {
      if (bus) {
        await api.put(`/buses/${bus._id}`, form)
      } else {
        await api.post('/buses', form)
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
          <h3 className="text-lg font-semibold text-neutral-900">{bus ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Registration Number</label>
            <input name="regNumber" value={form.regNumber} onChange={handle} required
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.regNumber)}`} />
            <FieldError message={fieldErrors.regNumber} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Capacity (Pax)</label>
              <input name="capacity" type="number" min="1" step="1" value={form.capacity} onChange={handle} required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.capacity)}`} />
              <FieldError message={fieldErrors.capacity} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Mileage (km)</label>
              <input name="mileage" type="number" min="0" step="1" value={form.mileage} onChange={handle}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.mileage)}`} />
              <FieldError message={fieldErrors.mileage} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Status</label>
              <select name="status" value={form.status} onChange={handle}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900">
                <option value="available">Available</option>
                <option value="in-service">In Service</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Service Type</label>
              <select name="serviceType" value={form.serviceType} onChange={handle}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900">
                <option value="ordinary">Ordinary</option>
                <option value="express">Express</option>
                <option value="semi-luxury">Semi-Luxury</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Depot</label>
            {isSuperadmin ? (
              <select
                name="depotId"
                value={form.depotId}
                onChange={handle}
                required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.depotId)}`}
              >
                <option value="">Select depot</option>
                {depots.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.depotName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-neutral-700">
                {creatorDepotName}
              </div>
            )}
            <FieldError message={fieldErrors.depotId} />
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

function formatMaintenanceCost(cost) {
  return `LKR ${Number(cost || 0).toLocaleString()}`
}

function BusMaintenanceViewModal({ bus, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!bus?._id) return undefined

    let cancelled = false
    setLoading(true)
    setError('')
    setRecords([])

    api
      .get('/maintenance', { params: { bus_id: bus._id } })
      .then((res) => {
        if (!cancelled) {
          setRecords(Array.isArray(res.data) ? res.data : [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load maintenance records')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [bus?._id])

  if (!bus) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900">Maintenance History</h3>
            <p className="text-sm text-on-surface-variant">
              Vehicle <span className="font-semibold text-blue-700">{bus.regNumber}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container" aria-label="Close">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">Loading maintenance records...</p>
          ) : error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-outline-variant">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Vehicle ID</th>
                    <th className="px-4 py-3 text-left">Service Type</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Duration</th>
                    <th className="px-4 py-3 text-left">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant bg-white">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                        No maintenance records found
                      </td>
                    </tr>
                  ) : (
                    records.map((record, index) => {
                      const style = maintenanceServiceStyle(record.description)
                      return (
                        <tr key={record._id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-4 py-3 text-neutral-500 tabular-nums">{index + 1}</td>
                          <td className="px-4 py-3 text-neutral-600">
                            {formatMaintenanceDate(record.service_date)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-700">
                            {record.bus_id?.regNumber || bus.regNumber}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${style.text}`}>
                              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                              {record.description}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${maintenanceStatusClass(record.status)}`}>
                              {formatMaintenanceStatus(record.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-neutral-700">
                            {record.durationLabel || computeMaintenanceDuration(record)}
                          </td>
                          <td className="px-4 py-3 text-neutral-700">{formatMaintenanceCost(record.cost)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-outline-variant px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fleet Inventory Tab ───────────────────────────────────────────────────────
function FleetTab({ buses, loading, onRefresh, addTrigger, onAddClose }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [viewMaintenanceBus, setViewMaintenanceBus] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState(null)

  useEffect(() => { if (addTrigger) setModal('add') }, [addTrigger])

  const filtered = sortOldestFirst(
    buses.filter((b) => {
      const matchSearch = b.regNumber?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter ? b.status === statusFilter : true
      return matchSearch && matchStatus
    })
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDeleteRequest = (bus) => {
    const blocked = getFleetDeleteDisabledReason(bus, 'bus')
    if (blocked) {
      setDeleteBlockedMessage(blocked)
      return
    }
    setDeleteError('')
    setDeleteTarget(bus)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/buses/${deleteTarget._id}`)
      setDeleteTarget(null)
      invalidatePageData('/buses')
      onRefresh({ keepContent: true, force: true })
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete bus')
    } finally {
      setDeleting(false)
    }
  }

  const inServiceBuses = buses.filter((b) => b.status === 'in-service')
  const availableBuses = buses.filter((b) => b.status === 'available')
  const maintenanceBuses = buses.filter((b) => b.status === 'maintenance')

  const busesNeedingMaintenance = getBusesNeedingMaintenanceSoon(buses)

  const fleetStatItems = [
    {
      label: 'Total fleet',
      value: buses.length,
      hint: `${availableBuses.length} available for assignment`,
      icon: 'directions_bus',
    },
    {
      label: 'In service',
      value: inServiceBuses.length,
      hint: inServiceBuses.length ? 'On active routes' : 'No buses on routes',
      icon: 'timeline',
    },
    {
      label: 'In maintenance',
      value: maintenanceBuses.length,
      hint: maintenanceBuses.length
        ? maintenanceBuses.slice(0, 3).map((b) => b.regNumber).join(' · ')
        : 'No vehicles offline',
      icon: 'build',
    },
    {
      label: 'Service due soon',
      value: busesNeedingMaintenance.length,
      hint: busesNeedingMaintenance.length ? 'Within the next 7 days' : 'No upcoming service',
      icon: 'schedule',
    },
  ]

  return (
    <>
      <ModuleStats items={fleetStatItems} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Filter by Registration..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="in-service">In Service</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
        </select>
        <span className="ml-auto text-sm text-on-surface-variant">
          Showing {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="w-12 px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Registration</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Mileage</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Current Route</th>
              <th className="min-w-[14rem] px-4 py-3 text-left">Maintenance History</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-white">
            {loading && buses.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-on-surface-variant">No vehicles found</td></tr>
            ) : paginated.map((bus, index) => {
              const deleteDisabledReason = getFleetDeleteDisabledReason(bus, 'bus')
              return (
              <tr key={bus._id} className="align-top hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 text-neutral-500 tabular-nums">{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">{bus.regNumber}</td>
                <td className="px-4 py-3 text-neutral-500 capitalize">{bus.serviceType || '—'}</td>
                <td className="px-4 py-3 text-neutral-700">{bus.capacity} Pax</td>
                <td className="px-4 py-3 text-neutral-700">{bus.mileage?.toLocaleString()} km</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[bus.status] || 'bg-gray-100 text-gray-600'}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {bus.status}
                  </span>
                </td>
                <td className="px-4 py-3">{formatCurrentRouteCell(bus.currentRoute)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setViewMaintenanceBus(bus)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <Icon name="visibility" size={14} />
                    View
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal(bus)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="Edit">
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => !deleteDisabledReason && handleDeleteRequest(bus)}
                      disabled={Boolean(deleteDisabledReason)}
                      title={deleteDisabledReason || 'Delete bus'}
                      aria-label={deleteDisabledReason ? 'Delete bus (disabled)' : 'Delete bus'}
                      className={`rounded-lg p-1.5 ${
                        deleteDisabledReason
                          ? 'cursor-not-allowed text-red-300 opacity-50'
                          : 'text-red-400 hover:bg-red-50'
                      }`}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-on-surface-variant">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg p-1.5 hover:bg-surface-container disabled:opacity-40">
              <Icon name="chevron_left" size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
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

      {viewMaintenanceBus && (
        <BusMaintenanceViewModal
          bus={viewMaintenanceBus}
          onClose={() => setViewMaintenanceBus(null)}
        />
      )}

      {modal && (
        <BusModal
          bus={modal === 'add' ? null : modal}
          onClose={() => { setModal(null); onAddClose() }}
          onSave={() => {
            setModal(null)
            onAddClose()
            invalidatePageData('/buses')
            onRefresh({ keepContent: true, force: true })
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteBlockedMessage)}
        title="Cannot delete bus"
        message={deleteBlockedMessage || ''}
        cancelLabel="Close"
        variant="danger"
        alertOnly
        onCancel={() => setDeleteBlockedMessage(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this bus?"
        message={
          deleteError
            ? deleteError
            : deleteTarget
              ? `${deleteTarget.regNumber} will be permanently removed. This cannot be undone.`
              : 'This bus will be permanently removed. This cannot be undone.'
        }
        confirmLabel="Delete bus"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deleting) return
          setDeleteTarget(null)
          setDeleteError('')
        }}
      />

      <div id="fleet-add-trigger" className="hidden" />
    </>
  )
}

function driverFormState(driver, currentUser) {
  const hours = parseWorkingHours(driver?.workingHours)
  return {
    name: driver?.name || '',
    licenseNo: driver?.licenseNo || '',
    licenseExpiry: driver?.licenseExpiry || '',
    email: driver?.email || '',
    password: '',
    contactNo: driver?.contactNo || '',
    workingHoursStart: hours.start,
    workingHoursEnd: hours.end,
    depotId: driver?.depotId?._id || driver?.depotId || currentUser?.depotId?._id || currentUser?.depotId || '',
  }
}

// ── Driver Personnel Tab ──────────────────────────────────────────────────────
function DriverModal({ driver, onClose, onSave }) {
  const { user } = useAuth()
  const isSuperadmin = user?.role === ROLES.SUPERADMINISTRATOR
  const creatorDepotId = user?.depotId?._id || user?.depotId || ''
  const creatorDepotName = driver?.depotId?.depotName || user?.depotId?.depotName || 'Assigned depot'

  const isEdit = Boolean(driver)
  const [form, setForm] = useState(() => driverFormState(driver, user))
  const [depots, setDepots] = useState([])
  const [resetPassword, setResetPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isSuperadmin) {
      api.get('/depots').then(({ data }) => {
        setDepots(data)
      }).catch(() => {})
    }
  }, [isSuperadmin])

  const handle = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
      ...(name === 'workingHoursStart' || name === 'workingHoursEnd'
        ? { workingHoursStart: undefined, workingHoursEnd: undefined }
        : {}),
    }))
  }

  const toggleResetPassword = () => {
    setResetPassword((prev) => !prev)
    setForm((prev) => ({ ...prev, password: '' }))
    setFieldErrors((prev) => ({ ...prev, password: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const errors = validateDriverForm(form, { isEdit, resetPassword })
    setFieldErrors(errors)
    if (hasErrors(errors)) return

    const payload = {
      ...form,
      workingHours: formatWorkingHours(form.workingHoursStart, form.workingHoursEnd),
    }
    delete payload.workingHoursStart
    delete payload.workingHoursEnd
    delete payload.password
    if (!isEdit || resetPassword) {
      if (form.password) payload.password = form.password
    }

    setSaving(true)
    setError('')
    try {
      if (driver) {
        await api.put(`/drivers/${driver._id}`, payload)
      } else {
        await api.post('/drivers', payload)
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
          <h3 className="text-lg font-semibold text-neutral-900">{driver ? 'Edit Driver' : 'Add New Driver'}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <form onSubmit={submit} className="space-y-3" autoComplete="off">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full Name</label>
            <input name="name" value={form.name} onChange={handle} required minLength={2}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.name)}`} />
            <FieldError message={fieldErrors.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">License Number</label>
              <input name="licenseNo" value={form.licenseNo} onChange={handle} required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.licenseNo)}`} />
              <FieldError message={fieldErrors.licenseNo} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">License Expiry Date</label>
              <input name="licenseExpiry" type="date" value={form.licenseExpiry ? form.licenseExpiry.slice(0, 10) : ''} onChange={handle}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.licenseExpiry)}`} />
              <FieldError message={fieldErrors.licenseExpiry} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact Number</label>
            <input name="contactNo" value={form.contactNo} onChange={handle} required
              placeholder="077 123 4567"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.contactNo)}`} />
            <FieldError message={fieldErrors.contactNo} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Login Email</label>
            <input name="email" type="email" value={form.email} onChange={handle}
              placeholder="driver@transitlk.com"
              autoComplete="off"
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.email)}`} />
            <FieldError message={fieldErrors.email} />
          </div>
          {isEdit ? (
            <div className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-neutral-700">Driver login password</p>
                  <p className="text-[11px] text-neutral-500">
                    {driver?.email ? 'Password is not shown for security.' : 'Set an email above, then reset the password.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleResetPassword}
                  className="shrink-0 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-surface-container"
                >
                  {resetPassword ? 'Cancel reset' : 'Reset password'}
                </button>
              </div>
              {resetPassword && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs font-medium text-neutral-600">New password</label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handle}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                    className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.password)}`}
                  />
                  <FieldError message={fieldErrors.password} />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Login Password</label>
              <input name="password" type="password" value={form.password} onChange={handle}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                minLength={6}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.password)}`} />
              <FieldError message={fieldErrors.password} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600 font-medium text-neutral-600">Depot</label>
            {isSuperadmin ? (
              <select
                name="depotId"
                value={form.depotId}
                onChange={handle}
                required
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${fieldBorderClass(fieldErrors.depotId)}`}
              >
                <option value="">Select depot</option>
                {depots.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.depotName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-neutral-700">
                {creatorDepotName}
              </div>
            )}
            <FieldError message={fieldErrors.depotId} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Working Hours</label>
            <p className="mb-2 text-[11px] text-neutral-500">Daily shift window (e.g. 06:00 – 18:00)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-[11px] font-medium text-neutral-500">Start time</span>
                <ThemeTimeInput
                  name="workingHoursStart"
                  value={form.workingHoursStart}
                  onChange={handle}
                  placeholder="06:00"
                  hasError={Boolean(fieldErrors.workingHoursStart)}
                />
                <FieldError message={fieldErrors.workingHoursStart} />
              </div>
              <div>
                <span className="mb-1 block text-[11px] font-medium text-neutral-500">End time</span>
                <ThemeTimeInput
                  name="workingHoursEnd"
                  value={form.workingHoursEnd}
                  onChange={handle}
                  placeholder="18:00"
                  hasError={Boolean(fieldErrors.workingHoursEnd)}
                />
                <FieldError message={fieldErrors.workingHoursEnd} />
              </div>
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

function getInitials(name = '') {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getLicenseStatus(expiry) {
  if (!expiry) return null
  const today = new Date()
  const exp = new Date(expiry)
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Expired', style: 'bg-red-100 text-red-700' }
  if (diffDays <= 30) return { label: 'Expiring Soon', style: 'bg-orange-100 text-orange-700' }
  return { label: 'Valid', style: 'bg-green-100 text-green-700' }
}

const DRIVER_STATUS_STYLES = {
  available: 'bg-green-100 text-green-700',
  'on-duty': 'bg-indigo-100 text-indigo-800',
  'on-leave': 'bg-amber-100 text-amber-800',
  'off-duty': 'bg-neutral-200 text-neutral-700',
}

function driverStatusClass(status) {
  return DRIVER_STATUS_STYLES[status] || 'bg-surface-container-low text-on-surface-variant'
}

function DriversTab({ drivers, loading, onRefresh, addTrigger, onAddClose }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [viewDriver, setViewDriver] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleteBlockedMessage, setDeleteBlockedMessage] = useState(null)

  useEffect(() => { if (addTrigger) setModal('add') }, [addTrigger])

  const handleDeleteRequest = (driver) => {
    const blocked = getFleetDeleteDisabledReason(driver, 'driver')
    if (blocked) {
      setDeleteBlockedMessage(blocked)
      return
    }
    setDeleteError('')
    setDeleteTarget(driver)
  }

  const filtered = sortOldestFirst(
    drivers.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.licenseNo || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter ? d.status === statusFilter : true
      const licStatus = getLicenseStatus(d.licenseExpiry)
      const matchLicense = licenseFilter
        ? (licenseFilter === 'valid' && licStatus?.label === 'Valid') ||
          (licenseFilter === 'expiring' && licStatus?.label === 'Expiring Soon') ||
          (licenseFilter === 'expired' && licStatus?.label === 'Expired') ||
          (licenseFilter === 'none' && !d.licenseExpiry)
        : true
      return matchSearch && matchStatus && matchLicense
    })
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/drivers/${deleteTarget._id}`)
      setDeleteTarget(null)
      invalidatePageData('/buses')
      onRefresh({ keepContent: true, force: true })
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete driver')
    } finally {
      setDeleting(false)
    }
  }

  // derive a short driver ID from mongo _id
  const driverId = (d) => `#DR-${d._id.slice(-4).toUpperCase()}`

  const availableDrivers = drivers.filter((d) => d.status === 'available')
  const onDutyDrivers = drivers.filter((d) => d.status === 'on-duty')
  const onLeaveDrivers = drivers.filter((d) => d.status === 'on-leave')
  const offDutyDrivers = drivers.filter((d) => d.status === 'off-duty')
  const expiringLicenses = drivers.filter(
    (d) => getLicenseStatus(d.licenseExpiry)?.label === 'Expiring Soon'
  ).length

  const driverStatItems = [
    {
      label: 'Total drivers',
      value: drivers.length,
      hint: 'Registered in depot roster',
      icon: 'group',
    },
    {
      label: 'Available',
      value: availableDrivers.length,
      hint: `${onDutyDrivers.length} on duty · ${onLeaveDrivers.length} on leave · ${offDutyDrivers.length} off duty`,
      icon: 'directions_run',
    },
    {
      label: 'With shifts',
      value: drivers.filter((d) => d.workingHours).length,
      hint: 'Assigned working hours',
      icon: 'schedule',
    },
    {
      label: 'Licenses expiring',
      value: expiringLicenses,
      hint: expiringLicenses ? 'Renew within 30 days' : 'No licenses expiring soon',
      icon: 'report_problem',
    },
  ]

  return (
    <>
      <ModuleStats items={driverStatItems} />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-56 sm:w-64">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Filter drivers by name or ID..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="on-duty">On Duty</option>
            <option value="on-leave">On Leave</option>
            <option value="off-duty">Off Duty</option>
          </select>
          <select value={licenseFilter} onChange={(e) => { setLicenseFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
            <option value="">All License Status</option>
            <option value="valid">Valid</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="none">No Expiry Set</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full min-w-[94rem] table-fixed text-sm">
          <colgroup>
            <col className="w-[3.5rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[15rem]" />
            <col className="w-[7.5rem]" />
            <col className="w-[10rem]" />
            <col className="w-[9.5rem]" />
            <col className="w-[15rem]" />
            <col className="w-[15rem]" />
            <col className="w-[10rem]" />
            <col className="w-[10rem]" />
            <col className="w-[7.5rem]" />
          </colgroup>
          <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left">#</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Driver ID</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Name</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">License No.</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Expiry</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Current Route</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Contact</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Working Hours</th>
              <th className="whitespace-nowrap px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-white">
            {loading && drivers.length === 0 ? (
              <tr><td colSpan={11} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={11} className="py-10 text-center text-on-surface-variant">No drivers found</td></tr>
            ) : paginated.map((d, index) => {
              const deleteDisabledReason = getFleetDeleteDisabledReason(d, 'driver')
              return (
              <tr key={d._id} className="align-top hover:bg-surface-container-low transition-colors">
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500 tabular-nums">{(page - 1) * ITEMS_PER_PAGE + index + 1}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-blue-700">{driverId(d)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                      {getInitials(d.name)}
                    </div>
                    <span className="truncate font-semibold text-neutral-900" title={d.name}>{d.name}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${driverStatusClass(d.status || 'available')}`}>
                    {formatServiceType(d.status || 'available')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-neutral-700">{d.licenseNo}</td>
                <td className="px-4 py-3">{formatLicenseExpiryCell(d.licenseExpiry, { compact: true })}</td>
                <td className="px-4 py-3">{formatCurrentRouteCell(d.currentRoute, { compact: true })}</td>
                <td className="truncate px-4 py-3 text-neutral-500 text-xs" title={d.email || undefined}>{d.email || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{d.contactNo || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{formatWorkingHoursDisplay(d.workingHours)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewDriver(d)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="View">
                      <Icon name="visibility" size={16} />
                    </button>
                    <button onClick={() => setModal(d)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="Edit">
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => !deleteDisabledReason && handleDeleteRequest(d)}
                      disabled={Boolean(deleteDisabledReason)}
                      title={deleteDisabledReason || 'Delete driver'}
                      aria-label={deleteDisabledReason ? 'Delete driver (disabled)' : 'Delete driver'}
                      className={`rounded-lg p-1.5 ${
                        deleteDisabledReason
                          ? 'cursor-not-allowed text-red-300 opacity-50'
                          : 'text-red-400 hover:bg-red-50'
                      }`}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm text-on-surface-variant">
        <span>Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} drivers</span>
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

      {/* View Modal */}
      {viewDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Driver Details</h3>
              <button onClick={() => setViewDriver(null)} className="rounded-full p-1 hover:bg-surface-container">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-xl font-bold text-neutral-700">
                {getInitials(viewDriver.name)}
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{viewDriver.name}</p>
                <p className="text-xs text-blue-700">{driverId(viewDriver)}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['License No.', viewDriver.licenseNo],
                ['License Expiry', viewDriver.licenseExpiry
                  ? (() => {
                      const s = getLicenseStatus(viewDriver.licenseExpiry)
                      return `${new Date(viewDriver.licenseExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${s.label}`
                    })()
                  : 'Not set'],
                ['Email', viewDriver.email || '—'],
                ['Contact', viewDriver.contactNo || '—'],
                ['Working Hours', formatWorkingHoursDisplay(viewDriver.workingHours)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-outline-variant py-1.5">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-medium text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewDriver(null)}
              className="mt-4 w-full rounded-lg bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700">
              Close
            </button>
          </div>
        </div>
      )}

      {modal && (
        <DriverModal
          driver={modal === 'add' ? null : modal}
          onClose={() => { setModal(null); onAddClose() }}
          onSave={() => {
            setModal(null)
            onAddClose()
            invalidatePageData('/buses')
            onRefresh({ keepContent: true, force: true })
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteBlockedMessage)}
        title="Cannot delete driver"
        message={deleteBlockedMessage || ''}
        cancelLabel="Close"
        variant="danger"
        alertOnly
        onCancel={() => setDeleteBlockedMessage(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this driver?"
        message={
          deleteError
            ? deleteError
            : deleteTarget
              ? `${deleteTarget.name} (${driverId(deleteTarget)}) will be permanently removed. This cannot be undone.`
              : 'This driver will be permanently removed. This cannot be undone.'
        }
        confirmLabel="Delete driver"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deleting) return
          setDeleteTarget(null)
          setDeleteError('')
        }}
      />
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function Buses() {
  const navigate = useNavigate()
  const stale = getStalePageData('/buses')
  const staleLacksFleetContext =
    (stale?.buses || []).some(
      (bus) =>
        !Object.prototype.hasOwnProperty.call(bus, 'currentRoute')
    ) ||
    (stale?.drivers || []).some(
      (driver) => !Object.prototype.hasOwnProperty.call(driver, 'currentRoute')
    )
  const [buses, setBuses] = useState(() => stale?.buses || [])
  const [drivers, setDrivers] = useState(() => stale?.drivers || [])
  const [tab, setTab] = useState('fleet')
  const [showAddBus, setShowAddBus] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showMaintenanceAlerts, setShowMaintenanceAlerts] = useState(false)

  const maintenanceAlerts = buildFleetMaintenanceAlerts(buses)
  const maintenanceAlertCount = new Set(maintenanceAlerts.map((a) => a.busReg)).size

  const applyData = useCallback((payload) => {
    setBuses(payload?.buses || [])
    setDrivers(payload?.drivers || [])
  }, [])

  const { loading, reload } = useFastPageLoad('/buses', {
    applyData,
    forceRefresh: staleLacksFleetContext,
    refreshEnabled: !showAddBus && !showAddDriver && !showMaintenanceAlerts,
  })

  return (
    <div className="w-full">
      <ModuleHeader
        title="Fleet & Drivers"
        subtitle="Manage your district vehicles and active driver roster."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CsvImportButtons
              type={tab === 'drivers' ? 'drivers' : 'vehicles'}
              onSuccess={() => {
                invalidatePageData('/buses')
                reload({ keepContent: true, force: true })
              }}
            />
            {tab === 'drivers' ? (
              <ModulePrimaryButton icon="person_add" onClick={() => setShowAddDriver(true)}>
                Add New Driver
              </ModulePrimaryButton>
            ) : (
              <ModulePrimaryButton icon="add" onClick={() => setShowAddBus(true)}>
                Add New Vehicle
              </ModulePrimaryButton>
            )}
            {tab === 'fleet' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceAlerts(true)}
                  className="btn-outlined flex items-center gap-2 border-red-400 text-red-600 hover:border-red-500 hover:text-red-700"
                >
                  <Icon name="build" size={18} />
                  Maintenance
                </button>
                {maintenanceAlertCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold leading-none text-white ring-2 ring-red-600">
                    {maintenanceAlertCount}
                  </span>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 border-b border-outline-variant">
        {[
          { key: 'fleet', label: 'Fleet Inventory' },
          { key: 'drivers', label: 'Driver Personnel' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-on-surface-variant hover:text-neutral-900'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
        <div className={tab === 'fleet' ? '' : 'hidden'}>
          <FleetTab
            buses={buses}
            loading={loading}
            onRefresh={reload}
            addTrigger={showAddBus}
            onAddClose={() => setShowAddBus(false)}
          />
        </div>
        <div className={tab === 'drivers' ? '' : 'hidden'}>
          <DriversTab
            drivers={drivers}
            loading={loading}
            onRefresh={reload}
            addTrigger={showAddDriver}
            onAddClose={() => setShowAddDriver(false)}
          />
        </div>
      </div>

      <MaintenanceAlertsPanel
        open={showMaintenanceAlerts}
        onClose={() => setShowMaintenanceAlerts(false)}
        buses={buses}
        onGoToMaintenance={(busId) => {
          setShowMaintenanceAlerts(false)
          navigate(`/maintenance?busId=${busId}`)
        }}
      />
    </div>
  )
}

export default Buses
