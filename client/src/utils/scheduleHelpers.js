import { buildRouteName, isSchedulableRoute } from './routeHelpers'

const GANTT_START_MIN = 6 * 60
const GANTT_END_MIN = 24 * 60
const GANTT_SPAN = GANTT_END_MIN - GANTT_START_MIN
export const GANTT_CARD_START_INSET_PX = 6

/** Default departure/arrival for all routes in a new timetable */
export const DEFAULT_TRIP_DEPARTURE_TIME = '08:00'
export const DEFAULT_TRIP_ARRIVAL_TIME = '12:00'

export function defaultTripTimes() {
  return {
    departureTime: DEFAULT_TRIP_DEPARTURE_TIME,
    arrivalTime: DEFAULT_TRIP_ARRIVAL_TIME,
  }
}

/** Apply the same departure/arrival window to every timetable row */
export function applySharedTripTimes(rows, { departureTime, arrivalTime }) {
  return (rows || []).map((row) => ({
    ...row,
    ...(departureTime != null ? { departureTime } : {}),
    ...(arrivalTime != null ? { arrivalTime } : {}),
  }))
}

function approvalRecencyTime(trip, kind) {
  if (kind === 'pending') {
    return new Date(trip.receivedAt || trip.submittedAt || trip.updatedAt || trip.createdAt || 0).getTime()
  }
  return new Date(trip.rejectedAt || trip.updatedAt || trip.createdAt || 0).getTime()
}

export function formatApprovalTimestamp(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Pending tab — when the request arrived in the approval queue */
export function formatApprovalReceived(trip) {
  const received = trip.receivedAt || trip.submittedAt || trip.createdAt
  return formatApprovalTimestamp(received)
}

/** Rejected tab — when sent for approval and when rejected */
export function formatApprovalSent(trip) {
  const sent = trip.submittedAt || trip.createdAt
  return formatApprovalTimestamp(sent)
}

export function formatApprovalResponded(trip) {
  const responded =
    trip.rejectedAt ||
    (trip.rejectionReason ? trip.updatedAt : null) ||
    null
  return formatApprovalTimestamp(responded)
}

/** Pending/rejected approval lists — newest first */
export function sortApprovalTripsByRecent(trips, kind = 'pending') {
  return [...(trips || [])].sort(
    (a, b) => approvalRecencyTime(b, kind) - approvalRecencyTime(a, kind)
  )
}

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
  if (b <= a || d <= c) return false
  return a < d && c < b
}

export function minutesToTime(minutes) {
  if (minutes == null || minutes < 0) return null
  const capped = Math.min(minutes, 24 * 60 - 1)
  const h = Math.floor(capped / 60)
  const min = capped % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Mirror-outbound turnaround: busy until arrival + (arrival - departure) */
export function getResourceBusyEndMinutes(departureTime, arrivalTime) {
  const dep = timeToMinutes(departureTime)
  const arr = timeToMinutes(arrivalTime)
  if (dep == null || arr == null || arr <= dep) return null
  return arr + (arr - dep)
}

export function getResourceBusyEndTime(departureTime, arrivalTime) {
  const end = getResourceBusyEndMinutes(departureTime, arrivalTime)
  return end == null ? null : minutesToTime(end)
}

/** Bus/driver busy windows including mirrored return journey */
export function resourceWindowsOverlap(depA, arrA, depB, arrB) {
  const startA = timeToMinutes(depA)
  const busyEndA = getResourceBusyEndMinutes(depA, arrA)
  const startB = timeToMinutes(depB)
  const busyEndB = getResourceBusyEndMinutes(depB, arrB)
  if ([startA, busyEndA, startB, busyEndB].some((v) => v == null)) return false
  if (busyEndA <= startA || busyEndB <= startB) return false
  return startA < busyEndB && startB < busyEndA
}

export function normalizeResourceId(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object' && value._id != null) return String(value._id)
  return String(value)
}

export function sameAssignedResource(left, right) {
  const a = normalizeResourceId(left)
  const b = normalizeResourceId(right)
  if (!a || !b) return false
  return a === b
}

export function toConflictTrip(trip = {}) {
  return {
    tripRowId: trip.tripRowId || (trip._id ? String(trip._id) : ''),
    routeId: normalizeResourceId(trip.routeId),
    routeName: trip.routeName || trip.routeId?.routeName,
    busId: normalizeResourceId(trip.busId),
    driverId: normalizeResourceId(trip.driverId),
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
  }
}

function ganttPositionFromMinutes(startMin, endMin) {
  if (startMin == null || endMin == null || endMin <= startMin) return null
  const left = ((startMin - GANTT_START_MIN) / GANTT_SPAN) * 100
  const width = ((endMin - startMin) / GANTT_SPAN) * 100
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

export function ganttPosition(departureTime, arrivalTime) {
  return ganttPositionFromMinutes(timeToMinutes(departureTime), timeToMinutes(arrivalTime))
}

/** Return-leg extension on Gantt (arrival → mirrored busy end) */
export function ganttReturnLegPosition(departureTime, arrivalTime) {
  const arr = timeToMinutes(arrivalTime)
  const busyEnd = getResourceBusyEndMinutes(departureTime, arrivalTime)
  if (arr == null || busyEnd == null || busyEnd <= arr) return null
  return ganttPositionFromMinutes(arr, busyEnd)
}

/** Calendar date for a trip or date field — matches server UTC-noon tripDate storage */
export function parseTripDate(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/)
    if (match) return parseLocalDateInput(match[1])
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

export function formatTripDate(date) {
  const d = parseTripDate(date)
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function toDateInputValue(date) {
  const d = parseTripDate(date) || new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDateInput(dateStr) {
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

/** Canonical anchor for timetable create/view (week start or 1st of month). */
export function normalizeTimetableAnchor(period, anchorDate) {
  if (!anchorDate) return toDateInputValue(new Date())
  if (period === 'weekly') return startOfWeekDate(anchorDate)
  if (period === 'monthly') {
    const d = parseLocalDateInput(anchorDate)
    return toDateInputValue(new Date(d.getFullYear(), d.getMonth(), 1))
  }
  return toDateInputValue(anchorDate)
}

/** Day used as the route/time template when editing weekly or monthly timetables */
export function getTimetableTemplateDate(period, anchorDate) {
  return normalizeTimetableAnchor(period, anchorDate)
}

export function formatTimetableCoverageLabel(period, anchorDate) {
  if (period === 'daily') return formatTripDate(anchorDate)
  if (period === 'weekly') {
    const from = startOfWeekDate(anchorDate)
    const to = endOfWeekDate(anchorDate)
    return `${formatTripDate(from)} – ${formatTripDate(to)}`
  }
  const d = parseLocalDateInput(normalizeTimetableAnchor('monthly', anchorDate))
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Dates covered when building a daily, weekly, or monthly timetable */
export function getTimetableDates(period, anchorDate) {
  if (period === 'weekly') return getWeekDayDates(anchorDate)
  if (period === 'monthly') return getMonthDayDates(anchorDate)
  return [toDateInputValue(anchorDate)]
}

export function getTimetableDateBounds(period, anchorDate) {
  const dates = getTimetableDates(period, anchorDate)
  if (!dates.length) return { from: '', to: '' }
  return { from: dates[0], to: dates[dates.length - 1] }
}

export function filterSchedulesInDateRange(schedules, fromDate, toDate) {
  if (!fromDate || !toDate) return []
  return (schedules || []).filter((s) => isTripInDateRange(s, fromDate, toDate))
}

export function mergeSchedulesById(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const item of list || []) {
      if (item?._id != null) map.set(String(item._id), item)
    }
  }
  return [...map.values()]
}

export function viewRangeCoversTimetable(viewMode, viewDate, timetablePeriod, timetableAnchor) {
  const view = getViewDateRange(viewMode, viewDate)
  const ttMode =
    timetablePeriod === 'monthly' ? 'monthly' : timetablePeriod === 'weekly' ? 'weekly' : 'daily'
  const timetable = getViewDateRange(ttMode, timetableAnchor)
  return timetable.from >= view.from && timetable.to <= view.to
}

export function schedulesForTimetableRows(schedules, period, anchorDate) {
  const { from, to } = getTimetableDateBounds(period, anchorDate)
  const inRange = filterSchedulesInDateRange(schedules, from, to)
  if (period === 'daily') {
    return inRange.filter((s) => isTripOnDate(s, anchorDate))
  }
  return inRange
}

export function buildTimetableRowsForPeriod(routes, schedules, period, anchorDate) {
  const source = schedulesForTimetableRows(schedules, period, anchorDate)
  const templateDate = getTimetableTemplateDate(period, anchorDate)
  return buildTimetableRows(routes, source, templateDate)
}

/** Start and end points for schedule/timetable route labels */
export function formatRouteEndpointsLabel(route = {}) {
  const start = String(route.startPoint || '').trim()
  const end = String(route.endPoint || '').trim()
  if (start && end) return `${start} → ${end}`
  return buildRouteName(start, end) || route.routeName || 'Route'
}

function newTripRowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `new-${crypto.randomUUID()}`
  }
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Shared id for all trips in one timetable save (Option A grouping). */
export function newTimetableId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `tt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function createTimetableRowFromRoute(route, existing = null) {
  const tripRowId = existing?._id ? `sched-${existing._id}` : newTripRowId()
  return {
    tripRowId,
    scheduleId: existing?._id || null,
    routeId: route._id,
    routeName: route.routeName,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    distance: route.distance,
    serviceType: route.serviceType,
    stops: route.stops?.length ? [...route.stops] : [],
    viaDescription: route.viaDescription || '',
    included: false,
    ...defaultTripTimes(),
    busId: String(
      existing?.busId?._id || existing?.busId || route.busId?._id || route.busId || ''
    ),
    driverId: String(
      existing?.driverId?._id ||
        existing?.driverId ||
        route.driverId?._id ||
        route.driverId ||
        ''
    ),
    remarks: '',
  }
}

export function suggestNextTripTimes(existingRowsForRoute = []) {
  if (!existingRowsForRoute.length) {
    return defaultTripTimes()
  }
  const first = existingRowsForRoute[0]
  const dep0 = timeToMinutes(first.departureTime)
  const arr0 = timeToMinutes(first.arrivalTime)
  const duration = dep0 != null && arr0 != null && arr0 > dep0 ? arr0 - dep0 : 4 * 60

  let maxArr = 0
  for (const row of existingRowsForRoute) {
    const arr = timeToMinutes(row.arrivalTime)
    if (arr != null && arr > maxArr) maxArr = arr
  }
  const dep = maxArr
  const arr = dep + duration
  if (arr >= 24 * 60) {
    return defaultTripTimes()
  }
  return { departureTime: minutesToTime(dep), arrivalTime: minutesToTime(arr) }
}

export function duplicateTimetableRow(route, siblingRows = []) {
  const sameRouteRows = siblingRows.filter((r) => String(r.routeId) === String(route._id))
  const { departureTime, arrivalTime } = suggestNextTripTimes(sameRouteRows)
  return {
    ...createTimetableRowFromRoute(route, null),
    departureTime,
    arrivalTime,
    included: true,
    busId: '',
    driverId: '',
    remarks: '',
  }
}

export function buildTimetableRows(routes, schedules = [], anchorDate) {
  const active = routes.filter(isSchedulableRoute)
  const rows = []
  const dayKey = toDateInputValue(anchorDate)

  for (const route of active) {
    const routeId = String(route._id)
    const existingTrips = schedules.filter(
      (s) =>
        String(s.routeId?._id || s.routeId) === routeId && tripDateKey(s) === dayKey
    )
    if (existingTrips.length) {
      for (const trip of existingTrips) {
        rows.push(createTimetableRowFromRoute(route, trip))
      }
    } else {
      rows.push(createTimetableRowFromRoute(route, null))
    }
  }

  return rows
}

export function isResourceFreeForTrip(
  resourceId,
  resourceField,
  proposedTrip,
  otherTrips,
  { excludeTripRowId } = {}
) {
  if (!resourceId) return true
  const proposed = toConflictTrip(proposedTrip)
  for (const other of otherTrips) {
    if (excludeTripRowId && String(other.tripRowId) === String(excludeTripRowId)) continue
    const o = toConflictTrip(other)
    if (!sameAssignedResource(o[resourceField], resourceId)) continue
    if (
      resourceWindowsOverlap(
        proposed.departureTime,
        proposed.arrivalTime,
        o.departureTime,
        o.arrivalTime
      )
    ) {
      return false
    }
  }
  return true
}

export function getResourceNextAvailableTime(resourceId, resourceField, trips) {
  if (!resourceId) return null
  let latestBusyEnd = null
  for (const trip of trips) {
    const t = toConflictTrip(trip)
    if (!sameAssignedResource(t[resourceField], resourceId)) continue
    const end = getResourceBusyEndMinutes(t.departureTime, t.arrivalTime)
    if (end != null && (latestBusyEnd == null || end > latestBusyEnd)) {
      latestBusyEnd = end
    }
  }
  return latestBusyEnd == null ? null : minutesToTime(latestBusyEnd)
}

/** Group timetable conflict issues by trip row for row-level hints */
export function groupTimetableConflictsByRoute(issues = [], rows = []) {
  const byRow = new Map()
  const included = (rows || []).filter((r) => r.included !== false)

  for (const row of included) {
    const proposed = toConflictTrip(row)
    const hints = []
    for (const other of included) {
      if (String(other.tripRowId) === String(row.tripRowId)) continue
      const pairConflicts = []
      compareTripOverlap(proposed, other, pairConflicts, {})
      for (const c of pairConflicts) {
        const msg = formatStructuredConflictMessage(c, proposed, other)
        if (!hints.includes(msg)) hints.push(msg)
      }
    }
    if (hints.length) byRow.set(String(row.tripRowId), hints)
  }

  for (const summary of summarizeTimetableConflicts(issues, rows)) {
    for (const tripRowId of summary.involvedTripRowIds || []) {
      const key = String(tripRowId)
      const list = byRow.get(key) || []
      if (!list.includes(summary.text)) list.push(summary.text)
      byRow.set(key, list)
    }
  }

  return byRow
}

function formatStructuredConflictMessage(c, a, b) {
  if (c.type === 'bus') {
    const busyEnd = getResourceBusyEndTime(b.departureTime, b.arrivalTime)
    return busyEnd
      ? `Bus turnaround: busy until ${busyEnd} after ${b.departureTime}–${b.arrivalTime}`
      : `Bus conflict ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`
  }
  if (c.type === 'driver') {
    const busyEnd = getResourceBusyEndTime(b.departureTime, b.arrivalTime)
    return busyEnd
      ? `Driver turnaround: busy until ${busyEnd} after ${b.departureTime}–${b.arrivalTime}`
      : `Driver conflict ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`
  }
  if (c.type === 'route') {
    return `Route overlap ${a.departureTime}–${a.arrivalTime} vs ${b.departureTime}–${b.arrivalTime}`
  }
  return c.message || 'Scheduling conflict'
}

export function timetableRouteLabel(row) {
  return formatRouteEndpointsLabel(row)
}

export const TIMETABLE_CONFLICT_CAUSE_SHORT = {
  bus: 'same bus (including return turnaround)',
  driver: 'same driver (including return turnaround)',
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
  const rowByRouteId = (id) => rows.find((r) => String(r.routeId) === String(id))

  for (const issue of issues) {
    if (issue.routeName === 'Validation') continue
    for (const c of issue.conflicts || []) {
      const routeIdA = String(issue.routeId)
      const routeIdB = String(c.otherRouteId || c.otherRouteName || 'other')
      const [idA, idB] = [routeIdA, routeIdB].sort()
      const tripDate = c.tripDate || issue.tripDate || ''
      const times = [c.departureTime || '', c.otherDepartureTime || ''].sort().join('|')
      const pairKey = `${tripDate}|${idA}|${idB}|${times}|${c.type}`

      if (!pairMap.has(pairKey)) {
        const rowA = rowByRouteId(issue.routeId)
        const rowB = rowByRouteId(c.otherRouteId)
        pairMap.set(pairKey, {
          tripDate,
          routeA: {
            routeId: issue.routeId,
            tripRowId: rowA?.tripRowId,
            label: timetableRouteLabel(rowA) || issue.routeName,
            departureTime: c.departureTime || issue.departureTime,
            arrivalTime: c.arrivalTime || issue.arrivalTime,
          },
          routeB: {
            routeId: c.otherRouteId,
            tripRowId: rowB?.tripRowId,
            label: rowB
              ? timetableRouteLabel(rowB)
              : c.otherRouteName || 'Another trip',
            departureTime: c.otherDepartureTime,
            arrivalTime: c.otherArrivalTime,
          },
          causes: new Set(),
          involvedRouteIds: new Set([routeIdA, routeIdB].filter((id) => id && id !== 'other')),
          involvedTripRowIds: new Set(
            [rowA?.tripRowId, rowB?.tripRowId].filter(Boolean).map(String)
          ),
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
      involvedTripRowIds: [...entry.involvedTripRowIds],
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
    involvedTripRowIds: summary.involvedTripRowIds,
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
  return toDateInputValue(trip.tripDate)
}

export function isTripOnDate(trip, dateStr) {
  if (!dateStr) return false
  return tripDateKey(trip) === toDateInputValue(dateStr)
}

export function isTripInDateRange(trip, fromDate, toDate) {
  const key = tripDateKey(trip)
  if (!key || !fromDate || !toDate) return false
  const from = toDateInputValue(fromDate)
  const to = toDateInputValue(toDate)
  return key >= from && key <= to
}

export function isTripInViewRange(trip, viewMode, anchorDate) {
  const { from, to } = getViewDateRange(viewMode, anchorDate)
  return isTripInDateRange(trip, from, to)
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
  const left = toConflictTrip(a)
  const right = toConflictTrip(b)

  if (resourceWindowsOverlap(left.departureTime, left.arrivalTime, right.departureTime, right.arrivalTime)) {
    if (sameAssignedResource(left.busId, right.busId)) {
      const busyEnd = getResourceBusyEndTime(right.departureTime, right.arrivalTime)
      conflicts.push({
        type: 'bus',
        a,
        b,
        message: busyEnd
          ? `Bus turnaround: busy until ${busyEnd} after ${right.departureTime}–${right.arrivalTime}`
          : `Bus overlap ${left.departureTime}–${left.arrivalTime} vs ${right.departureTime}–${right.arrivalTime}`,
      })
    }
    if (sameAssignedResource(left.driverId, right.driverId)) {
      const busyEnd = getResourceBusyEndTime(right.departureTime, right.arrivalTime)
      conflicts.push({
        type: 'driver',
        a,
        b,
        message: busyEnd
          ? `Driver turnaround: busy until ${busyEnd} after ${right.departureTime}–${right.arrivalTime}`
          : `Driver overlap ${left.departureTime}–${left.arrivalTime} vs ${right.departureTime}–${right.arrivalTime}`,
      })
    }
  }

  if (timesOverlap(left.departureTime, left.arrivalTime, right.departureTime, right.arrivalTime)) {
    if (left.routeId && sameAssignedResource(left.routeId, right.routeId)) {
      conflicts.push({
        type: 'route',
        a,
        b,
        message: `Route overlap ${left.departureTime}–${left.arrivalTime} vs ${right.departureTime}–${right.arrivalTime}`,
      })
    }
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
  const a = toConflictTrip(proposed)
  const b = toConflictTrip(other)

  if (resourceWindowsOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    if (sameAssignedResource(a.busId, b.busId)) {
      pushStructuredOverlap(conflicts, 'bus', a, b, { tripDate, otherLabel, otherRouteId })
    }
    if (sameAssignedResource(a.driverId, b.driverId)) {
      pushStructuredOverlap(conflicts, 'driver', a, b, { tripDate, otherLabel, otherRouteId })
    }
  }

  if (timesOverlap(a.departureTime, a.arrivalTime, b.departureTime, b.arrivalTime)) {
    if (a.routeId && sameAssignedResource(a.routeId, b.routeId)) {
      pushStructuredOverlap(conflicts, 'route', a, b, { tripDate, otherLabel, otherRouteId })
    }
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
    const proposedForDay = included.map((r) => toConflictTrip(r))

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
        compareTripOverlap(trip, ex, conflicts, {
          tripDate: dateStr,
          otherLabel: ex.routeId?.routeName || 'existing schedule',
          otherRouteId: ex.routeId?._id || ex.routeId,
        })
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
