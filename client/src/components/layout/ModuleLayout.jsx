import Icon from '../Icon'

/** Shared page chrome aligned with Fleet & Maintenance modules */
export function ModuleHeader({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>}
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
      className="flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-60"
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
        <div
          key={item.label}
          className="rounded-xl border border-outline-variant bg-white p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {item.label}
            </p>
            {item.icon && <Icon name={item.icon} size={18} className="text-outline" />}
          </div>
          <p className="text-2xl font-bold text-neutral-900">{item.value}</p>
          {item.hint && (
            <p className="mt-1 text-xs text-on-surface-variant">{item.hint}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export function ModuleAlert({ title, body, actionLabel, onAction, variant = 'warning' }) {
  const styles =
    variant === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800'
  return (
    <div
      className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${styles}`}
    >
      <div className="flex items-center gap-3">
        <Icon name={variant === 'error' ? 'warning' : 'info'} size={20} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {body && <p className="text-xs opacity-90">{body}</p>}
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export function ModuleCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-outline-variant bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

export function ModuleToolbar({ children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-outline-variant px-5 pb-4 pt-4">
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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
      />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-outline-variant bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-900"
      />
    </div>
  )
}

export function ModuleTable({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

export function ModuleToast({ message }) {
  if (!message) return null
  return (
    <div className="fixed left-1/2 top-20 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
      <Icon name="check_circle" size={20} />
      {message}
    </div>
  )
}
