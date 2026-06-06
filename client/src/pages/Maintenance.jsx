// Assigned to: Irfa
// Module: Fuel & Maintenance Log

import { useState, useEffect, useMemo, useCallback } from 'react'
import Icon from '../components/Icon'
import api from '../services/api'
import { useFastPageLoad } from '../hooks/useFastPageLoad'
import { getStalePageData, invalidatePageData } from '../services/pagePrefetch'
import { ModuleHeader, ModulePrimaryButton } from '../components/layout/ModuleLayout'

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
function MaintenanceModal({ record, onClose, onSave }) {
  const [form, setForm] = useState(
    record
      ? { bus_id: record.bus_id?._id || record.bus_id, service_date: record.service_date?.slice(0, 10), description: record.description, cost: record.cost }
      : { bus_id: '', service_date: '', description: '', cost: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (record) {
        await api.put(`/maintenance/${record._id}`, form)
      } else {
        await api.post('/maintenance', form)
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
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Service Date</label>
            <input name="service_date" type="date" value={form.service_date} onChange={handle} required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Description / Service Type</label>
            <input name="description" value={form.description} onChange={handle} required placeholder="e.g. Oil Change, Brake Check"
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Cost (LKR)</label>
            <input name="cost" type="number" value={form.cost} onChange={handle} required
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

// ── Fuel Modal ────────────────────────────────────────────────────────────────
function FuelModal({ record, onClose, onSave }) {
  const [form, setForm] = useState(
    record
      ? { bus_id: record.bus_id?._id || record.bus_id, fuel_date: record.fuel_date?.slice(0, 10), liters: record.liters, amount: record.amount }
      : { bus_id: '', fuel_date: '', liters: '', amount: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
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
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Fuel Date</label>
            <input name="fuel_date" type="date" value={form.fuel_date} onChange={handle} required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Liters</label>
              <input name="liters" type="number" step="0.1" value={form.liters} onChange={handle} required
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Amount (LKR)</label>
              <input name="amount" type="number" value={form.amount} onChange={handle} required
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900" />
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

// ── Main Page ─────────────────────────────────────────────────────────────────
function Maintenance() {
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
  const maintenanceOverdue = maintenance.filter((r) => r.bus_id?.status === 'in maintenance')

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
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Avg Fuel Efficiency</p>
            <Icon name="local_gas_station" size={18} className="text-outline" />
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            {fuelLogs.length ? (summary.totalLiters / fuelLogs.length).toFixed(1) : '—'} <span className="text-sm font-normal">km/L</span>
          </p>
          <p className="mt-1 text-xs text-green-600">↑ Based on {fuelLogs.length} entries</p>
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
          </div>        </div>

        <div className="p-5">
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
