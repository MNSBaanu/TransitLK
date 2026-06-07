import api from './api'
import { ROLE_ALLOWED_PATHS } from '../config/roles'
import { applyReportPeriodRange, getViewDateRange, toDateInputValue } from '../utils/scheduleHelpers'

const CACHE_TTL_MS = 60 * 1000
const pageCache = new Map()
const inflightRequests = new Map()
const ROUTE_SUPPORT_CACHE_KEY = '__routes_support__'

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
    }
  }

  if (path === '/schedules') {
    const defaults = getDefaultScheduleOptions()
    return {
      viewMode: options.viewMode || defaults.viewMode,
      viewDate: options.viewDate || defaults.viewDate,
    }
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
    return `${path}?page=${normalized.page}&limit=${normalized.limit}&search=${encodeURIComponent(normalized.search)}`
  }

  if (path === '/schedules') {
    return `${path}?viewMode=${normalized.viewMode}&viewDate=${normalized.viewDate}`
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

  const request = Promise.all([api.get('/buses'), api.get('/drivers')])
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
  const { page, limit, search } = normalizeOptions('/routes', options)
  const [routeRes, support] = await Promise.all([
    api.get('/routes', {
      params: { page, limit, search },
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
      assigned: 0,
      avgDistance: null,
    },
    page,
    limit,
    search,
  }
}

async function fetchSchedulesPageData(options = {}) {
  const { viewMode, viewDate } = normalizeOptions('/schedules', options)
  const { from, to } = getViewDateRange(viewMode, viewDate)

  const [schedRes, routeRes, busRes, driverRes] = await Promise.all([
    api.get('/schedules', {
      params: {
        fromDate: from,
        toDate: to,
        view: viewMode,
      },
    }),
    api.get('/routes'),
    api.get('/buses'),
    api.get('/drivers'),
  ])

  return {
    schedules: asArray(schedRes.data),
    routes: asArray(routeRes.data),
    buses: asArray(busRes.data),
    drivers: asArray(driverRes.data),
    viewMode,
    viewDate,
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
  from.setDate(from.getDate() - 7)
  const to = new Date()
  to.setDate(to.getDate() + 30)
  return {
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  }
}

async function fetchDriverTripsPageData() {
  const { fromDate, toDate } = getDriverTripsDateRange()
  const { data } = await api.get('/schedules', {
    params: { fromDate, toDate },
  })
  return { trips: asArray(data), fromDate, toDate }
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

  const request = pageLoaders[path](normalized)
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

export function invalidatePageData(path) {
  for (const key of pageCache.keys()) {
    if (key === path || key.startsWith(`${path}?`)) {
      pageCache.delete(key)
    }
  }
}

export function primeCriticalPageData() {
  return Promise.allSettled([
    prefetchPageData('/dashboard'),
    prefetchPageData('/routes'),
    prefetchPageData('/schedules'),
    prefetchPageData('/reports'),
    prefetchPageData('/buses'),
    prefetchPageData('/depots'),
    prefetchPageData('/maintenance'),
    prefetchPageData('/admins'),
    prefetchPageData('/users'),
  ])
}

export function primePagesForRole(role) {
  const paths = ROLE_ALLOWED_PATHS[role] || []
  return Promise.allSettled(
    paths.filter(isPrefetchablePath).map((path) => prefetchPageData(path))
  )
}
