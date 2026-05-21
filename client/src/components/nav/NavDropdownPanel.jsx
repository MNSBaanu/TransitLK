import { useEffect, useRef } from 'react'
import Icon from '../Icon'

function NavDropdownPanel({ open, onClose, title, width = 'w-80', children, footer, anchorRef }) {
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
      className={`absolute right-0 top-full z-[60] mt-2 ${width} overflow-hidden rounded-xl border border-outline-variant bg-white shadow-xl`}
      role="dialog"
      aria-label={title}
    >
      <div className="flex items-center justify-between border-b border-outline-variant bg-[#000249] px-4 py-3">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1 text-white/80 hover:bg-white/10"
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div className="max-h-[min(420px,70vh)] overflow-y-auto">{children}</div>
      {footer ? (
        <div className="border-t border-outline-variant bg-surface-container/40 px-3 py-2">{footer}</div>
      ) : null}
    </div>
  )
}

export default NavDropdownPanel
