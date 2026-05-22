import Icon from './Icon'

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-neutral-900 hover:bg-neutral-700'

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === 'danger' ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            <Icon name={variant === 'danger' ? 'warning' : 'help'} size={22} />
          </span>
          <div>
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-neutral-900">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="mt-1 text-sm text-on-surface-variant">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="min-w-[7rem] rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-w-[7rem] rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
