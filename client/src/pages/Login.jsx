import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { homePathForRole, ROLE_LABELS } from '../config/roles'

const DEMO_ACCOUNTS = [
  { email: 'admin@transitlk.lk', role: 'administrator', hint: 'Full system access' },
  { email: 'scheduler@transitlk.lk', role: 'transport_scheduler', hint: 'Routes & schedules' },
  { email: 'fleet@transitlk.lk', role: 'fleet_manager', hint: 'Buses, drivers, maintenance' },
  { email: 'depot@transitlk.lk', role: 'depot_manager', hint: 'Dashboard & approvals' },
  { email: 'driver@transitlk.lk', role: 'driver', hint: 'Assigned trips only' },
]

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const profile = await login(email.trim(), password)
      navigate(homePathForRole(profile.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword('password123')
    setError('')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-container px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-depot-navy text-white">
            <Icon name="directions_bus" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">TransitLK</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Smart Route Management &amp; Scheduling
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-depot-navy"
              placeholder="you@transitlk.lk"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-on-surface-variant">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-outline-variant px-3 py-2.5 text-sm outline-none focus:border-depot-navy"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-depot-navy py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-depot-navy/90 disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 border-t border-outline-variant pt-6">
          <p className="mb-3 text-xs font-semibold uppercase text-on-surface-variant">
            Demo accounts (password: password123)
          </p>
          <ul className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email}>
                <button
                  type="button"
                  onClick={() => fillDemo(acc)}
                  className="w-full rounded-lg border border-outline-variant px-3 py-2 text-left text-sm transition-colors hover:bg-surface-container"
                >
                  <span className="font-semibold text-neutral-900">
                    {ROLE_LABELS[acc.role]}
                  </span>
                  <span className="block text-xs text-on-surface-variant">
                    {acc.email} — {acc.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Login
