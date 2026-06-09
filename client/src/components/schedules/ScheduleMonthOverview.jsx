import {
  formatPeriodLabel,
  getMonthDayDates,
} from '../../utils/scheduleHelpers'
import ScheduleRouteTimetable from './ScheduleRouteTimetable'

function ScheduleMonthOverview({
  schedules,
  routes,
  focusDate,
  selectedId,
  onSelectTrip,
  onPickDay,
}) {
  const monthDays = getMonthDayDates(focusDate)

  return (
    <ScheduleRouteTimetable
      schedules={schedules}
      routes={routes}
      dayColumns={monthDays}
      focusDate={focusDate}
      period="monthly"
      selectedId={selectedId}
      onSelectTrip={onSelectTrip}
      onPickDay={onPickDay}
      footerNote={`${formatPeriodLabel('monthly', focusDate)} — routes down the side, days across the top. Click a day header to open the daily view.`}
    />
  )
}

export default ScheduleMonthOverview
