import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { homePathForRole } from '../config/roles'

const DEPOT_HERO_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBDCt9bXCsB5Vh1MjlQPOYo_zmY5Yp4geBhw88f-25Mjcj-PZ41qc6IBNR0walea0YgFyBba9rRVByabqc9va-4BFPH3Fc5vf15VKGu4RWcTuPZS7Do-TVjrl-JigmeOfUeCvwbTOoypo6wuXRrii2VC5CDfIv8EbDFQuZilPAs6MD3bdm2PznK3UT_FmGhQuqs2Hfa8TAYiWkUT6xtUfSWTMkxmJmFf9KfrI5U5VRpnzfJEqRveQTlz3ZUoJvObh2Kon3b4kwCsag'

const REMEMBER_EMAIL_KEY = 'transitlk_remember_email'

function LoginBrand({ iconSize = 24, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="rounded bg-white p-1 shadow-sm">
        <Icon name="directions_bus" size={iconSize} className="text-depot-navy" />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight leading-none">TransitLK</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
          Smart Route Management &amp; Scheduling
        </span>
      </div>
    </div>
  )
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const profile = await login(email.trim(), password)
      if (remember) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim())
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
      navigate(homePathForRole(profile.role), { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen overflow-x-hidden bg-surface text-fleet-ink">
      {/* Left: TransitLK branding & hero */}
      <section className="relative hidden overflow-hidden bg-depot-navy lg:flex lg:w-1/2">
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url('${DEPOT_HERO_IMAGE}')` }}
          role="img"
          aria-label="Sri Lankan public transport buses at a modern depot"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(30, 58, 138, 0.9) 0%, rgba(30, 58, 138, 0.45) 100%)',
          }}
        />
        <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
          <LoginBrand className="text-white [&_span]:text-white" />

          <div className="max-w-md">
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-white">
              Digital Depot Operations
              <br />
              for Sri Lankan Transit.
            </h1>
            <p className="text-base leading-relaxed text-depot-blue-muted">
              TransitLK replaces manual scheduling and fragmented spreadsheets with one platform
              for routes, timetables, fleet, drivers, maintenance, and depot reporting — built
              for public transport operations across Sri Lanka.
            </p>
          </div>

          <div className="flex gap-6 border-t border-white/20 pt-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Platform
              </p>
              <p className="flex items-center gap-1 text-sm font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                TransitLK Online
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Core Modules
              </p>
              <p className="text-sm font-medium text-white">Routes · Schedules · Fleet</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                Coverage
              </p>
              <p className="text-sm font-medium text-white">Sri Lanka</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right: login form */}
      <section className="flex w-full flex-col items-center justify-center bg-white p-4 md:p-8 xl:p-10 lg:w-1/2">
        <LoginBrand iconSize={28} className="mb-8 text-depot-navy lg:hidden" />

        <div className="w-full max-w-sm">
          <header className="mb-8">
            <h2 className="text-xl font-semibold text-fleet-ink">Sign in to TransitLK</h2>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
              >
                Work Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon name="person" size={20} className="text-outline" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                  placeholder="Enter your work email"
                  className="block w-full rounded border border-outline-variant bg-white py-2 pl-10 pr-4 text-sm text-fleet-ink placeholder-outline transition-all focus:border-depot-navy focus:outline-none focus:ring-2 focus:ring-depot-navy"
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant"
                >
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-depot-navy hover:underline"
                  onClick={() =>
                    setError(
                      'Password recovery is not available yet. Contact your depot administrator.'
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock size={20} strokeWidth={1.75} className="text-outline" aria-hidden />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="block w-full rounded border border-outline-variant bg-white py-2 pl-10 pr-4 text-sm text-fleet-ink placeholder-outline transition-all focus:border-depot-navy focus:outline-none focus:ring-2 focus:ring-depot-navy"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant text-depot-navy focus:ring-depot-navy"
              />
              <label htmlFor="remember" className="ml-2 block text-xs text-on-surface-variant">
                Remember this device
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded bg-depot-navy px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-depot-nav-bg-subtle active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in to TransitLK'}
              <Icon
                name="arrow_forward"
                size={20}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login
