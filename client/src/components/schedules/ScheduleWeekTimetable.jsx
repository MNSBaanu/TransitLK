import {
  formatTripDate,
  getWeekDayDates,
} from '../../utils/scheduleHelpers'
import ScheduleRouteTimetable from './ScheduleRouteTimetable'

function ScheduleWeekTimetable({ schedules, routes, focusDate, selectedId, onSelectTrip }) {
  const weekDays = getWeekDayDates(focusDate)

  return (
    <ScheduleRouteTimetable
      schedules={schedules}
      routes={routes}
      dayColumns={weekDays}
      focusDate={focusDate}
      period="weekly"
      selectedId={selectedId}
      onSelectTrip={onSelectTrip}
      footerNote={`Week of ${formatTripDate(weekDays[0])} — each cell shows departure and arrival times per route.`}
    />
  )
}

export default ScheduleWeekTimetable
