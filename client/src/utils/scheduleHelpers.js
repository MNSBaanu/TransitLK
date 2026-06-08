import { buildRouteName, isSchedulableRoute } from './routeHelpers'

const GANTT_START_MIN = 6 * 60
const GANTT_END_MIN = 24 * 60
const GANTT_SPAN = GANTT_END_MIN - GANTT_START_MIN
export const GANTT_CARD_START_INSET_PX = 6

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
  const clampedLeft = Math.max(0, left)
  const clampedWidth = Math.min(100 - clampedLeft, width)
  return {
    left: clampedLeft,
    width: clampedWidth,
    style: {
      left: `calc(${clampedLeft}% + ${GANTT_CARD_START_INSET_PX}px)`,
      width: `max(2.5rem, calc(${clampedWidth}% - ${GANTT_CARD_START_INSET_PX}px))`,
    },
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

function parseLocalDateInput(dateStr) {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(dateStr)
}

export function startOfWeekDate(dateStr) {
  const d = parseLocalDateInput(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toDateInputValue(d)
}

export function endOfWeekDate(dateStr) {
  const d = parseLocalDateInput(startOfWeekDate(dateStr))
  d.setDate(d.getDate() + 6)
  return toDateInputValue(d)
}

export function getWeekDayDates(anchorDate) {
  const start = startOfWeekDate(anchorDate)
  const base = parseLocalDateInput(start)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    days.push(toDateInputValue(d))
  }
  return days
}

export function getMonthDayDates(anchorDate) {
  const d = parseLocalDateInput(anchorDate)
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

/** Start and end points for schedule/timetable route labels */
export function formatRouteEndpointsLabel(route = {}) {
  const start = String(route.startPoint || '').trim()
  const end = String(route.endPoint || '').trim()
  if (start && end) return `${start} → ${end}`
  return buildRouteName(start, end) || route.routeName || 'Route'
}

export function buildTimetableRows(routes, schedules = [], anchorDate) {
  const active = routes.filter(isSchedulableRoute)
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
      stops: route.stops?.length ? [...route.stops] : [],
      viaDescription: route.viaDescription || '',
      included: false,
      departureTime: existing?.departureTime || '08:00',
      arrivalTime: existing?.arrivalTime || '12:00',
      busId: String(existing?.busId?._id || existing?.busId || route.busId?._id || route.busId || ''),
      driverId: String(
        existing?.driverId?._id || existing?.driverId || route.driverId?._id || route.driverId || ''
      ),
    }
  })
}

/** Group timetable conflict issues by route for row-level hints */
export function groupTimetableConflictsByRoute(issues = [], rows = []) {
  const byRoute = new Map()
  for (const summary of summarizeTimetableConflicts(issues, rows)) {
    for (const routeId of summary.involvedRouteIds) {
      const key = String(routeId)
      const list = byRoute.get(key) || []
      if (!list.includes(summary.text)) list.push(summary.text)
      byRoute.set(key, list)
    }
  }
  return byRoute
}

export function timetableRouteLabel(row) {
  return formatRouteEndpointsLabel(row)
}

export const TIMETABLE_CONFLICT_CAUSE_SHORT = {
  bus: 'same bus',
  driver: 'same driver',
  route: 'same route double-booked',
}

function formatOverlapCausePhrase(types) {
  const labels = types.map((t) => TIMETABLE_CONFLICT_CAUSE_SHORT[t]).filter(Boolean)
  if (!labels.length) return 'overlapping schedules'
  if (labels.length === 1) return `the ${labels[0]} is assigned during overlapping hours`
  const last = labels.pop()
  return `the ${labels.join(', ')} and ${last} are assigned during overlapping hours`
}

/** One readable line per conflicting pair (deduped, causes combined). */
export function summarizeTimetableConflicts(issues = [], rows = []) {
  const pairMap = new Map()
  const rowById = (id) => rows.find((r) => String(r.routeId) === String(id))

  for (const issue of issues) {
    if (issue.routeName === 'Validation') continue
    for (const c of issue.conflicts || []) {
      const routeIdA = String(issue.routeId)
      const routeIdB = String(c.otherRouteId || c.otherRouteName || 'other')
      const [idA, idB] = [routeIdA, routeIdB].sort()
      const tripDate = c.tripDate || issue.tripDate || ''
      const times = [c.departureTime || '', c.otherDepartureTime || ''].sort().join('|')
      const pairKey = `${tripDate}|${idA}|${idB}|${times}`

      if (!pairMap.has(pairKey)) {
        const rowA = rowById(issue.routeId)
        const rowB = rowById(c.otherRouteId)
        pairMap.set(pairKey, {
          tripDate,
          routeA: {
            routeId: issue.routeId,
            label: timetableRouteLabel(rowA) || issue.routeName,
            departureTime: c.departureTime || issue.departureTime,
            arrivalTime: c.arrivalTime || issue.arrivalTime,
          },
          routeB: {
            routeId: c.otherRouteId,
            label: rowB
              ? timetableRouteLabel(rowB)
              : c.otherRouteName || 'Another trip',
            departureTime: c.otherDepartureTime,
            arrivalTime: c.otherArrivalTime,
          },
          causes: new Set(),
          involvedRouteIds: new Set([routeIdA, routeIdB].filter((id) => id && id !== 'other')),
        })
      }
      const entry = pairMap.get(pairKey)
      entry.causes.add(c.type)
      entry.involvedRouteIds.add(routeIdA)
      if (routeIdB && routeIdB !== 'other') entry.involvedRouteIds.add(routeIdB)
    }
  }

  return [...pairMap.values()].map((entry) => {
    const { routeA, routeB, tripDate, causes } = entry
    const datePrefix = tripDate ? `${tripDate} — ` : ''
    const text = `${datePrefix}${routeA.label} (${routeA.departureTime}–${routeA.arrivalTime}) and ${routeB.label} (${routeB.departureTime}–${routeB.arrivalTime}) conflict: ${formatOverlapCausePhrase([...causes])}`
    return {
      text,
      tripDate,
      causes: [...causes],
      involvedRouteIds: [...entry.involvedRouteIds],
      routeId: routeA.routeId,
      routeName: routeA.label,
    }
  })
}

/** Feedback panel: one card per conflict pair + one card per incomplete route. */
export function buildTimetableFeedbackCards(rows = [], issues = []) {
  const validationCards = []

  for (const row of rows.filter((r) => r.included)) {
    const items = getTimetableRowValidationIssues(row).map((text) => ({
      kind: 'validation',
      text,
    }))
    if (items.length) {
      validationCards.push({
        routeId: row.routeId,
        routeLabel: formatRouteEndpointsLabel(row),
        items,
      })
    }
  }

  const conflictCards = summarizeTimetableConflicts(issues, rows).map((summary, index) => ({
    id: `conflict-${index}`,
    routeId: summary.involvedRouteIds[0],
    involvedRouteIds: summary.involvedRouteIds,
    items: [{ kind: 'conflict', text: summary.text, causes: summary.causes }],
  }))

  return { conflictCards, validationCards }
}

/** Per-row validation for included timetable routes (bus and driver required). */
export function getTimetableRowValidationIssues(row) {
  if (row.included === false) return []
  const issues = []
  if (!row.departureTime || !row.arrivalTime) {
    issues.push('Departure and arrival times are required')
  } else {
    const timeErr = validateTimeRange(row.departureTime, row.arrivalTime)
    if (timeErr) issues.push(timeErr)
  }
  if (!row.busId) issues.push('Assign a bus')
  if (!row.driverId) issues.push('Assign a driver')
  return issues
}

export function validateTimetableRows(rows) {
  const errors = []
  const included = rows.filter((r) => r.included !== false)
  if (included.length === 0) {
    return ['Select at least one route for the timetable']
  }
  for (const row of included) {
    const label = row.routeName || 'Route'
    for (const issue of getTimetableRowValidationIssues(row)) {
      const detail = issue.charAt(0).toLowerCase() + issue.slice(1)
      errors.push(`${label}: ${detail}`)
    }
  }
  return errors
}

export function isTimetableReady(rows) {
  return validateTimetableRows(rows).length === 0
}

/** included row: excluded | incomplete (missing fields) | conflict (overlap) | clear */
export function getTimetableRowStatus(row, { overlapHints = [] } = {}) {
  if (row.included === false) return 'excluded'
  if (overlapHints.length > 0) return 'conflict'
  if (getTimetableRowValidationIssues(row).length > 0) return 'incomplete'
  return 'clear'
}

export function getViewDateRange(viewMode, anchorDate) {
  if (viewMode === 'weekly') {
    return { from: startOfWeekDate(anchorDate), to: endOfWeekDate(anchorDate) }
  }
  if (viewMode === 'monthly') {
    const d = parseLocalDateInput(anchorDate)
    const from = toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1))
    const to = toDateInputValue(new Date(d.getFullYear(), d.getMonth() + 1, 0))
    return { from, to }
  }
  return { from: anchorDate, to: anchorDate }
}

/** Full calendar week/month boundaries for Reporting & Analytics */
export function applyReportPeriodRange(period, anchorDate = toDateInputValue(new Date())) {
  const anchor =
    typeof anchorDate === 'string' ? anchorDate : toDateInputValue(anchorDate)
  return getViewDateRange(period === 'weekly' ? 'weekly' : 'monthly', anchor)
}

export function formatReportRangeLabel(from, to) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  return `${parseLocalDateInput(from).toLocaleDateString('en-GB', opts)} – ${parseLocalDateInput(to).toLocaleDateString('en-GB', opts)}`
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
  const raw = trip.tripDate
  if (typeof raw === 'string') {
    const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return match[1]
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatTimeRange(departureTime, arrivalTime) {
  return `${departureTime || '—'} – ${arrivalTime || '—'}`
}

/** Via text or intermediary stops for display on schedule views */
export function formatRouteStopsLabel(route = {}) {
  const via = route.viaDescription?.trim()
  if (via) return via
  const stops = Array.isArray(route.stops) ? route.stops.filter(Boolean) : []
  if (stops.length) return stops.join(' · ')
  return ''
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

export const ADJUSTMENT_REASON_LABELS = {
  normal: 'Normal adjustment',
  emergency: 'Emergency / unexpected event',
  maintenance: 'Vehicle maintenance',
  absence: 'Driver absence',
  obstruction: 'Route obstruction',
}

export function requiresAdjustmentNotes(reason) {
  return ['emergency', 'maintenance', 'absence', 'obstruction'].includes(reason)
}

export function reasonToStatus(reason, currentStatus) {
  if (reason === 'emergency') return 'delayed'
  if (reason === 'maintenance' && currentStatus === 'scheduled') return 'cancelled'
  if (reason === 'absence' || reason === 'obstruction') return 'delayed'
  return currentStatus || 'scheduled'
}

export function formatAdjustmentChange(change) {
  if (!change?.field) return ''
  const labels = {
    departureTime: 'Departure',
    arrivalTime: 'Arrival',
    busId: 'Bus',
    driverId: 'Driver',
    status: 'Status',
    adjustmentReason: 'Reason',
  }
  return `${labels[change.field] || change.field}: ${change.from || '—'} → ${change.to || '—'}`
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
      appendOverlapConflicts(a, b, conflicts)
    }
  }
  return conflicts
}

function appendOverlapConflicts(a, b, conflicts) {
  if (!timesOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    return
  }
  const busA = String(a.busId?._id || a.busId)
  const busB = String(b.busId?._id || b.busId)
  const driverA = String(a.driverId?._id || a.driverId)
  const driverB = String(b.driverId?._id || b.driverId)
  const routeA = String(a.routeId?._id || a.routeId)
  const routeB = String(b.routeId?._id || b.routeId)

  if (busA === busB) {
    conflicts.push({
      type: 'bus',
      a,
      b,
      message: `Bus overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
  if (driverA === driverB) {
    conflicts.push({
      type: 'driver',
      a,
      b,
      message: `Driver overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
  if (routeA === routeB) {
    conflicts.push({
      type: 'route',
      a,
      b,
      message: `Route overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`,
    })
  }
}

function pushStructuredOverlap(conflicts, type, proposed, other, { tripDate, otherLabel, otherRouteId }) {
  const otherRouteName = otherLabel || other.routeName || 'Another trip'
  const otherId = otherRouteId || other.routeId
  const dedupeKey = `${tripDate}|${type}|${proposed.routeId}|${otherId}|${proposed.departureTime}|${other.departureTime}`
  if (conflicts.some((c) => c._dedupeKey === dedupeKey)) return
  conflicts.push({
    _dedupeKey: dedupeKey,
    type,
    tripDate,
    departureTime: proposed.departureTime,
    arrivalTime: proposed.arrivalTime,
    otherRouteId: otherId,
    otherRouteName,
    otherDepartureTime: other.departureTime,
    otherArrivalTime: other.arrivalTime,
  })
}

function compareTripOverlap(proposed, other, conflicts, { tripDate, otherLabel, otherRouteId } = {}) {
  if (
    !timesOverlap(
      proposed.departureTime,
      proposed.arrivalTime,
      other.departureTime,
      other.arrivalTime
    )
  ) {
    return
  }
  if (String(proposed.busId) === String(other.busId)) {
    pushStructuredOverlap(conflicts, 'bus', proposed, other, { tripDate, otherLabel, otherRouteId })
  }
  if (String(proposed.driverId) === String(other.driverId)) {
    pushStructuredOverlap(conflicts, 'driver', proposed, other, { tripDate, otherLabel, otherRouteId })
  }
  if (proposed.routeId && String(proposed.routeId) === String(other.routeId)) {
    pushStructuredOverlap(conflicts, 'route', proposed, other, { tripDate, otherLabel, otherRouteId })
  }
}

function mergeTimetableIssue(issues, trip, dateStr, newConflicts) {
  if (!newConflicts.length) return
  let block = issues.find((i) => i.routeId === trip.routeId && i.tripDate === dateStr)
  if (!block) {
    block = {
      routeId: trip.routeId,
      routeName: trip.routeName,
      tripDate: dateStr,
      conflicts: [],
    }
    issues.push(block)
  }
  for (const c of newConflicts) {
    if (!block.conflicts.some((x) => x._dedupeKey && x._dedupeKey === c._dedupeKey)) {
      block.conflicts.push(c)
    }
  }
}

/** Detect bus, driver, and route overlaps for a draft timetable (client-side, instant). */
export function detectTimetableConflicts(dates, rows, existingSchedules = []) {
  const included = (rows || []).filter(
    (r) =>
      r.included !== false &&
      r.routeId &&
      r.busId &&
      r.driverId &&
      r.departureTime &&
      r.arrivalTime &&
      !validateTimeRange(r.departureTime, r.arrivalTime)
  )

  if (!included.length || !dates?.length) {
    return { hasConflict: false, issues: [], conflictCount: 0 }
  }

  const activeExisting = (existingSchedules || []).filter((s) => s.status !== 'cancelled')
  const issues = []

  for (const dateStr of dates) {
    const proposedForDay = included.map((r) => ({
      routeId: String(r.routeId),
      routeName: r.routeName || 'Route',
      busId: String(r.busId),
      driverId: String(r.driverId),
      departureTime: r.departureTime,
      arrivalTime: r.arrivalTime,
    }))

    const existingForDay = activeExisting.filter((s) => tripDateKey(s) === dateStr)

    for (let i = 0; i < proposedForDay.length; i++) {
      for (let j = i + 1; j < proposedForDay.length; j++) {
        const a = proposedForDay[i]
        const b = proposedForDay[j]
        const pairConflicts = []
        compareTripOverlap(a, b, pairConflicts, {
          tripDate: dateStr,
          otherLabel: b.routeName,
          otherRouteId: b.routeId,
        })
        mergeTimetableIssue(issues, a, dateStr, pairConflicts)
      }
    }

    for (const trip of proposedForDay) {
      const conflicts = []
      for (const ex of existingForDay) {
        compareTripOverlap(
          trip,
          {
            routeId: ex.routeId?._id || ex.routeId,
            routeName: ex.routeId?.routeName || 'Route',
            busId: ex.busId?._id || ex.busId,
            driverId: ex.driverId?._id || ex.driverId,
            departureTime: ex.departureTime,
            arrivalTime: ex.arrivalTime,
          },
          conflicts,
          {
            tripDate: dateStr,
            otherLabel: ex.routeId?.routeName || 'existing schedule',
            otherRouteId: ex.routeId?._id || ex.routeId,
          }
        )
      }
      mergeTimetableIssue(issues, trip, dateStr, conflicts)
    }
  }

  const conflictCount = summarizeTimetableConflicts(issues).length
  return { hasConflict: issues.length > 0, issues, conflictCount }
}

export const SCHEDULE_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  'on-time': 'On time',
  delayed: 'Delayed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function formatScheduleStatusLabel(status) {
  return SCHEDULE_STATUS_LABELS[status] || status || '—'
}

export const SCHEDULE_STATUS_STYLES = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-indigo-100 text-indigo-800',
  scheduled: 'bg-blue-100 text-blue-800',
  'on-time': 'bg-green-100 text-green-800',
  delayed: 'bg-amber-100 text-amber-800',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-700',
}

export function scheduleStatusClass(status) {
  return SCHEDULE_STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'
}
