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
import {
  ROLE_LABELS,
  ROLES,
  STAFF_ROLES,
  accessModulesForRole,
} from '../config/roles'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: ROLES.ADMINISTRATOR,
  depotId: '',
  isActive: true,
}

const ADMIN_ROLES = [ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR]

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

function UserModal({ user, depots, currentUser, onClose, onSave }) {
  const isEdit = Boolean(user)
  const isSuperadmin = currentUser?.role === ROLES.SUPERADMINISTRATOR
  const creatorDepotId = currentUser?.depotId?._id || currentUser?.depotId || ''
  const creatorDepotName = currentUser?.depotId?.depotName || 'Assigned depot'
  const isManagedAdmin = user?.accountType === 'admin'
  const initialRole = user?.role || (isSuperadmin ? ROLES.ADMINISTRATOR : ROLES.TRANSPORT_SCHEDULER)
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: initialRole,
    depotId: user?.depotId?._id || user?.depotId || creatorDepotId,
    isActive: user?.isActive !== false,
  }))
  const isAdminRole = ADMIN_ROLES.includes(form.role)
  const roleOptions = useMemo(() => {
    if (isEdit && isManagedAdmin) return ADMIN_ROLES
    if (isEdit && !isManagedAdmin) return STAFF_ROLES
    return isSuperadmin ? [...ADMIN_ROLES, ...STAFF_ROLES] : STAFF_ROLES
  }, [isEdit, isManagedAdmin, isSuperadmin])
  const availableDepots = useMemo(() => {
    if (isSuperadmin) return depots
    if (!creatorDepotId) return []
    const ownDepot = depots.find((depot) => String(depot._id) === String(creatorDepotId))
    if (ownDepot) return [ownDepot]
    return [
      {
        _id: creatorDepotId,
        depotName: creatorDepotName,
      },
    ]
  }, [creatorDepotId, creatorDepotName, depots, isSuperadmin])
  const depotRequired = form.role !== ROLES.SUPERADMINISTRATOR
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }
      if (name === 'role') {
        if (value === ROLES.SUPERADMINISTRATOR) next.depotId = ''
        else if (!isSuperadmin) next.depotId = creatorDepotId
      }
      return next
    })
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
        depotId: depotRequired ? form.depotId || creatorDepotId || undefined : undefined,
      }
      if (!isAdminRole) payload.isActive = form.isActive
      if (form.password) payload.password = form.password

      if (depotRequired && !payload.depotId) {
        setError('Depot assignment is required for this role')
        setSaving(false)
        return
      }

      if (isEdit) {
        if (isManagedAdmin) {
          await api.put(`/admins/${user._id}`, payload)
        } else {
          await api.put(`/users/${user._id}`, payload)
        }
      } else {
        if (!form.password) {
          setError('Password is required for new accounts')
          setSaving(false)
          return
        }
        if (isAdminRole) {
          await api.post('/admins', { ...payload, password: form.password })
        } else {
          await api.post('/users', { ...payload, password: form.password })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {isEdit ? 'Edit access account' : isSuperadmin ? 'Add workspace account' : 'Add depot staff'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-surface-container">
            <Icon name="close" size={20} />
          </button>
        </div>

        {isManagedAdmin && !isSuperadmin && (
          <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Administrator accounts can only be edited by a superadministrator.
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
              disabled={isManagedAdmin && !isSuperadmin}
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
              disabled={isManagedAdmin && !isSuperadmin}
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
              disabled={isManagedAdmin && !isSuperadmin}
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
              disabled={isEdit && isManagedAdmin && !isSuperadmin}
              className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
            >
              {roleOptions.map((r) => (
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
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Depot {depotRequired ? '' : '(not required)'}
            </label>
            {isSuperadmin ? (
              <select
                name="depotId"
                value={form.depotId}
                onChange={handle}
                disabled={!depotRequired}
                className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 disabled:bg-neutral-50"
              >
                <option value="">{depotRequired ? 'Select depot' : 'System-wide access'}</option>
                {availableDepots.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.depotName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg border border-outline-variant bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
                {creatorDepotName}
              </div>
            )}
          </div>
          {isEdit && !isAdminRole && (
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
            {(!isManagedAdmin || isSuperadmin) && (
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
  const { user } = useAuth()
  const isSuperadmin = user?.role === ROLES.SUPERADMINISTRATOR
  const [accounts, setAccounts] = useState([])
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users')
      setAccounts(data)
    } catch {
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchDepots = useCallback(async () => {
    if (!isSuperadmin) {
      setDepots([])
      return
    }
    try {
      const { data } = await api.get('/depots')
      setDepots(data)
    } catch {
      setDepots([])
    }
  }, [isSuperadmin])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(async () => {
      if (cancelled) return
      await fetchAccounts()
      if (!cancelled) await fetchDepots()
    })
    return () => {
      cancelled = true
    }
  }, [fetchAccounts, fetchDepots])

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
    const admins = accounts.filter((a) => a.accountType === 'admin')
    return {
      total: accounts.length,
      staff: staff.length,
      active: staff.filter((a) => a.isActive).length,
      admins: admins.length,
      superadmins: admins.filter((a) => a.role === ROLES.SUPERADMINISTRATOR).length,
    }
  }, [accounts])

  const handleDelete = async (account) => {
    if (account.accountType === 'admin' && !isSuperadmin) return
    if (account._id === user?._id) {
      window.alert('You cannot remove your own account while signed in.')
      return
    }
    if (!window.confirm(`Remove ${account.name}? They will lose system access.`)) return
    try {
      if (account.accountType === 'admin') {
        await api.delete(`/admins/${account._id}`)
      } else {
        await api.delete(`/users/${account._id}`)
      }
      setToast('Account removed')
      fetchAccounts()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not remove account')
    }
  }

  const handleSaved = () => {
    setModal(null)
    setToast('Account saved')
    fetchAccounts()
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="w-full">
      <ModuleHeader
        title="Users & Access"
        subtitle={
          isSuperadmin
            ? 'Manage superadministrators, Administrators, and staff access across the workspace.'
            : 'Manage staff who can sign in to the depot workspace and which modules they can use.'
        }
        action={
          <ModulePrimaryButton icon="person_add" onClick={() => setModal('add')}>
            {isSuperadmin ? 'Add account' : 'Add staff user'}
          </ModulePrimaryButton>
        }
      />

      <ModuleAlert
        variant="warning"
        title={isSuperadmin ? 'Administrator management' : 'Driver accounts are not managed here'}
        body={
          isSuperadmin
            ? 'Use this workspace to assign administrators to depots and maintain account access. Driver sign-in remains under Fleet & Drivers.'
            : 'Operational drivers and their login credentials are maintained under Fleet & Drivers.'
        }
      />

      <ModuleStats
        items={[
          { label: 'Workspace accounts', value: stats.total, icon: 'group' },
          { label: 'Depot staff', value: stats.staff, icon: 'person' },
          { label: 'Active staff', value: stats.active, hint: 'Can sign in' },
          {
            label: 'Administrators',
            value: stats.admins,
            hint: isSuperadmin ? `${stats.superadmins} superadministrators` : 'Depot access managers',
            icon: 'manage_accounts',
          },
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
                        {account.accountType === 'admin' && !isSuperadmin ? 'View' : 'Edit'}
                      </button>
                      {(account.accountType === 'user' || isSuperadmin) && (
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
          currentUser={user}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      <ModuleToast message={toast} />
    </div>
  )
}

export default Users
