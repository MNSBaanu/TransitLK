import { Link } from 'react-router-dom'
import Brand from './Brand'

function Header() {
  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 shadow-card backdrop-blur-md">
        <Brand />
        <nav className="hidden items-center gap-1 text-sm font-medium text-on-surface-variant md:flex">
          {[['#features', 'Features'], ['#how-it-works', 'How it works'], ['#roles', 'Roles']].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full px-4 py-2 transition hover:bg-fleet-primary-light hover:text-depot-navy">
              {label}
            </a>
          ))}
        </nav>
        <Link
          to="/login"
          className="rounded-full bg-gradient-to-r from-depot-navy to-depot-blue-light px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:shadow-elevated hover:brightness-110"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}

export default Header
