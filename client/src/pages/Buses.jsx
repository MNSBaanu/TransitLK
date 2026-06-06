// Assigned to: Irfa
// Module: Fleet & Personnel — Vehicle Management

import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import api from '../services/api'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import { ModuleHeader, ModulePrimaryButton } from '../components/layout/ModuleLayout'
import { depotLabel, depotIdValue } from '../utils/fleetHelpers'

function busFormState(bus) {
  if (!bus) {
    return {
      regNumber: '',
      capacity: '',
      mileage: '',
      status: 'available',
      depotId: '',
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

const ITEMS_PER_PAGE = 8

// ── Modal ────────────────────────────────────────────────────────────────────
function BusModal({ bus, onClose, onSave }) {
  const [form, setForm] = useState(() => busFormState(bus))
  const [mataleDepot, setMataleDepot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/depots').then(({ data }) => {
      const depot = data.find((d) => d.depotName === 'Matale Depot')
      if (depot) {
        setMataleDepot(depot)
        setForm((prev) => ({ ...prev, depotId: depot._id }))
      }
    }).catch(() => {})
  }, [])

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
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
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Capacity (Pax)</label>
              <input name="capacity" type="number" value={form.capacity} onChange={handle} required
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Mileage (km)</label>
              <input name="mileage" type="number" value={form.mileage} onChange={handle}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
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
            <div className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-neutral-700">
              {mataleDepot ? mataleDepot.depotName : 'Loading...'}
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

// ── Fleet Inventory Tab ───────────────────────────────────────────────────────
function FleetTab({ buses, loading, onRefresh, addTrigger, onAddClose }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)

  useEffect(() => { if (addTrigger) setModal('add') }, [addTrigger])

  const filtered = buses.filter((b) => {
    const matchSearch = b.regNumber?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter ? b.status === statusFilter : true
    return matchSearch && matchStatus
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return
    await api.delete(`/buses/${id}`)
    invalidatePageData('/buses')
    onRefresh({ keepContent: true, force: true })
  }

  const activeBuses = buses.filter((b) => b.status === 'available' || b.status === 'in-service')
  const maintenanceBuses = buses.filter((b) => b.status === 'maintenance')
  const healthPct = buses.length ? Math.round((activeBuses.length / buses.length) * 100) : 0

  return (
    <>
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
              <th className="px-4 py-3 text-left">Registration</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Mileage</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Depot</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-white">
            {loading && buses.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-on-surface-variant">No vehicles found</td></tr>
            ) : paginated.map((bus) => (
              <tr key={bus._id} className="hover:bg-surface-container-low transition-colors">
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
                <td className="px-4 py-3 text-neutral-500">{depotLabel(bus.depotId)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModal(bus)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="Edit">
                      <Icon name="edit" size={16} />
                    </button>
                    <button onClick={() => handleDelete(bus._id)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" title="Delete">
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <p className="text-xs text-on-surface-variant">Active Fleet Health</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900">{healthPct}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container">
            <div className="h-1.5 rounded-full bg-blue-600 transition-all" style={{ width: `${healthPct}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <p className="text-xs text-on-surface-variant">Maintenance Pending</p>
          <p className="mt-1 text-3xl font-bold text-red-600">{maintenanceBuses.length}</p>
          <p className="mt-1 text-xs text-on-surface-variant">Vehicles offline</p>
          <div className="mt-2 flex gap-1">
            {maintenanceBuses.slice(0, 4).map((b) => (
              <span key={b._id} className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                {b.regNumber?.split('-')[0]}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-blue-700 bg-blue-700 p-4 text-white">
          <p className="text-xs text-blue-200">Total Fleet</p>
          <p className="mt-1 text-3xl font-bold">{buses.length}</p>
          <p className="mt-1 text-xs text-blue-200">{activeBuses.length} active · {maintenanceBuses.length} in maintenance</p>
        </div>
      </div>

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

      <div id="fleet-add-trigger" className="hidden" />
    </>
  )
}

// ── Driver Personnel Tab ──────────────────────────────────────────────────────
function DriverModal({ driver, onClose, onSave }) {
  const [form, setForm] = useState(
    driver || { name: '', licenseNo: '', licenseExpiry: '', email: '', password: '', contactNo: '', workingHours: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (driver) {
        await api.put(`/drivers/${driver._id}`, form)
      } else {
        await api.post('/drivers', form)
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
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full Name</label>
            <input name="name" value={form.name} onChange={handle} required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">License Number</label>
              <input name="licenseNo" value={form.licenseNo} onChange={handle} required
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">License Expiry Date</label>
              <input name="licenseExpiry" type="date" value={form.licenseExpiry ? form.licenseExpiry.slice(0, 10) : ''} onChange={handle}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Contact Number</label>
            <input name="contactNo" value={form.contactNo} onChange={handle} required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Login Email</label>
              <input name="email" type="email" value={form.email} onChange={handle}
                placeholder="driver@transitlk.com"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Login Password</label>
              <input name="password" type="password" value={form.password} onChange={handle}
                placeholder="Min. 6 characters"
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Working Hours</label>
            <input name="workingHours" value={form.workingHours} onChange={handle}
              placeholder="e.g. 06:00 - 14:00"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
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

const DRIVER_STATUS_STYLES = {
  available: 'bg-green-100 text-green-700',
  'on trip':  'bg-blue-100 text-blue-700',
  'off duty': 'bg-gray-100 text-gray-500',
  expired:    'bg-red-100 text-red-700',
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

function DriversTab({ drivers, loading, onRefresh, addTrigger, onAddClose }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [viewDriver, setViewDriver] = useState(null)

  useEffect(() => { if (addTrigger) setModal('add') }, [addTrigger])

  const filtered = drivers.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.licenseNo || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter ? (d.workingHours || '').toLowerCase() === statusFilter : true
    const licStatus = getLicenseStatus(d.licenseExpiry)
    const matchLicense = licenseFilter
      ? (licenseFilter === 'valid' && licStatus?.label === 'Valid') ||
        (licenseFilter === 'expiring' && licStatus?.label === 'Expiring Soon') ||
        (licenseFilter === 'expired' && licStatus?.label === 'Expired') ||
        (licenseFilter === 'none' && !d.licenseExpiry)
      : true
    return matchSearch && matchStatus && matchLicense
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver?')) return
    await api.delete(`/drivers/${id}`)
    invalidatePageData('/buses')
    onRefresh({ keepContent: true, force: true })
  }

  // derive a short driver ID from mongo _id
  const driverId = (d) => `#DR-${d._id.slice(-4).toUpperCase()}`

  return (
    <>
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Filter drivers by name or ID..."
            className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900" />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="on trip">On Trip</option>
          <option value="off duty">Off Duty</option>
        </select>
        <select className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
          <option>All License Types</option>
          <option>Class A</option>
          <option>Class B</option>
          <option>Class C</option>
        </select>
        <select value={licenseFilter} onChange={(e) => { setLicenseFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900">
          <option value="">All License Status</option>
          <option value="valid">Valid</option>
          <option value="expiring">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="none">No Expiry Set</option>
        </select>        <span className="ml-auto text-sm text-on-surface-variant">
          Showing 1 to {Math.min(paginated.length, ITEMS_PER_PAGE)} of {filtered.length} drivers
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-sm">
          <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            <tr>
              <th className="px-4 py-3 text-left">Driver ID</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">License No.</th>
              <th className="px-4 py-3 text-left">Expiry</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Working Hours</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant bg-white">
            {loading && drivers.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-on-surface-variant">Loading...</td></tr>
            ) : paginated.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-on-surface-variant">No drivers found</td></tr>
            ) : paginated.map((d) => (
              <tr key={d._id} className="hover:bg-surface-container-low transition-colors">
                <td className="px-4 py-3 text-xs font-semibold text-blue-700">{driverId(d)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                      {getInitials(d.name)}
                    </div>
                    <span className="font-semibold text-neutral-900">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-neutral-700">{d.licenseNo}</td>
                <td className="px-4 py-3">
                  {d.licenseExpiry ? (() => {
                    const s = getLicenseStatus(d.licenseExpiry)
                    return (
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.style}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {s.label}
                        </span>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {new Date(d.licenseExpiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )
                  })() : <span className="text-xs text-neutral-400">—</span>}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs">{d.email || '—'}</td>
                <td className="px-4 py-3 text-neutral-600">{d.contactNo}</td>                <td className="px-4 py-3 text-neutral-600">{d.workingHours || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewDriver(d)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="View">
                      <Icon name="visibility" size={16} />
                    </button>
                    <button onClick={() => setModal(d)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container" title="Edit">
                      <Icon name="edit" size={16} />
                    </button>
                    <button onClick={() => handleDelete(d._id)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" title="Delete">
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total Drivers</p>
            <Icon name="group" size={20} className="text-outline" />
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{drivers.length}</p>
          <p className="mt-1 text-xs text-green-600">Registered in system</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Active Duty</p>
            <Icon name="directions_run" size={20} className="text-outline" />
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {drivers.filter((d) => d.workingHours).length}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">With assigned working hours</p>
        </div>
        <div className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Depot Assigned</p>
            <Icon name="warehouse" size={20} className="text-outline" />
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {drivers.length}
          </p>
          <p className="mt-1 text-xs text-on-surface-variant">Total registered</p>
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
                ['Contact', viewDriver.contactNo],
                ['Working Hours', viewDriver.workingHours || '—'],
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
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function Buses() {
  const stale = getStalePageData('/buses')
  const [buses, setBuses] = useState(() => stale?.buses || [])
  const [drivers, setDrivers] = useState(() => stale?.drivers || [])
  const [tab, setTab] = useState('fleet')
  const [showAddBus, setShowAddBus] = useState(false)
  const [showAddDriver, setShowAddDriver] = useState(false)

  const applyData = useCallback((payload) => {
    setBuses(payload?.buses || [])
    setDrivers(payload?.drivers || [])
  }, [])

  const { loading, reload } = useFastPageLoad('/buses', { applyData })

  return (
    <div className="w-full">
      <ModuleHeader
        title="Fleet & Drivers"
        subtitle="Manage your district vehicles and active driver roster."
        action={
          tab === 'drivers' ? (
            <ModulePrimaryButton icon="person_add" onClick={() => setShowAddDriver(true)}>
              Add New Driver
            </ModulePrimaryButton>
          ) : (
            <ModulePrimaryButton icon="add" onClick={() => setShowAddBus(true)}>
              Add New Vehicle
            </ModulePrimaryButton>
          )
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

    </div>
  )
}

export default Buses
