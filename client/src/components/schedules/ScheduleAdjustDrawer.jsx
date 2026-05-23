import ScheduleQuickAdjust from './ScheduleQuickAdjust'

function ScheduleAdjustDrawer({ open, onClose, ...adjustProps }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-md flex-col bg-white shadow-2xl sm:max-w-md">
        <ScheduleQuickAdjust {...adjustProps} onClose={onClose} />
      </div>
    </div>
  )
}

export default ScheduleAdjustDrawer
