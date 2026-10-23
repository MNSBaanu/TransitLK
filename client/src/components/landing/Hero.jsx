import { Link } from 'react-router-dom'
import { ArrowRight, MapPin } from 'lucide-react'

function Hero() {
  return (
    <section className="relative -mt-[68px] overflow-hidden bg-gradient-to-br from-depot-nav-bg-subtle via-depot-navy to-depot-blue-light text-white">
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-depot-blue-light/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-32 sm:px-6 md:pb-28 md:pt-40 lg:grid-cols-2">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur">
            <MapPin size={14} /> Sri Lankan public transport
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Smart route management and scheduling for bus depots
          </h1>
          <p className="mt-5 max-w-xl text-base text-blue-100 sm:text-lg">
            Plan routes, build conflict-free timetables, manage your fleet and drivers, and keep
            every bus on the road, all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-depot-navy shadow-elevated transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              Get started <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-full border border-white/30 bg-white/5 px-7 py-3.5 font-semibold text-white backdrop-blur transition hover:bg-white/15"
            >
              Explore features
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl lg:rotate-2 lg:transition lg:duration-500 lg:hover:rotate-0">
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
              className="mb-2.5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3.5 text-sm transition hover:bg-white/20 last:mb-0"
            >
              <span className="font-bold tabular-nums">{time}</span>
              <span className="mx-3 flex-1 truncate">{route}</span>
              <span className="text-xs text-blue-200">{bus}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Hero
