function PageShell({ title, subtitle, children }) {
  return (
    <div className="mx-auto max-w-5xl">
      {title && (
        <header className="mb-6">
          <h2 className="pro-page-title">{title}</h2>
          {subtitle && <p className="pro-page-subtitle">{subtitle}</p>}
        </header>
      )}
      <div className="glass-card p-6 lg:p-8">{children}</div>
    </div>
  )
}

export default PageShell
