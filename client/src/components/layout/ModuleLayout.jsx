import Icon from '../Icon'

/** Shared page chrome — TransitLK professional module layout */
export function ModuleHeader({ title, subtitle, action, large = false }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h2 className={large ? 'pro-page-title' : 'text-xl font-bold tracking-tight text-fleet-ink'}>
          {title}
        </h2>
        {subtitle && (
          <p className={large ? 'pro-page-subtitle' : 'mt-1 text-sm text-fleet-ink-muted'}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

export function ModulePrimaryButton({ children, onClick, icon, type = 'button', disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="btn-primary flex items-center gap-2 disabled:cursor-not-allowed"
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
      className="btn-outlined flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  )
}

export function ModuleStats({ items }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="pro-stat-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="label-caps">{item.label}</p>
            {item.icon && <Icon name={item.icon} size={18} className="text-fleet-ink-muted" />}
          </div>
          <p className="text-2xl font-bold tracking-tight text-fleet-ink">{item.value}</p>
          {item.hint && <p className="mt-1 text-xs text-fleet-ink-muted">{item.hint}</p>}
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
    <div className="flex flex-wrap items-center gap-3 border-b border-fleet-line bg-fleet-muted-low/50 px-5 py-4">
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
    <div className="overflow-x-auto rounded-xl border border-fleet-line bg-fleet-surface shadow-xs">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function ModuleToast({ message }) {
  if (!message) return null
  return (
    <div
      className="fixed left-1/2 top-20 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
      style={{ backgroundColor: 'var(--fleet-primary)', boxShadow: 'var(--shadow-elevated)' }}
    >
      <Icon name="check_circle" size={20} />
      {message}
    </div>
  )
}
