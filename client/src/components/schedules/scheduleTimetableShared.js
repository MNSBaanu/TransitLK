export const ROUTE_COLUMN_CLASS =
  'sticky left-0 z-20 w-56 shrink-0 border-r border-outline-variant bg-white p-3'
export const ROUTE_HEADER_CLASS =
  'sticky left-0 z-40 w-56 shrink-0 border-r border-outline-variant bg-depot-navy/5 p-3 text-xs font-bold uppercase tracking-wide text-depot-navy'

export const TIMETABLE_SHELL_CLASS =
  'glass-subtle flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg'

export const TIMETABLE_SCROLL_CLASS = 'min-h-0 flex-1 overflow-auto'

export const TIMETABLE_HEADER_ROW_CLASS =
  'sticky top-0 z-30 flex border-b border-outline-variant bg-white/95 backdrop-blur-sm'

export const TIMETABLE_DATA_ROW_CLASS =
  'group flex border-b border-outline-variant transition-colors hover:bg-surface-container/50'

export const TIMETABLE_COLUMN_HEADER_CLASS =
  'px-1 py-2.5 text-center text-xs font-semibold tabular-nums tracking-wide text-on-surface-variant'

/** Day column width (weekly / monthly period grids) */
export const WEEKLY_DAY_COLUMN_PX = 176
export const MONTHLY_DAY_COLUMN_PX = 128

export function periodDayColumnWidth(period) {
  const width = period === 'monthly' ? MONTHLY_DAY_COLUMN_PX : WEEKLY_DAY_COLUMN_PX
  return {
    width,
    style: { width, minWidth: width },
  }
}

export function timetableTripButtonClass({ selected, conflict }) {
  if (conflict) {
    return 'w-full overflow-hidden rounded px-2 py-2 text-left text-white shadow-sm transition-all border-2 border-dashed border-red-600 bg-depot-navy schedule-conflict-hatch'
  }
  if (selected) {
    return 'w-full overflow-hidden rounded px-2 py-2 text-left text-white shadow-sm transition-all bg-depot-blue-light ring-2 ring-depot-navy ring-offset-1'
  }
  return 'w-full overflow-hidden rounded px-2 py-2 text-left text-white shadow-sm transition-all bg-depot-navy hover:bg-depot-navy/85'
}
