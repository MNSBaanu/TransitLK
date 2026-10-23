import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

function CallToAction() {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-depot-nav-bg-subtle via-depot-navy to-depot-blue-light px-6 py-16 text-center text-white shadow-elevated">
        <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-depot-blue-light/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
        <h2 className="relative text-3xl font-bold sm:text-4xl">Ready to run a smarter depot?</h2>
        <Link
          to="/login"
          className="group relative mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 font-semibold text-depot-navy shadow-elevated transition hover:-translate-y-0.5 hover:bg-blue-50"
        >
          Sign in to TransitLK <ArrowRight size={18} className="transition group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  )
}

export default CallToAction
