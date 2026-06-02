import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import api from '../services/api'
import {
  ModuleAlert,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
import { ROLE_LABELS, ROLES, accessModulesForRole } from '../config/roles'
import { useAuth } from '../context/AuthContext'

const ADMIN_ROLES = [ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR]

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: ROLES.ADMINISTRATOR,
  depotId: '',
}

function AccessBadges({ role }) {
  const modules = accessModulesForRole(role)
  return (
    <div className="flex flex-wrap gap-1">
      {modules.map((mod) => (
        <span
          key={mod}
          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
        >
          {mod}
        </span>
      ))}
    </div>
  )
}

function AdminModal({ admin, depots, onClose, onSave }) {
  const isEdit = Boolean(admin)
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    name: admin?.name || '',
    email: admin?.email || '',
    password: '',
    role: admin?.role || ROLES.ADMINISTRATOR,
    depotId: admin?.depotId?._id || admin?.depotId || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'role' && value === ROLES.SUPERADMINISTRATOR) {
        next.depotId = ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        depotId: form.role === ROLES.ADMINISTRATOR ? form.depotId || undefined : undefined,
      }
      if (form.password) payload.password = form.password

      if (form.role === ROLES.ADMINISTRATOR && !payload.depotId) {
        setError('Depot assignment is required for administrators')
        setSaving(false)
        return
      }

      if (isEdit) {
        await api.put(`/admins/${admin._id}`, payload)
      } else {
        if (!form.password) {
          setError('Password is required for new administrators')
          setSaving(false)
          return
        }
        await api.post('/admins', { ...payload, password: form.password })
      }

      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save administrator')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit administrator' : 'Add administrator'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Full name</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              {isEdit ? 'New password (optional)' : 'Password'}
            </span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!isEdit}
              minLength={6}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">Role</span>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
            >
              {ADMIN_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">
              Depot {form.role === ROLES.SUPERADMINISTRATOR ? '(not required)' : ''}
            </span>
            <select
              name="depotId"
              value={form.depotId}
              onChange={handleChange}
              disabled={form.role === ROLES.SUPERADMINISTRATOR}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            >
              <option value="">
                {form.role === ROLES.SUPERADMINISTRATOR ? 'System-wide access' : 'Select depot'}
              </option>
              {depots.map((depot) => (
                <option key={depot._id} value={depot._id}>
                  {`${depot.depotCode || '—'} - ${depot.depotName}`}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            Access: {accessModulesForRole(form.role).join(' · ')}
          </div>
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

function Admins() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState([])
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/admins')
      setAdmins(Array.isArray(data) ? data : [])
    } catch {
      setAdmins([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepots = useCallback(async () => {
    try {
      const { data } = await api.get('/depots')
      setDepots(Array.isArray(data) ? data : [])
    } catch {
      setDepots([])
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(async () => {
      if (cancelled) return
      await fetchAdmins()
      if (!cancelled) await fetchDepots()
    })
    return () => {
      cancelled = true
    }
  }, [fetchAdmins, fetchDepots])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(
      (admin) =>
        admin.name?.toLowerCase().includes(q) ||
        admin.email?.toLowerCase().includes(q) ||
        ROLE_LABELS[admin.role]?.toLowerCase().includes(q) ||
        admin.depotId?.depotName?.toLowerCase().includes(q) ||
        admin.depotId?.depotCode?.toLowerCase().includes(q) ||
        admin.depotId?.region?.toLowerCase().includes(q)
    )
  }, [admins, search])

  const stats = useMemo(() => {
    return {
      total: admins.length,
      superadmins: admins.filter((admin) => admin.role === ROLES.SUPERADMINISTRATOR).length,
      administrators: admins.filter((admin) => admin.role === ROLES.ADMINISTRATOR).length,
    }
  }, [admins])

  const handleDelete = async (admin) => {
    if (admin._id === user?._id) {
      window.alert('You cannot remove your own account while signed in.')
      return
    }
    if (!window.confirm(`Remove ${admin.name}? They will lose administrator access.`)) return
    try {
      await api.delete(`/admins/${admin._id}`)
      setToast('Administrator removed')
      fetchAdmins()
      setTimeout(() => setToast(''), 2500)
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not remove administrator')
    }
  }

  const handleSaved = () => {
    setModal(null)
    setToast('Administrator saved')
    fetchAdmins()
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="w-full">
      <ModuleHeader
        title="Administrator Management"
        subtitle="Create superadministrators and Administrators, then assign depot ownership for system-wide control."
        action={
          <ModulePrimaryButton icon="manage_accounts" onClick={() => setModal('add')}>
            Add administrator
          </ModulePrimaryButton>
        }
      />

      <ModuleAlert
        variant="warning"
        title="Administrator credentials are stored in the admin collection"
        body="Superadministrators and administrators sign in through admin accounts in the database, not the staff users collection."
      />

      <ModuleStats
        items={[
          { label: 'Admin accounts', value: stats.total, icon: 'manage_accounts' },
          { label: 'Superadmins', value: stats.superadmins, icon: 'shield_person' },
          { label: 'Administrators', value: stats.administrators, icon: 'person' },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, role, or depot..."
            className="w-full rounded-lg border border-outline-variant py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3">Administrator</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">System access</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">
                  Loading administrators...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-on-surface-variant">
                  No administrators match your search.
                </td>
              </tr>
            ) : (
              filtered.map((admin) => (
                <tr key={admin._id} className="border-b border-outline-variant/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{admin.name}</p>
                    <p className="text-xs text-on-surface-variant">{admin.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                      {ROLE_LABELS[admin.role] || admin.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {admin.depotId
                      ? `${admin.depotId.depotCode || '—'} - ${admin.depotId.depotName}`
                      : 'System-wide'}
                  </td>
                  <td className="px-4 py-3">
                    <AccessBadges role={admin.role} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModal(admin)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(admin)}
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
        <AdminModal
          admin={modal === 'add' ? null : modal}
          depots={depots}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      <ModuleToast message={toast} />
    </div>
  )
}

export default Admins
