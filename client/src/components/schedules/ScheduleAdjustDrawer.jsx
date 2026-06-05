import ScheduleQuickAdjust from './ScheduleQuickAdjust'

function ScheduleAdjustDrawer({ open, onClose, ...adjustProps }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/40">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close adjust panel"
      />
      <div className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-none border-l border-outline-variant bg-white shadow-2xl xl:max-w-3xl">
        <ScheduleQuickAdjust {...adjustProps} onClose={onClose} />
      </div>
    </div>
  )
}

export default ScheduleAdjustDrawer
