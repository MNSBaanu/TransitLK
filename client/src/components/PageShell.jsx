function PageShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-5xl">
      {title && (
        <header className="mb-6">
          <h2 className="text-2xl font-bold text-fleet-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-fleet-ink-muted">{subtitle}</p>}
        </header>
      )}
      <div className="rounded border border-fleet-line bg-fleet-surface p-6 shadow-sm">
        {children}
      </div>
    </div>
  )
}

export default PageShell
