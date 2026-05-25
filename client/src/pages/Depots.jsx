import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import {
  ModuleAlert,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'

function DepotModal({ depot, regionOptions, onClose, onSave }) {
  const isEdit = Boolean(depot)
  const [form, setForm] = useState(() => ({
    depotCode: depot?.depotCode || '',
    region: depot?.region || '',
    depotName: depot?.depotName || '',
    location: depot?.location || '',
    directContactNo: depot?.directContactNo || '',
    mobileContactNo: depot?.mobileContactNo || '',
    contactNo: depot?.contactNo || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        depotCode: form.depotCode.trim(),
        region: form.region.trim(),
        depotName: form.depotName.trim(),
        location: form.location.trim(),
        directContactNo: form.directContactNo.trim(),
        mobileContactNo: form.mobileContactNo.trim(),
        contactNo: form.contactNo.trim(),
      }

      if (isEdit) await api.put(`/depots/${depot._id}`, payload)
      else await api.post('/depots', payload)

      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save depot')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit depot' : 'Add depot'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Depot code</span>
            <input
              name="depotCode"
              value={form.depotCode}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm uppercase outline-none focus:border-neutral-900"
              placeholder="ML"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Region</span>
            <input
              name="region"
              value={form.region}
              onChange={handleChange}
              list="depot-region-options"
              required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
              placeholder="Enter region"
            />
            <datalist id="depot-region-options">
              {regionOptions.map((region) => (
                <option key={region} value={region} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Depot name</span>
            <input
              name="depotName"
              value={form.depotName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Location</span>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Direct contact</span>
            <input
              name="directContactNo"
              value={form.directContactNo}
              onChange={handleChange}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
              placeholder="081 - 2499148"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Mobile contact</span>
            <input
              name="mobileContactNo"
              value={form.mobileContactNo}
              onChange={handleChange}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
              placeholder="077 - 1057040"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Legacy contact (optional)</span>
            <input
              name="contactNo"
              value={form.contactNo}
              onChange={handleChange}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Depots() {
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState(null)

  const fetchDepots = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/depots')
      setDepots(Array.isArray(data) ? data : [])
    } catch {
      setDepots([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) fetchDepots()
    })
    return () => {
      cancelled = true
    }
  }, [fetchDepots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return depots
    return depots.filter(
      (depot) =>
        depot.depotCode?.toLowerCase().includes(q) ||
        depot.region?.toLowerCase().includes(q) ||
        depot.depotName?.toLowerCase().includes(q) ||
        depot.location?.toLowerCase().includes(q) ||
        depot.directContactNo?.toLowerCase().includes(q) ||
        depot.mobileContactNo?.toLowerCase().includes(q) ||
        depot.contactNo?.toLowerCase().includes(q)
    )
  }, [depots, search])

  const regionOptions = useMemo(
    () => [...new Set(depots.map((depot) => depot.region?.trim()).filter(Boolean))].sort(),
    [depots]
  )

  const handleSaved = async () => {
    setModal(null)
    setToast('Depot saved')
    await fetchDepots()
    setTimeout(() => setToast(''), 2500)
  }

  const handleDelete = async (depot) => {
    if (!window.confirm(`Remove ${depot.depotName}?`)) return
    try {
      await api.delete(`/depots/${depot._id}`)
      setToast('Depot removed')
      fetchDepots()
      setTimeout(() => setToast(''), 2500)
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not remove depot')
    }
  }

  return (
    <div className="w-full">
      <ModuleHeader
        title="Depot Management"
        subtitle="Create and maintain region-linked depot records used to scope administrators, staff, and operational data."
        action={
          <ModulePrimaryButton icon="add_business" onClick={() => setModal('add')}>
            Add depot
          </ModulePrimaryButton>
        }
      />

      <ModuleAlert
        variant="warning"
        title="Depots control administrator scope"
        body="Assign administrators to depots after creating region-backed depot master records here."
      />

      <ModuleStats
        items={[
          { label: 'Total depots', value: depots.length, icon: 'domain' },
          { label: 'Visible results', value: filtered.length, icon: 'travel_explore' },
          {
            label: 'Regions listed',
            value: new Set(depots.map((depot) => depot.region).filter(Boolean)).size,
            icon: 'map',
          },
        ]}
      />

      <div className="mb-4">
        <div className="relative max-w-md">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search depots by code, region, name, location, direct, or mobile..."
            className="w-full rounded-lg border border-outline-variant py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Contacts</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-on-surface-variant">
                  Loading depots...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-on-surface-variant">
                  No depots found.
                </td>
              </tr>
            ) : (
              filtered.map((depot) => (
                <tr key={depot._id} className="border-b border-outline-variant/60 last:border-0">
                  <td className="px-4 py-3 text-on-surface-variant">{depot.depotCode || '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{depot.region || '—'}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{depot.depotName}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{depot.location || '—'}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    <div className="space-y-1">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Direct:
                        </span>{' '}
                        {depot.directContactNo || '—'}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Mobile:
                        </span>{' '}
                        {depot.mobileContactNo || depot.contactNo || '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {depot.createdAt ? new Date(depot.createdAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModal(depot)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(depot)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <DepotModal
          depot={modal === 'add' ? null : modal}
          regionOptions={regionOptions}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      <ModuleToast message={toast} />
    </div>
  )
}

export default Depots
