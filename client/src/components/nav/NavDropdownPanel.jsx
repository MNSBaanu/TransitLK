import { useEffect, useRef } from 'react'
import Icon from '../Icon'

function NavDropdownPanel({
  open,
  onClose,
  title,
  subtitle,
  width = 'w-80',
  children,
  footer,
  anchorRef,
  hideHeader = false,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (anchorRef?.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      onClose()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className={`glass-card absolute right-0 top-full z-[60] mt-2 max-w-[calc(100vw-2rem)] overflow-hidden ${width}`}
      role="dialog"
      aria-label={title || 'Panel'}
    >
      {!hideHeader ? (
        <div className="flex items-center justify-between border-b border-white/15 bg-depot-navy/95 px-4 py-3 backdrop-blur-md">
          <div>
            <h3 className="text-sm font-bold text-white">{title}</h3>
            {subtitle ? <p className="text-[11px] text-white/65">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : null}
      <div className="max-h-[min(420px,70vh)] overflow-y-auto">{children}</div>
      {footer ? (
        <div className="glass-subtle border-t border-white/40 px-3 py-2.5">{footer}</div>
      ) : null}
    </div>
  )
}

export default NavDropdownPanel
