import ScheduleTripDetails from './ScheduleTripDetails'

function ScheduleTripDetailsDrawer({ open, onClose, ...detailsProps }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10003] flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close trip details panel"
      />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-none border-l border-outline-variant bg-white shadow-2xl xl:max-w-3xl">
        <ScheduleTripDetails {...detailsProps} onClose={onClose} />
      </div>
    </div>
  )
}

export default ScheduleTripDetailsDrawer
