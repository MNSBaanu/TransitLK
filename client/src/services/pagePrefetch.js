import api from './api'
import { getViewDateRange, toDateInputValue } from '../utils/scheduleHelpers'

const CACHE_TTL_MS = 60 * 1000
const pageCache = new Map()
const inflightRequests = new Map()

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function startOfMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(date) {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function getDefaultScheduleOptions() {
  return {
    viewMode: 'daily',
    viewDate: toDateInputValue(new Date()),
  }
}

function getDefaultReportOptions() {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const start = startOfMonth(today)
  const end = endOfMonth(today)

  return {
    period: 'monthly',
    fromDate: toDateInputValue(start),
    toDate: toDateInputValue(end > today ? today : end),
  }
}

function normalizeOptions(path, options = {}) {
  if (path === '/routes') return {}

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

  if (path === '/routes') return path

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

async function fetchRoutesPageData() {
  const [routeRes, busRes, driverRes] = await Promise.all([
    api.get('/routes'),
    api.get('/buses'),
    api.get('/drivers'),
  ])

  return {
    routes: asArray(routeRes.data),
    buses: asArray(busRes.data),
    drivers: asArray(driverRes.data),
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

const pageLoaders = {
  '/routes': fetchRoutesPageData,
  '/schedules': fetchSchedulesPageData,
  '/reports': fetchReportsPageData,
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
    prefetchPageData('/routes'),
    prefetchPageData('/schedules'),
    prefetchPageData('/reports'),
  ])
}
