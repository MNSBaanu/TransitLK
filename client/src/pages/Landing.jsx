import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bus,
  CalendarClock,
  ChartColumn,
  Fuel,
  MapPin,
  MessagesSquare,
  Route,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react'
import { ROLE_LABELS, ROLES } from '../config/roles'

const FEATURES = [
  {
    icon: Route,
    title: 'Route planning',
    text: 'Create and manage routes with Google Maps integration.',
  },
  {
    icon: CalendarClock,
    title: 'Smart scheduling',
    text: 'Daily timetables with conflict detection and depot approval workflow.',
  },
  {
    icon: Bus,
    title: 'Fleet & drivers',
    text: 'Manage buses and drivers, with CSV bulk import.',
  },
  {
    icon: Wrench,
    title: 'Maintenance',
    text: 'Track service history and keep every bus road-ready.',
  },
  {
    icon: Fuel,
    title: 'Fuel logging',
    text: 'Record fuel consumption and monitor running costs.',
  },
  {
    icon: ChartColumn,
    title: 'Reports & analytics',
    text: 'Operational insights with PDF export.',
  },
  {
    icon: MessagesSquare,
    title: 'Messages & alerts',
    text: 'Keep depot staff and drivers in sync with in-app messaging and notifications.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    text: 'Separate workspaces from superadministrator to driver.',
  },
]

const STEPS = [
  { title: 'Plan routes', text: 'Define routes and stops for your depot network.' },
  { title: 'Build timetables', text: 'Assign buses and drivers to trips without conflicts.' },
  { title: 'Approve & operate', text: 'Depot managers approve schedules; drivers see their trips.' },
]

const PORTAL_ROLES = [
  ROLES.SUPERADMINISTRATOR,
  ROLES.ADMINISTRATOR,
  ROLES.TRANSPORT_SCHEDULER,
  ROLES.FLEET_MANAGER,
  ROLES.DEPOT_MANAGER,
  ROLES.DRIVER,
]

function Brand({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`rounded p-1.5 ${light ? 'bg-white' : 'bg-depot-navy'}`}>
        <Bus size={20} className={light ? 'text-depot-navy' : 'text-white'} />
      </div>
      <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-depot-navy'}`}>
        TransitLK
      </span>
    </div>
  )
}

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-fleet-ink">
      <header className="sticky top-0 z-20 border-b border-outline-variant bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Brand />
          <nav className="hidden items-center gap-6 text-sm font-medium text-on-surface-variant md:flex">
            <a href="#features" className="hover:text-depot-navy">Features</a>
            <a href="#how-it-works" className="hover:text-depot-navy">How it works</a>
            <a href="#roles" className="hover:text-depot-navy">Roles</a>
          </nav>
          <Link
            to="/login"
            className="rounded-lg bg-depot-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-depot-nav-bg-subtle"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="bg-depot-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-depot-blue-muted">
              <MapPin size={14} /> Sri Lankan public transport
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              Smart route management and scheduling for bus depots
            </h1>
            <p className="mt-5 max-w-xl text-base text-blue-100 sm:text-lg">
              Plan routes, build conflict-free timetables, manage your fleet and drivers, and keep
              every bus on the road, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-depot-navy transition hover:bg-blue-50"
              >
                Get started <ArrowRight size={18} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Explore features
              </a>
            </div>
          </div>

          <div className="rounded-xl bg-white/10 p-6 shadow-elevated ring-1 ring-white/15">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold">
              <span>Today&apos;s timetable</span>
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-200">
                Approved
              </span>
            </div>
            {[
              ['06:00', 'Colombo Fort → Kandy', 'NB-4521'],
              ['07:30', 'Colombo Fort → Galle', 'NA-1187'],
              ['09:15', 'Kandy → Jaffna', 'NC-9034'],
            ].map(([time, route, bus]) => (
              <div
                key={time}
                className="mb-2 flex items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm last:mb-0"
              >
                <span className="font-bold tabular-nums">{time}</span>
                <span className="mx-3 flex-1 truncate">{route}</span>
                <span className="text-xs text-blue-200">{bus}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-depot-navy sm:text-4xl">
          Everything a depot needs
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-on-surface-variant">
          From the first route to the final report, TransitLK covers the full depot workflow.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: FeatureIcon, title, text }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-outline-variant bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-depot-blue-muted hover:shadow-elevated"
            >
              <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-depot-navy to-depot-blue-light transition-transform duration-300 group-hover:scale-x-100" />
              <div className="mb-4 inline-flex rounded-xl bg-fleet-primary-light p-3 text-depot-navy transition-colors duration-200 group-hover:bg-depot-navy group-hover:text-white">
                <FeatureIcon size={24} />
              </div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 bg-fleet-tertiary-light">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-depot-navy sm:text-4xl">How it works</h2>
          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16.7%] right-[16.7%] top-7 hidden border-t-2 border-dashed border-depot-blue-muted md:block" />
            {STEPS.map(({ title, text }, i) => (
              <div
                key={title}
                className="relative rounded-2xl border border-outline-variant bg-white p-6 pt-10 text-center shadow-card"
              >
                <div className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border-4 border-fleet-tertiary-light bg-depot-navy text-xl font-bold text-white shadow-elevated">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roles" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-depot-navy">Built for every role</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {PORTAL_ROLES.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-white px-4 py-2 text-sm font-medium text-depot-navy shadow-xs"
            >
              <Users size={16} /> {ROLE_LABELS[role]}
            </span>
          ))}
        </div>
      </section>

      <section className="bg-depot-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Ready to run a smarter depot?</h2>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-depot-navy transition hover:bg-blue-50"
          >
            Sign in to TransitLK <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="bg-depot-nav-bg-subtle text-blue-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm sm:flex-row sm:px-6">
          <Brand light />
          <span>&copy; {new Date().getFullYear()} TransitLK. Smart Route Management &amp; Scheduling.</span>
        </div>
      </footer>
    </div>
  )
}

export default Landing
