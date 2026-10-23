import {
  Bus,
  CalendarClock,
  ChartColumn,
  Fuel,
  MessagesSquare,
  Route,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

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

function RouteVisual() {
  const stops = [[10, 70], [130, 20], [260, 40], [310, 20]]
  return (
    <svg viewBox="0 0 320 90" className="h-24 w-full" aria-hidden="true">
      <path
        d="M10 70 C 70 70, 70 20, 130 20 S 200 60, 260 40 S 300 20, 310 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="2 8"
        strokeLinecap="round"
        opacity="0.7"
      />
      {stops.map(([x, y]) => (
        <g key={x}>
          <circle cx={x} cy={y} r="11" fill="currentColor" opacity="0.2" />
          <circle cx={x} cy={y} r="5" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}

function TimetableVisual() {
  const rows = [['6%', '38%'], ['28%', '46%'], ['14%', '30%']]
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {rows.map(([left, width]) => (
        <div key={left} className="h-3 rounded-full bg-depot-navy/10">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-depot-navy to-depot-blue-light"
            style={{ marginLeft: left, width }}
          />
        </div>
      ))}
    </div>
  )
}

function ChatVisual() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <div className="h-8 w-3/5 rounded-2xl rounded-bl-sm bg-depot-navy/10" />
      <div className="ml-auto h-8 w-1/2 rounded-2xl rounded-br-sm bg-gradient-to-r from-depot-navy to-depot-blue-light" />
    </div>
  )
}

function RoleVisual() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[true, true, false].map((on, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 flex-1 rounded-full bg-white/15" />
          <div className={`flex h-5 w-9 items-center rounded-full px-0.5 ${on ? 'justify-end bg-depot-blue-light' : 'bg-white/20'}`}>
            <div className="h-4 w-4 rounded-full bg-white" />
          </div>
        </div>
      ))}
    </div>
  )
}

const FEATURE_STYLE = {
  'Route planning': { span: 'sm:col-span-2', tone: 'dark', Visual: RouteVisual },
  'Smart scheduling': { span: 'sm:col-span-2', tone: 'light', Visual: TimetableVisual },
  'Fleet & drivers': { tone: 'light' },
  Maintenance: { tone: 'dark' },
  'Fuel logging': { tone: 'light' },
  'Reports & analytics': { tone: 'dark' },
  'Messages & alerts': { span: 'sm:col-span-2', tone: 'light', Visual: ChatVisual },
  'Role-based access': { span: 'sm:col-span-2', tone: 'dark', Visual: RoleVisual },
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-depot-navy sm:text-4xl">
        Everything a depot needs
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-on-surface-variant">
        From the first route to the final report, TransitLK covers the full depot workflow.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: FeatureIcon, title, text }) => {
          const { span = '', tone, Visual } = FEATURE_STYLE[title]
          const dark = tone === 'dark'
          return (
            <div
              key={title}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 transition duration-300 hover:-translate-y-1 hover:shadow-elevated ${span} ${
                dark
                  ? 'border-transparent bg-gradient-to-br from-depot-navy to-depot-nav-bg-subtle text-white'
                  : 'border-outline-variant bg-white'
              }`}
            >
              {!Visual && (
                <FeatureIcon
                  size={120}
                  strokeWidth={1}
                  aria-hidden="true"
                  className={`pointer-events-none absolute -bottom-6 -right-6 transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${
                    dark ? 'text-white/10' : 'text-depot-navy/5'
                  }`}
                />
              )}
              <div className="relative">
                <div
                  className={`mb-5 inline-flex rounded-2xl p-3 ${
                    dark
                      ? 'bg-white/15 text-white'
                      : 'bg-gradient-to-br from-depot-navy to-depot-blue-light text-white'
                  }`}
                >
                  <FeatureIcon size={24} />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    dark ? 'text-blue-100' : 'text-on-surface-variant'
                  }`}
                >
                  {text}
                </p>
              </div>
              {Visual && (
                <div className={`relative mt-6 ${dark ? 'text-blue-200' : 'text-depot-blue-light'}`}>
                  <Visual />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Features
