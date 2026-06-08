import Icon from '../Icon'

/** Shared page chrome — TransitLK professional module layout */
export function ModuleHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="pro-page-title">{title}</h2>
        {subtitle && <p className="pro-page-subtitle max-w-3xl">{subtitle}</p>}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function ModulePrimaryButton({ children, onClick, icon, type = 'button', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn-primary flex shrink-0 items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed"
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

export function ModuleSecondaryButton({ children, onClick, icon, type = 'button', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn-outlined flex shrink-0 items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

export function ModuleStats({ items }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-outline-variant bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {item.label}
            </p>
            {item.icon && <Icon name={item.icon} size={18} className="text-outline" />}
          </div>
          <p className="text-2xl font-bold text-neutral-900">{item.value}</p>
          {item.hint && (
            <p className={`mt-1 text-xs ${item.hintClass || 'text-neutral-900'}`}>{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function ModuleAlert({ title, body, actionLabel, onAction, variant = 'warning' }) {
  const styles =
    variant === 'error'
      ? 'border-red-200/80 bg-red-50 text-red-800'
      : 'border-amber-200/80 bg-amber-50 text-amber-900'
  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${styles}`}
    >
      <div className="flex items-center gap-3">
        <Icon name={variant === 'error' ? 'warning' : 'info'} size={20} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {body && <p className="text-xs opacity-90">{body}</p>}
        </div>
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="btn-accent text-xs">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ModuleCard({ children, className = '' }) {
  return <div className={`pro-card overflow-hidden ${className}`}>{children}</div>
}

export function ModuleToolbar({ children }) {
  return (
    <div className="glass-subtle flex flex-wrap items-center gap-3 border-b border-white/50 px-5 py-4">
      {children}
    </div>
  )
}

export function ModuleSearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Icon
        name="search"
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-fleet-ink-muted"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="search-field"
      />
    </div>
  )
}

export function ModuleTable({ children }) {
  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function ModuleToast({ message }) {
  if (!message) return null
  return (
    <div className="glass-dark fixed left-1/2 top-20 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
      <Icon name="check_circle" size={20} />
      {message}
    </div>
  )
}
