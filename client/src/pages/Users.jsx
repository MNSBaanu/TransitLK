import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import api from '../services/api'
import {
  ModuleAlert,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
import {
  ROLE_LABELS,
  ROLES,
  STAFF_ROLES,
  accessModulesForRole,
} from '../config/roles'

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: ROLES.TRANSPORT_SCHEDULER,
  depotId: '',
  isActive: true,
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

function UserModal({ user, depots, onClose, onSave }) {
  const isEdit = Boolean(user)
  const isAdmin = user?.accountType === 'admin'
  const [form, setForm] = useState(() => {
    if (!user) return { ...EMPTY_FORM }
    return {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      depotId: user.depotId?._id || user.depotId || '',
      isActive: user.isActive !== false,
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        depotId: form.depotId || undefined,
        isActive: form.isActive,
      }
      if (form.password) payload.password = form.password

      if (isEdit) {
        await api.put(`/users/${user._id}`, payload)
      } else {
        if (!form.password) {
          setError('Password is required for new users')
          setSaving(false)
          return
        }
        await api.post('/users', { ...payload, password: form.password })
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit staff access' : 'Add depot staff'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>

        {isAdmin && (
          <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Administrator accounts have full depot access and cannot be edited here.
          </p>
        )}

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Full name</label>
            <input
              name="name"
              value={form.name}
              onChange={handle}
              required
              disabled={isAdmin}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Email (login)</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handle}
              required
              disabled={isAdmin}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              {isEdit ? 'New password (optional)' : 'Password'}
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              required={!isEdit}
              disabled={isAdmin}
              minLength={6}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handle}
              disabled={isAdmin}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-on-surface-variant">
              Access: {accessModulesForRole(form.role).join(' · ')}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">Depot (optional)</label>
            <select
              name="depotId"
              value={form.depotId}
              onChange={handle}
              disabled={isAdmin}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            >
              <option value="">All depots / unassigned</option>
              {depots.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.depotName}
                </option>
              ))}
            </select>
          </div>
          {isEdit && !isAdmin && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handle}
                className="rounded border-outline-variant"
              />
              Account active (can sign in)
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium hover:bg-surface-container"
            >
              Cancel
            </button>
            {!isAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

function Users() {
  const [accounts, setAccounts] = useState([])
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setAccounts(data)
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
    api.get('/depots').then(({ data }) => setDepots(data)).catch(() => setDepots([]))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter(
      (a) =>
        a.name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        ROLE_LABELS[a.role]?.toLowerCase().includes(q)
    )
  }, [accounts, search])

  const stats = useMemo(() => {
    const staff = accounts.filter((a) => a.accountType === 'user')
    return {
      total: accounts.length,
      staff: staff.length,
      active: staff.filter((a) => a.isActive).length,
      admins: accounts.filter((a) => a.accountType === 'admin').length,
    }
  }, [accounts])

  const handleDelete = async (account) => {
    if (account.accountType === 'admin') return
    if (!window.confirm(`Remove ${account.name}? They will lose system access.`)) return
    try {
      await api.delete(`/users/${account._id}`)
      setToast('User removed')
      fetchAccounts()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not remove user')
    }
  }

  const handleSaved = () => {
    setModal(null)
    setToast('User saved')
    fetchAccounts()
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="w-full">
      <ModuleHeader
        title="Users & Access"
        subtitle="Manage who can sign in to the depot workspace and which modules they can use."
        action={
          <ModulePrimaryButton icon="person_add" onClick={() => setModal('add')}>
            Add staff user
          </ModulePrimaryButton>
        }
      />

      <ModuleAlert
        variant="warning"
        title="Driver accounts are not managed here"
        body="Operational drivers and their login credentials are maintained under Fleet & Drivers."
      />

      <ModuleStats
        items={[
          { label: 'Workspace accounts', value: stats.total, icon: 'group' },
          { label: 'Depot staff', value: stats.staff, icon: 'person' },
          { label: 'Active staff', value: stats.active, hint: 'Can sign in' },
          { label: 'Administrators', value: stats.admins, icon: 'manage_accounts' },
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
            placeholder="Search by name, email, or role..."
            className="w-full rounded-lg border border-outline-variant py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Depot</th>
              <th className="px-4 py-3">System access</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-on-surface-variant">
                  Loading accounts...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-on-surface-variant">
                  No accounts match your search.
                </td>
              </tr>
            ) : (
              filtered.map((account) => (
                <tr key={account._id} className="border-b border-outline-variant/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{account.name}</p>
                    <p className="text-xs text-on-surface-variant">{account.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                      {ROLE_LABELS[account.role] || account.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {account.depotId?.depotName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <AccessBadges role={account.role} />
                  </td>
                  <td className="px-4 py-3">
                    {account.isActive ? (
                      <span className="text-xs font-medium text-green-700">Active</span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">Deactivated</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setModal(account)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-slate-100"
                      >
                        {account.accountType === 'admin' ? 'View' : 'Edit'}
                      </button>
                      {account.accountType === 'user' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(account)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <UserModal
          user={modal === 'add' ? null : modal}
          depots={depots}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      <ModuleToast message={toast} />
    </div>
  )
}

export default Users
