import api from './api'
import { ROLE_ALLOWED_PATHS, ROLES } from '../config/roles'
import {
  applyReportPeriodRange,
  coerceFocusDate,
  getViewDateRange,
  parseLocalDateInput,
  sortApprovalTripsByRecent,
  toDateInputValue,
} from '../utils/scheduleHelpers'

const CACHE_TTL_MS = 60 * 1000
const pageCache = new Map()
const inflightRequests = new Map()
const ROUTE_SUPPORT_CACHE_KEY = '__routes_support__'
const SCHEDULE_SUPPORT_CACHE_KEY = '__schedules_support__'
const SCHEDULE_APPROVALS_PATH = '/schedules/approvals'
const SCHEDULE_APPROVER_ROLES = new Set([ROLES.DEPOT_MANAGER, ROLES.ADMINISTRATOR])

function asArray(value) {
  if (Array.isArray(value)) return value
  if (value?.items && Array.isArray(value.items)) return value.items
  return []
}

function getDefaultScheduleOptions() {
  return {
    viewMode: 'daily',
    viewDate: toDateInputValue(new Date()),
  }
}

function getDefaultReportOptions() {
  const { from, to } = applyReportPeriodRange('monthly')
  return {
    period: 'monthly',
    fromDate: from,
    toDate: to,
  }
}

function normalizeOptions(path, options = {}) {
  if (path === '/routes') {
    const limit = Number(options.limit)
    return {
      page: Math.max(Number(options.page) || 1, 1),
      limit: [10, 15].includes(limit) ? limit : 10,
      search: typeof options.search === 'string' ? options.search.trim() : '',
      status: typeof options.status === 'string' ? options.status.trim() : '',
      serviceType: typeof options.serviceType === 'string' ? options.serviceType.trim() : '',
    }
  }

  if (path === '/schedules') {
    const defaults = getDefaultScheduleOptions()
    const viewMode = options.viewMode || defaults.viewMode
    const rawDate =
      typeof options.focusDate === 'string'
        ? options.focusDate
        : typeof options.viewDate === 'string'
          ? options.viewDate
          : defaults.viewDate
    const focusDate = coerceFocusDate(rawDate)
    return { viewMode, focusDate }
  }

  if (path === '/reports') {
    const defaults = getDefaultReportOptions()
    return {
      period: options.period || defaults.period,
      fromDate: options.fromDate || defaults.fromDate,
      toDate: options.toDate || defaults.toDate,
    }
  }

  return options
}

function getCacheKey(path, options = {}) {
  const normalized = normalizeOptions(path, options)

  if (path === '/routes') {
    return `${path}?page=${normalized.page}&limit=${normalized.limit}&search=${encodeURIComponent(normalized.search)}&status=${encodeURIComponent(normalized.status)}&serviceType=${encodeURIComponent(normalized.serviceType)}`
  }

  if (path === '/schedules') {
    return `${path}?viewMode=${normalized.viewMode}&focusDate=${normalized.focusDate}`
  }

  if (path === '/reports') {
    return `${path}?period=${normalized.period}&from=${normalized.fromDate}&to=${normalized.toDate}`
  }

  return path
}

function isFresh(entry) {
  return Boolean(entry) && Date.now() - entry.timestamp < CACHE_TTL_MS
}

async function fetchRouteSupportData({ force = false } = {}) {
  if (!force) {
    const cached = pageCache.get(ROUTE_SUPPORT_CACHE_KEY)
    if (isFresh(cached)) return cached.data
  }

  if (inflightRequests.has(ROUTE_SUPPORT_CACHE_KEY)) {
    return inflightRequests.get(ROUTE_SUPPORT_CACHE_KEY)
  }

  const request = Promise.all([
    api.get('/buses', { params: { light: 1 } }),
    api.get('/drivers', { params: { light: 1 } }),
  ])
    .then(([busRes, driverRes]) => {
      const data = {
        buses: asArray(busRes.data),
        drivers: asArray(driverRes.data),
      }
      pageCache.set(ROUTE_SUPPORT_CACHE_KEY, {
        data,
        timestamp: Date.now(),
      })
      return data
    })
    .finally(() => {
      inflightRequests.delete(ROUTE_SUPPORT_CACHE_KEY)
    })

  inflightRequests.set(ROUTE_SUPPORT_CACHE_KEY, request)
  return request
}

async function fetchRoutesPageData(options = {}) {
  const { page, limit, search, status, serviceType } = normalizeOptions('/routes', options)
  const [routeRes, support] = await Promise.all([
    api.get('/routes', {
      params: { page, limit, search, status, serviceType },
    }),
    fetchRouteSupportData(),
  ])
  const routeData = routeRes.data || {}

  return {
    routes: asArray(routeData.items),
    buses: support.buses,
    drivers: support.drivers,
    pagination: routeData.pagination || {
      page,
      limit,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    summary: routeData.summary || {
      total: 0,
      active: 0,
      draft: 0,
      avgDistance: null,
      distanceRouteCount: 0,
    },
    page,
    limit,
    search,
    status,
    serviceType,
  }
}

async function fetchScheduleSupportData({ force = false } = {}) {
  if (!force) {
    const cached = pageCache.get(SCHEDULE_SUPPORT_CACHE_KEY)
    if (isFresh(cached)) return cached.data
  }

  if (inflightRequests.has(SCHEDULE_SUPPORT_CACHE_KEY)) {
    return inflightRequests.get(SCHEDULE_SUPPORT_CACHE_KEY)
  }

  const request = Promise.all([
    api.get('/routes', { params: { summary: 1 } }),
    api.get('/buses', { params: { light: 1 } }),
    api.get('/drivers', { params: { light: 1 } }),
  ])
    .then(([routeRes, busRes, driverRes]) => {
      const data = {
        routes: asArray(routeRes.data),
        buses: asArray(busRes.data),
        drivers: asArray(driverRes.data),
      }
      pageCache.set(SCHEDULE_SUPPORT_CACHE_KEY, {
        data,
        timestamp: Date.now(),
      })
      return data
    })
    .finally(() => {
      inflightRequests.delete(SCHEDULE_SUPPORT_CACHE_KEY)
    })

  inflightRequests.set(SCHEDULE_SUPPORT_CACHE_KEY, request)
  return request
}

async function fetchSchedulesTrips(options = {}) {
  const { viewMode, focusDate } = normalizeOptions('/schedules', options)
  const { from, to } = getViewDateRange(viewMode, focusDate)
  const tripsKey = `schedules:trips:${viewMode}:${from}:${to}`

  if (inflightRequests.has(tripsKey)) {
    return inflightRequests.get(tripsKey)
  }

  const request = api
    .get('/schedules', {
      params: {
        fromDate: from,
        toDate: to,
        view: viewMode,
      },
    })
    .then((res) => asArray(res.data))
    .finally(() => {
      inflightRequests.delete(tripsKey)
    })

  inflightRequests.set(tripsKey, request)
  return request
}

async function fetchSchedulesPageData(options = {}, { force = false } = {}) {
  const { viewMode, focusDate } = normalizeOptions('/schedules', options)
  const [schedules, support] = await Promise.all([
    fetchSchedulesTrips(options),
    fetchScheduleSupportData({ force }),
  ])

  return {
    schedules,
    routes: support.routes,
    buses: support.buses,
    drivers: support.drivers,
    viewMode,
    focusDate,
  }
}

/** Warm previous/next period in the background for faster date navigation. */
export function prefetchAdjacentScheduleViews(viewMode, focusDate) {
  const d = parseLocalDateInput(focusDate)
  if (Number.isNaN(d.getTime())) return

  if (viewMode === 'daily') {
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 1)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    prefetchPageData('/schedules', { viewMode: 'daily', focusDate: toDateInputValue(prev) })
    prefetchPageData('/schedules', { viewMode: 'daily', focusDate: toDateInputValue(next) })
    return
  }

  if (viewMode === 'weekly') {
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 7)
    const next = new Date(d)
    next.setDate(next.getDate() + 7)
    prefetchPageData('/schedules', { viewMode: 'weekly', focusDate: toDateInputValue(prev) })
    prefetchPageData('/schedules', { viewMode: 'weekly', focusDate: toDateInputValue(next) })
    return
  }

  if (viewMode === 'monthly') {
    const prev = new Date(d)
    prev.setMonth(prev.getMonth() - 1)
    const next = new Date(d)
    next.setMonth(next.getMonth() + 1)
    prefetchPageData('/schedules', { viewMode: 'monthly', focusDate: toDateInputValue(prev) })
    prefetchPageData('/schedules', { viewMode: 'monthly', focusDate: toDateInputValue(next) })
  }
}

async function fetchReportsPageData(options = {}) {
  const { period, fromDate, toDate } = normalizeOptions('/reports', options)
  const { data } = await api.get('/reports/dashboard', {
    params: { from: fromDate, to: toDate, period },
  })

  return {
    data,
    period,
    fromDate,
    toDate,
  }
}

async function fetchDashboardPageData() {
  const { data } = await api.get('/dashboard')
  return { data }
}

async function fetchDepotsPageData() {
  const { data } = await api.get('/depots')
  return { depots: asArray(data) }
}

async function fetchAdminsPageData() {
  const [adminRes, depotRes] = await Promise.all([api.get('/admins'), api.get('/depots')])
  return {
    admins: asArray(adminRes.data),
    depots: asArray(depotRes.data),
  }
}

async function fetchUsersPageData() {
  const [userRes, depotRes] = await Promise.all([api.get('/users'), api.get('/depots')])
  return {
    accounts: asArray(userRes.data),
    depots: asArray(depotRes.data),
  }
}

async function fetchBusesPageData() {
  const [busRes, driverRes] = await Promise.all([api.get('/buses'), api.get('/drivers')])
  return {
    buses: asArray(busRes.data),
    drivers: asArray(driverRes.data),
  }
}

async function fetchMaintenancePageData() {
  const [mRes, fRes, sRes] = await Promise.all([
    api.get('/maintenance'),
    api.get('/fuel'),
    api.get('/fuel/summary'),
  ])
  return {
    maintenance: asArray(mRes.data),
    fuelLogs: asArray(fRes.data),
    summary: sRes.data || { totalLiters: 0, totalAmount: 0 },
  }
}

function getDriverTripsDateRange() {
  const from = new Date()
  from.setDate(from.getDate() - 30)
  const to = new Date()
  to.setDate(to.getDate() + 90)
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  }
}

function sortDriverTrips(trips) {
  return [...trips].sort((a, b) => {
    const dateA = new Date(a.tripDate).getTime()
    const dateB = new Date(b.tripDate).getTime()
    if (dateA !== dateB) return dateA - dateB
    return String(a.departureTime || '').localeCompare(String(b.departureTime || ''))
  })
}

async function fetchDriverTripsPageData() {
  const { fromDate, toDate } = getDriverTripsDateRange()
  const [schedulesRes, notificationsRes] = await Promise.all([
    api.get('/schedules', { params: { fromDate, toDate } }),
    api.get('/notifications'),
  ])
  const approvalAlerts = asArray(notificationsRes.data).filter(
    (notification) => notification.type === 'trip_approved' && !notification.read
  )
  let trips = asArray(schedulesRes.data)
  const tripIds = new Set(trips.map((trip) => String(trip._id)))
  const missingScheduleIds = [
    ...new Set(
      approvalAlerts
        .map((alert) => alert.data?.scheduleId)
        .filter((scheduleId) => scheduleId && !tripIds.has(String(scheduleId)))
    ),
  ]

  if (missingScheduleIds.length) {
    const extraTrips = await Promise.all(
      missingScheduleIds.map((scheduleId) =>
        api
          .get(`/schedules/${scheduleId}`)
          .then((response) => response.data)
          .catch(() => null)
      )
    )
    trips = trips.concat(extraTrips.filter(Boolean))
  }

  return {
    trips: sortDriverTrips(trips),
    fromDate,
    toDate,
    approvalAlerts,
  }
}

async function fetchScheduleApprovalsPageData() {
  const [pendingRes, rejectedRes] = await Promise.all([
    api.get('/schedules', { params: { status: 'pending' } }),
    api.get('/schedules', { params: { status: 'rejected' } }),
  ])
  return {
    pending: sortApprovalTripsByRecent(asArray(pendingRes.data), 'pending'),
    rejected: sortApprovalTripsByRecent(asArray(rejectedRes.data), 'rejected'),
  }
}

export function isScheduleApproverRole(role) {
  return SCHEDULE_APPROVER_ROLES.has(role)
}

export function isSchedulePlannerRole(role) {
  return role === ROLES.TRANSPORT_SCHEDULER || role === ROLES.ADMINISTRATOR
}

export function prefetchScheduleApprovals() {
  return prefetchPageData(SCHEDULE_APPROVALS_PATH)
}

const pageLoaders = {
  '/dashboard': fetchDashboardPageData,
  '/routes': fetchRoutesPageData,
  '/schedules': fetchSchedulesPageData,
  '/reports': fetchReportsPageData,
  '/depots': fetchDepotsPageData,
  '/admins': fetchAdminsPageData,
  '/users': fetchUsersPageData,
  '/buses': fetchBusesPageData,
  '/maintenance': fetchMaintenancePageData,
  '/my-trips': fetchDriverTripsPageData,
  [SCHEDULE_APPROVALS_PATH]: fetchScheduleApprovalsPageData,
}

export function isPrefetchablePath(path) {
  return Boolean(path && pageLoaders[path])
}

export function getCachedPageData(path, options = {}) {
  if (!isPrefetchablePath(path)) return null

  const cacheKey = getCacheKey(path, options)
  const cached = pageCache.get(cacheKey)
  return isFresh(cached) ? cached.data : null
}

/** Returns cached data even when TTL expired — for instant first paint while refreshing. */
export function getStalePageData(path, options = {}) {
  if (!isPrefetchablePath(path)) return null

  const cacheKey = getCacheKey(path, options)
  return pageCache.get(cacheKey)?.data ?? null
}

export async function loadPageData(path, options = {}, { force = false } = {}) {
  if (!isPrefetchablePath(path)) return null

  const normalized = normalizeOptions(path, options)
  const cacheKey = getCacheKey(path, normalized)

  if (!force) {
    const cached = pageCache.get(cacheKey)
    if (isFresh(cached)) return cached.data
  }

  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)
  }

  const request = pageLoaders[path](normalized, { force })
    .then((data) => {
      pageCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      })
      return data
    })
    .finally(() => {
      inflightRequests.delete(cacheKey)
    })

  inflightRequests.set(cacheKey, request)
  return request
}

export async function prefetchPageData(path, options = {}) {
  try {
    return await loadPageData(path, options)
  } catch {
    return null
  }
}

function clearPageCache(path) {
  for (const key of pageCache.keys()) {
    if (key === path || key.startsWith(`${path}?`)) {
      pageCache.delete(key)
    }
  }
}

export function invalidatePageData(path) {
  clearPageCache(path)
  if (path === '/buses' || path === '/routes' || path === '/schedules') {
    pageCache.delete(ROUTE_SUPPORT_CACHE_KEY)
    pageCache.delete(SCHEDULE_SUPPORT_CACHE_KEY)
  }
  if (path === '/schedules') {
    clearPageCache(SCHEDULE_APPROVALS_PATH)
    for (const key of pageCache.keys()) {
      if (key.startsWith('schedules:trips:')) {
        pageCache.delete(key)
      }
    }
  }
  if (path === SCHEDULE_APPROVALS_PATH) {
    clearPageCache('/schedules')
    for (const key of pageCache.keys()) {
      if (key.startsWith('schedules:trips:')) {
        pageCache.delete(key)
      }
    }
  }
  const relatedPaths = {
    '/maintenance': ['/buses'],
    '/buses': ['/maintenance'],
  }
  for (const relatedPath of relatedPaths[path] || []) {
    clearPageCache(relatedPath)
  }
}

export function primeCriticalPageData() {
  return Promise.allSettled([
    prefetchPageData('/dashboard'),
    prefetchPageData('/routes', { page: 1, limit: 10, search: '', status: '', serviceType: '' }),
    prefetchPageData('/schedules', getDefaultScheduleOptions()),
    prefetchPageData('/reports', getDefaultReportOptions()),
    prefetchPageData('/buses'),
    prefetchPageData('/depots'),
    prefetchPageData('/maintenance'),
    prefetchPageData('/admins'),
    prefetchPageData('/users'),
  ])
}

/** Default fetch options per path so login prefetch matches first page paint. */
function prefetchJobsForRole(role) {
  const paths = (ROLE_ALLOWED_PATHS[role] || []).filter(isPrefetchablePath)

  const jobs = paths.map((path) => {
    if (path === '/routes') {
      return prefetchPageData('/routes', {
        page: 1,
        limit: 10,
        search: '',
        status: '',
        serviceType: '',
      })
    }
    if (path === '/schedules') {
      return prefetchPageData('/schedules', getDefaultScheduleOptions())
    }
    if (path === '/reports') {
      return prefetchPageData('/reports', getDefaultReportOptions())
    }
    return prefetchPageData(path)
  })

  if (isScheduleApproverRole(role) || role === ROLES.TRANSPORT_SCHEDULER) {
    jobs.push(prefetchPageData(SCHEDULE_APPROVALS_PATH))
  }

  return jobs
}

/** Warm all role-accessible module data (runs during login / session restore). */
export function primePagesForRole(role) {
  if (!role) return Promise.resolve([])
  return Promise.allSettled(prefetchJobsForRole(role))
}

export function clearAllPageCache() {
  pageCache.clear()
  inflightRequests.clear()
}
