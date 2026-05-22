const GANTT_START_MIN = 6 * 60
const GANTT_END_MIN = 24 * 60
const GANTT_SPAN = GANTT_END_MIN - GANTT_START_MIN

export function timeToMinutes(time) {
  if (!time?.trim()) return null
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function timesOverlap(depA, arrA, depB, arrB) {
  const a = timeToMinutes(depA)
  const b = timeToMinutes(arrA)
  const c = timeToMinutes(depB)
  const d = timeToMinutes(arrB)
  if ([a, b, c, d].some((v) => v == null)) return false
  return a < d && c < b
}

export function ganttPosition(departureTime, arrivalTime) {
  const start = timeToMinutes(departureTime)
  const end = timeToMinutes(arrivalTime)
  if (start == null || end == null || end <= start) return null
  const left = ((start - GANTT_START_MIN) / GANTT_SPAN) * 100
  const width = ((end - start) / GANTT_SPAN) * 100
  if (left + width <= 0 || left >= 100) return null
  return {
    left: Math.max(0, left),
    width: Math.min(100 - Math.max(0, left), width),
  }
}

export function formatTripDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function toDateInputValue(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfWeekDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateInputValue(d)
}

export function endOfWeekDate(dateStr) {
  const d = new Date(startOfWeekDate(dateStr))
  d.setDate(d.getDate() + 6)
  return toDateInputValue(d)
}

export function getWeekDayDates(anchorDate) {
  const start = startOfWeekDate(anchorDate)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    days.push(toDateInputValue(d))
  }
  return days
}

export function getMonthDayDates(anchorDate) {
  const d = new Date(anchorDate)
  const year = d.getFullYear()
  const month = d.getMonth()
  const last = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let day = 1; day <= last; day++) {
    days.push(toDateInputValue(new Date(year, month, day)))
  }
  return days
}

/** Dates covered when building a daily, weekly, or monthly timetable */
export function getTimetableDates(period, anchorDate) {
  if (period === 'weekly') return getWeekDayDates(anchorDate)
  if (period === 'monthly') return getMonthDayDates(anchorDate)
  return [toDateInputValue(new Date(anchorDate))]
}

export function buildTimetableRows(routes, schedules = [], anchorDate) {
  const active = routes.filter((r) => r.status === 'active' || !r.status)
  return active.map((route) => {
    const routeId = String(route._id)
    const existing = schedules.find(
      (s) =>
        String(s.routeId?._id || s.routeId) === routeId && tripDateKey(s) === anchorDate
    )
    return {
      routeId: route._id,
      routeName: route.routeName,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      distance: route.distance,
      serviceType: route.serviceType,
      included: true,
      departureTime: existing?.departureTime || '08:00',
      arrivalTime: existing?.arrivalTime || '12:00',
      busId: String(existing?.busId?._id || existing?.busId || route.busId?._id || route.busId || ''),
      driverId: String(
        existing?.driverId?._id || existing?.driverId || route.driverId?._id || route.driverId || ''
      ),
    }
  })
}

export function validateTimetableRows(rows) {
  const errors = []
  const included = rows.filter((r) => r.included)
  if (included.length === 0) {
    return ['Select at least one route for the timetable']
  }
  for (const row of included) {
    const label = row.routeName || 'Route'
    if (!row.departureTime || !row.arrivalTime) {
      errors.push(`${label}: departure and arrival times are required`)
      continue
    }
    const timeErr = validateTimeRange(row.departureTime, row.arrivalTime)
    if (timeErr) errors.push(`${label}: ${timeErr}`)
    if (!row.busId) errors.push(`${label}: assign a bus`)
    if (!row.driverId) errors.push(`${label}: assign a driver`)
  }
  return errors
}

export function getViewDateRange(viewMode, anchorDate) {
  if (viewMode === 'weekly') {
    return { from: startOfWeekDate(anchorDate), to: endOfWeekDate(anchorDate) }
  }
  if (viewMode === 'monthly') {
    const d = new Date(anchorDate)
    const from = toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1))
    const to = toDateInputValue(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return { from, to }
  }
  return { from: anchorDate, to: anchorDate }
}

export function formatPeriodLabel(viewMode, anchorDate) {
  const { from, to } = getViewDateRange(viewMode, anchorDate)
  if (viewMode === 'daily') return formatTripDate(anchorDate)
  if (viewMode === 'weekly') {
    return `${formatTripDate(from)} – ${formatTripDate(to)}`
  }
  const d = new Date(anchorDate)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function tripDateKey(trip) {
  if (!trip?.tripDate) return ''
  return toDateInputValue(new Date(trip.tripDate))
}

export function formatTimeRange(departureTime, arrivalTime) {
  return `${departureTime || '—'} – ${arrivalTime || '—'}`
}

export function validateTimeRange(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null) return 'Enter valid departure and arrival times (HH:mm)'
  if (arr <= dep) return 'Arrival must be after departure'
  return null
}

/** Conflicts across multiple days (e.g. weekly/monthly load) */
export function detectPeriodConflicts(schedules) {
  const byDay = new Map()
  for (const s of schedules) {
    if (s.status === 'cancelled') continue
    const key = tripDateKey(s)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key).push(s)
  }
  const conflicts = []
  for (const daySchedules of byDay.values()) {
    conflicts.push(...detectDayConflicts(daySchedules))
  }
  return conflicts
}

export function reasonToStatus(reason, currentStatus) {
  if (reason === 'emergency') return 'delayed'
  if (reason === 'maintenance' && currentStatus === 'scheduled') return 'cancelled'
  if (reason === 'absence' || reason === 'obstruction') return 'delayed'
  return currentStatus || 'scheduled'
}

export function scheduleCode(schedule) {
  const route = schedule.routeId?.routeName || 'Trip'
  const short = schedule._id?.slice(-4).toUpperCase() || ''
  return short ? `${route.split(' ')[0]}-${short}` : route
}

const HOURS = []
for (let h = 6; h <= 23; h++) {
  HOURS.push(`${String(h).padStart(2, '0')}:00`)
}

export const GANTT_HOURS = HOURS

export function detectDayConflicts(schedules) {
  const conflicts = []
  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i]
      const b = schedules[j]
      if (!timesOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
        continue
      }
      if (String(a.busId?._id || a.busId) === String(b.busId?._id || b.busId)) {
        conflicts.push({
          type: 'bus',
          a,
          b,
          message: `Bus overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
        })
      }
      if (String(a.driverId?._id || a.driverId) === String(b.driverId?._id || b.driverId)) {
        conflicts.push({
          type: 'driver',
          a,
          b,
          message: `Driver overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
        })
      }
      if (String(a.routeId?._id || a.routeId) === String(b.routeId?._id || b.routeId)) {
        conflicts.push({
          type: 'route',
          a,
          b,
          message: `Route overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
        })
      }
    }
  }
  return conflicts
}

export const SCHEDULE_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-indigo-100 text-indigo-800',
  scheduled: 'bg-fleet-primary-light text-fleet-primary',
  'on-time': 'bg-green-100 text-green-800',
  delayed: 'bg-amber-100 text-amber-800',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}
