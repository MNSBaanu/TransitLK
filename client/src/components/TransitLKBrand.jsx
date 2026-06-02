export function getUserDepotCode(user) {
  if (!user?.depotId || typeof user.depotId !== 'object') return null
  return user.depotId.depotCode || null
}

function TransitLKBrand({ depotCode, variant = 'nav', className = '' }) {
  const badgeClass =
    variant === 'nav'
      ? 'rounded-md border border-white/30 bg-white/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white'
      : variant === 'sidebar'
        ? 'rounded-md border border-depot-blue-light/40 bg-depot-blue-light/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-depot-blue-light'
        : 'rounded-md border border-outline-variant bg-surface-container px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant'

  const textClass =
    variant === 'nav'
      ? 'font-sans text-lg font-bold tracking-tight sm:text-xl'
      : variant === 'sidebar'
        ? 'text-lg font-bold tracking-tight text-[var(--sidebar-text)]'
        : 'text-lg font-bold tracking-tight text-neutral-900'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className={textClass}>TransitLK</span>
      {depotCode ? (
        <span className={badgeClass} title={`Depot ${depotCode}`}>
          {depotCode}
        </span>
      ) : null}
    </span>
  )
}

export default TransitLKBrand
