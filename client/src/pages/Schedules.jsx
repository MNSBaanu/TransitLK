// Assigned to: Baanu
// Module: Schedule Management

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  getCachedPageData,
  getStalePageData,
  invalidatePageData,
  loadPageData,
  prefetchAdjacentScheduleViews,
  prefetchScheduleApprovals,
} from '../services/pagePrefetch'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import Icon from '../components/Icon'
import ScheduleGantt from '../components/schedules/ScheduleGantt'
import ScheduleWeekTimetable from '../components/schedules/ScheduleWeekTimetable'
import ScheduleMonthOverview from '../components/schedules/ScheduleMonthOverview'
import ScheduleAdjustDrawer from '../components/schedules/ScheduleAdjustDrawer'
import ScheduleTripDetailsDrawer from '../components/schedules/ScheduleTripDetailsDrawer'
import ScheduleTimetableDrawer from '../components/schedules/ScheduleTimetableDrawer'
import ScheduleDriverIssuesDrawer from '../components/schedules/ScheduleDriverIssuesDrawer'
import ConfirmDialog from '../components/ConfirmDialog'
import { isSchedulableRoute } from '../utils/routeHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import {
  detectPeriodConflicts,
  detectTimetableConflicts,
  formatPeriodLabel,
  formatTripDate,
  applySharedTripTimes,
  buildRouteTimetableRows,
  buildTimetableRowsForPeriod,
  defaultTripTimes,
  displayTripNote,
  isDriverReportedIssue,
  filterSchedulesInDateRange,
  getTimetableDateBounds,
  getTimetableDates,
  normalizeTimetableAnchor,
  coerceFocusDate,
  parseLocalDateInput,
  newTimetableId,
  mergeSchedulesById,
  viewRangeCoversTimetable,
  groupTimetableConflictsByRoute,
  reasonToStatus,
  requiresAdjustmentNotes,
  validateTimetableRows,
  isTimetableReady,
  scheduleCode,
  toDateInputValue,
  isTripInViewRange,
  isTripOnDate,
  tripDateKey,
  validateTimeRange,
} from '../utils/scheduleHelpers'
import {
  ModuleHeader,
  ModulePrimaryButton,
  ModuleSecondaryButton,
  ModuleSearchInput,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
import { useLayout } from '../context/LayoutContext'

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'

const SCHEDULES_VIEW_KEY = 'transitlk.schedulesView'

function readPersistedScheduleView() {
  try {
    const raw = sessionStorage.getItem(SCHEDULES_VIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.viewMode && (parsed?.focusDate || parsed?.viewDate)) {
      return {
        viewMode: parsed.viewMode,
        focusDate: coerceFocusDate(parsed.focusDate || parsed.viewDate),
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function SchedulesPage() {
  const persistedView = readPersistedScheduleView()
  const initialFocusDate = coerceFocusDate(persistedView?.focusDate || new Date())
  const initialViewMode = persistedView?.viewMode || 'daily'
  const initialData =
    getCachedPageData('/schedules', {
      viewMode: initialViewMode,
      focusDate: initialFocusDate,
    }) ||
    getStalePageData('/schedules', {
      viewMode: initialViewMode,
      focusDate: initialFocusDate,
    })
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState(() => initialData?.schedules || [])
  const [routes, setRoutes] = useState(() => initialData?.routes || [])
  const [buses, setBuses] = useState(() => initialData?.buses || [])
  const [drivers, setDrivers] = useState(() => initialData?.drivers || [])
  const [loading, setLoading] = useState(!initialData)
  const [refreshing, setRefreshing] = useState(false)
  const { scheduleSearch, setScheduleSearch } = useLayout()
  const [focusDate, setFocusDate] = useState(initialFocusDate)
  const [routeFilter, setRouteFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [showAdjustDrawer, setShowAdjustDrawer] = useState(false)
  const [showTripDetailsDrawer, setShowTripDetailsDrawer] = useState(false)
  const [adjustAwaitingTrip, setAdjustAwaitingTrip] = useState(false)
  const [viewMode, setViewMode] = useState(initialViewMode)
  const [selected, setSelected] = useState(null)
  const [showTimetable, setShowTimetable] = useState(false)
  const [timetablePeriod, setTimetablePeriod] = useState('daily')
  const [timetableAnchor, setTimetableAnchor] = useState(() => toDateInputValue(new Date()))
  const [timetableRows, setTimetableRows] = useState([])
  const [timetableRangeSchedules, setTimetableRangeSchedules] = useState([])
  const [loadingTimetableRange, setLoadingTimetableRange] = useState(false)
  const [timetableRefreshing, setTimetableRefreshing] = useState(false)
  const [showConflictPanel, setShowConflictPanel] = useState(false)
  const [adjustForm, setAdjustForm] = useState({
    ...defaultTripTimes(),
    busId: '',
    driverId: '',
    status: 'scheduled',
    reason: 'normal',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectTargetId, setRejectTargetId] = useState(null)
  const [showIssuesDrawer, setShowIssuesDrawer] = useState(false)
  const [allDriverIssues, setAllDriverIssues] = useState([])
  const [loadingDriverIssues, setLoadingDriverIssues] = useState(false)
  const [refreshingDriverIssues, setRefreshingDriverIssues] = useState(false)
  const maintenanceOfflineTripRef = useRef(null)
  const viewDatePickerRef = useRef(null)
  const prevViewModeRef = useRef(initialViewMode)
  const prevDriverIssueIdsRef = useRef(new Set())

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const invalidateRelatedPages = useCallback(() => {
    invalidatePageData('/schedules')
    invalidatePageData('/reports')
    invalidatePageData('/buses')
    invalidatePageData('/routes')
  }, [])

  const canSeeDriverIssues =
    user?.role === ROLES.TRANSPORT_SCHEDULER ||
    user?.role === ROLES.ADMINISTRATOR ||
    user?.role === ROLES.DEPOT_MANAGER

  const loadDriverIssues = useCallback(
    async ({ silent = false } = {}) => {
      if (!canSeeDriverIssues) return
      if (silent) setRefreshingDriverIssues(true)
      else setLoadingDriverIssues(true)
      try {
        const { data } = await api.get('/schedules', { params: { driverIssues: 'true' } })
        setAllDriverIssues(Array.isArray(data) ? data.filter(isDriverReportedIssue) : [])
      } catch {
        if (!silent) setAllDriverIssues([])
      } finally {
        setLoadingDriverIssues(false)
        setRefreshingDriverIssues(false)
      }
    },
    [canSeeDriverIssues]
  )

  const loadData = useCallback(async ({ force = false, keepContent = false, viewMode: viewModeOverride, focusDate: focusDateOverride } = {}) => {
    const activeViewMode = viewModeOverride ?? viewMode
    const activeFocusDate = coerceFocusDate(focusDateOverride ?? focusDate)

    if (!force) {
      const cached = getCachedPageData('/schedules', {
        viewMode: activeViewMode,
        focusDate: activeFocusDate,
      })
      if (cached) {
        setSchedules(cached.schedules)
        setRoutes(cached.routes)
        setBuses(cached.buses)
        setDrivers(cached.drivers)
        setLoading(false)
        setError('')
        return
      }
    }

    if (keepContent) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const data = await loadPageData(
        '/schedules',
        { viewMode: activeViewMode, focusDate: activeFocusDate },
        { force }
      )
      if (!data) {
        setError('Failed to load schedules')
        return
      }
      setSchedules(data.schedules)
      setRoutes(data.routes)
      setBuses(data.buses)
      setDrivers(data.drivers)
      prefetchAdjacentScheduleViews(activeViewMode, activeFocusDate)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [focusDate, viewMode])

  const activeRoutes = useMemo(
    () => routes.filter(isSchedulableRoute),
    [routes]
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(SCHEDULES_VIEW_KEY, JSON.stringify({ viewMode, focusDate }))
    } catch {
      /* ignore */
    }
  }, [viewMode, focusDate])

  useEffect(() => {
    let cancelled = false
    const modeChanged = prevViewModeRef.current !== viewMode
    prevViewModeRef.current = viewMode
    const options = { viewMode, focusDate }

    if (!modeChanged) {
      const cached = getCachedPageData('/schedules', options)
      if (cached) {
        setSchedules(cached.schedules)
        setRoutes(cached.routes)
        setBuses(cached.buses)
        setDrivers(cached.drivers)
        setLoading(false)
        prefetchAdjacentScheduleViews(viewMode, focusDate)
        return undefined
      }

      const stale = getStalePageData('/schedules', options)
      if (stale) {
        setSchedules(stale.schedules)
        setRoutes(stale.routes)
        setBuses(stale.buses)
        setDrivers(stale.drivers)
        setLoading(false)
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) loadData({ keepContent: true, force: modeChanged })
    })
    return () => {
      cancelled = true
    }
  }, [loadData, viewMode, focusDate])

  useAutoRefresh(
    () => {
      loadData({ force: true, keepContent: true })
      loadDriverIssues({ silent: true })
    },
    {
      enabled:
        !showTimetable &&
        !showAdjustDrawer &&
        !showTripDetailsDrawer &&
        !showIssuesDrawer &&
        !saving &&
        !maintenanceConfirm,
    }
  )

  useEffect(() => {
    if (!canSeeDriverIssues) return undefined
    loadDriverIssues()
    return undefined
  }, [canSeeDriverIssues, loadDriverIssues])

  const applyTimetableSource = useCallback(
    (period, anchor, sourceSchedules) => {
      const built = buildTimetableRowsForPeriod(routes, sourceSchedules, period, anchor)
      setTimetableRows(applySharedTripTimes(built, defaultTripTimes()))
    },
    [routes]
  )

  const handleTimetableRefresh = useCallback(async () => {
    setTimetableRefreshing(true)
    setError('')
    try {
      const data = await loadPageData('/schedules', { viewMode, focusDate }, { force: true })
      setSchedules(data.schedules)
      setRoutes(data.routes)
      setBuses(data.buses)
      setDrivers(data.drivers)
      const { from, to } = getTimetableDateBounds(timetablePeriod, timetableAnchor)
      if (from && to) {
        const { data: rangeSchedules } = await api.get('/schedules', {
          params: { fromDate: from, toDate: to },
        })
        const merged = mergeSchedulesById(
          filterSchedulesInDateRange(data.schedules, from, to),
          Array.isArray(rangeSchedules) ? rangeSchedules : []
        )
        setTimetableRangeSchedules(merged)
        applyTimetableSource(timetablePeriod, timetableAnchor, merged)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refresh timetable data')
    } finally {
      setTimetableRefreshing(false)
    }
  }, [timetableAnchor, timetablePeriod, focusDate, viewMode, applyTimetableSource])

  const filteredSchedules = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase()
    return schedules.filter((s) => {
      if (!isTripInViewRange(s, viewMode, focusDate)) return false
      if (routeFilter && String(s.routeId?._id || s.routeId) !== routeFilter) return false
      if (driverFilter && String(s.driverId?._id || s.driverId) !== driverFilter) return false
      if (!q) return true
      const hay = [
        s.routeId?.routeName,
        s.routeId?.startPoint,
        s.routeId?.endPoint,
        s.busId?.regNumber,
        s.driverId?.name,
        s.departureTime,
        s.arrivalTime,
        scheduleCode(s),
        s.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [schedules, scheduleSearch, routeFilter, driverFilter, viewMode, focusDate])

  const displaySchedules = useMemo(
    () => filteredSchedules.filter((s) => s.status !== 'cancelled'),
    [filteredSchedules]
  )

  const visibleRoutes = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase()
    if (!q) return activeRoutes
    const tripRouteIds = new Set(
      displaySchedules.map((s) => String(s.routeId?._id || s.routeId))
    )
    return activeRoutes.filter((r) => {
      if (tripRouteIds.has(String(r._id))) return true
      const routeHay = [r.routeName, r.routeNo, r.startPoint, r.endPoint]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return routeHay.includes(q)
    })
  }, [activeRoutes, displaySchedules, scheduleSearch])

  const conflicts = useMemo(
    () => detectPeriodConflicts(displaySchedules),
    [displaySchedules]
  )

  const scheduleStats = useMemo(() => {
    const active = displaySchedules.filter((s) => s.status !== 'cancelled').length
    const delayed = displaySchedules.filter((s) => s.status === 'delayed').length
    return {
      trips: displaySchedules.length,
      active,
      delayed,
      conflicts: conflicts.length,
      driverIssues: allDriverIssues.length,
    }
  }, [displaySchedules, conflicts, allDriverIssues.length])

  const ganttRows = useMemo(() => {
    const dayTrips = displaySchedules.filter((s) => isTripOnDate(s, focusDate))
    return buildRouteTimetableRows(visibleRoutes, dayTrips).map((route) => ({
      ...route,
      trips: dayTrips.filter(
        (trip) => String(trip.routeId?._id || trip.routeId) === String(route._id)
      ),
    }))
  }, [displaySchedules, focusDate, visibleRoutes])

  const timetableTripCount = useMemo(() => {
    const included = timetableRows.filter((r) => r.included).length
    return included * getTimetableDates(timetablePeriod, timetableAnchor).length
  }, [timetableRows, timetablePeriod, timetableAnchor])

  const timetableReady = useMemo(() => isTimetableReady(timetableRows), [timetableRows])

  useEffect(() => {
    if (!showTimetable) return undefined

    const period = timetablePeriod
    const anchor = timetableAnchor
    const { from, to } = getTimetableDateBounds(period, anchor)
    if (!from || !to) return undefined

    let cancelled = false
    const localRange = filterSchedulesInDateRange(schedules, from, to)
    const instant = mergeSchedulesById(timetableRangeSchedules, localRange)
    const covered = viewRangeCoversTimetable(viewMode, focusDate, period, anchor)

    setTimetableRangeSchedules(instant)
    applyTimetableSource(period, anchor, instant)

    if (covered || localRange.length > 0) {
      setLoadingTimetableRange(false)
      return () => {
        cancelled = true
      }
    }

    setLoadingTimetableRange(true)
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get('/schedules', {
          params: { fromDate: from, toDate: to },
        })
        if (cancelled) return
        const merged = mergeSchedulesById(instant, Array.isArray(data) ? data : [])
        setTimetableRangeSchedules(merged)
        applyTimetableSource(period, anchor, merged)
      } catch {
        if (!cancelled && !instant.length) {
          setTimetableRangeSchedules([])
          applyTimetableSource(period, anchor, [])
        }
      } finally {
        if (!cancelled) setLoadingTimetableRange(false)
      }
    }, 200)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    showTimetable,
    timetablePeriod,
    timetableAnchor,
    viewMode,
    focusDate,
    schedules,
    applyTimetableSource,
  ])

  const timetableConflicts = useMemo(() => {
    if (!showTimetable) return null

    const validationErrors = validateTimetableRows(timetableRows)
    if (validationErrors.length) {
      return {
        hasConflict: true,
        issues: [
          {
            routeId: '',
            routeName: 'Validation',
            tripDate: '',
            conflicts: validationErrors.map((message) => ({ type: 'validation', message })),
          },
        ],
        conflictCount: validationErrors.length,
      }
    }

    const included = timetableRows.filter((r) => r.included)
    if (!included.length) {
      return { hasConflict: false, issues: [], conflictCount: 0 }
    }

    const dates = getTimetableDates(timetablePeriod, timetableAnchor)
    return detectTimetableConflicts(dates, included, timetableRangeSchedules)
  }, [showTimetable, timetableRows, timetablePeriod, timetableAnchor, timetableRangeSchedules])

  const timetableRowConflicts = useMemo(
    () => groupTimetableConflictsByRoute(timetableConflicts?.issues, timetableRows),
    [timetableConflicts, timetableRows]
  )

  const [adjustConflict, setAdjustConflict] = useState(null)

  useEffect(() => {
    if (!selected || !adjustForm.busId || !adjustForm.driverId) {
      const resetTimer = window.setTimeout(() => setAdjustConflict(null), 0)
      return () => window.clearTimeout(resetTimer)
    }
    const timeErr = validateTimeRange(adjustForm.departureTime, adjustForm.arrivalTime)
    if (timeErr) {
      const errorTimer = window.setTimeout(() => {
        setAdjustConflict({ hasConflict: true, conflicts: [{ message: timeErr }] })
      }, 0)
      return () => window.clearTimeout(errorTimer)
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/schedules/conflicts/check', {
          params: {
            tripDate: tripDateKey(selected),
            routeId: selected.routeId?._id || selected.routeId,
            busId: adjustForm.busId,
            driverId: adjustForm.driverId,
            departureTime: adjustForm.departureTime,
            arrivalTime: adjustForm.arrivalTime,
            excludeId: selected._id,
          },
        })
        setAdjustConflict(data)
      } catch {
        setAdjustConflict(null)
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [selected, adjustForm])

  const shiftDate = (delta) => {
    const d = parseLocalDateInput(focusDate)
    if (viewMode === 'weekly') d.setDate(d.getDate() + delta * 7)
    else if (viewMode === 'monthly') d.setMonth(d.getMonth() + delta)
    else d.setDate(d.getDate() + delta)
    setFocusDate(coerceFocusDate(toDateInputValue(d)))
    setSelected(null)
  }

  const openViewDatePicker = () => {
    const input = viewDatePickerRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  const handleViewDatePick = (e) => {
    const value = e.target.value
    if (!value) return
    const next =
      viewMode === 'monthly'
        ? coerceFocusDate(`${value}-01`)
        : coerceFocusDate(value)
    setFocusDate(next)
    setSelected(null)
  }

  const syncTripForm = (trip) => ({
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    busId: trip.busId?._id || trip.busId || '',
    driverId: trip.driverId?._id || trip.driverId || '',
    status: trip.status || 'scheduled',
    reason: trip.adjustmentReason || 'normal',
    notes: displayTripNote(trip.adjustmentNotes) || '',
  })

  const closeScheduleModals = ({ clearSelection = false } = {}) => {
    setShowAdjustDrawer(false)
    setShowTripDetailsDrawer(false)
    setAdjustAwaitingTrip(false)
    setShowConflictPanel(false)
    setShowTimetable(false)
    setMaintenanceConfirm(false)
    maintenanceOfflineTripRef.current = null
    if (clearSelection) setSelected(null)
  }

  const openAdjustDrawer = () => {
    if (!selected) {
      setAdjustAwaitingTrip(true)
      setShowTripDetailsDrawer(false)
      setShowAdjustDrawer(true)
      setShowConflictPanel(false)
      return
    }
    setAdjustForm(syncTripForm(selected))
    setShowTripDetailsDrawer(false)
    setShowAdjustDrawer(true)
    setAdjustAwaitingTrip(false)
    setShowConflictPanel(false)
  }

  const selectTrip = (trip, { openDetails = true, openAdjust = false } = {}) => {
    setSelected(trip)
    setShowConflictPanel(false)
    setFocusDate(coerceFocusDate(tripDateKey(trip)))
    setAdjustForm(syncTripForm(trip))
    if (openAdjust || adjustAwaitingTrip) {
      setShowTripDetailsDrawer(false)
      setShowAdjustDrawer(true)
      setAdjustAwaitingTrip(false)
    } else if (openDetails) {
      setShowAdjustDrawer(false)
      setShowTripDetailsDrawer(true)
    }
  }

  useEffect(() => {
    const focusId = location.state?.focusScheduleId
    const focusDate = location.state?.viewDate
    const openAdjust = Boolean(location.state?.openAdjust)
    if (!focusId) return undefined

    if (focusDate) {
      setViewMode('daily')
      setFocusDate(focusDate)
    }

    const trip = schedules.find((item) => item._id === focusId)
    if (!trip) return undefined

    const allowAdjust =
      user?.role === ROLES.TRANSPORT_SCHEDULER || user?.role === ROLES.ADMINISTRATOR
    selectTrip(trip, {
      openDetails: !openAdjust || !allowAdjust,
      openAdjust: openAdjust && allowAdjust,
    })
    navigate(location.pathname, { replace: true, state: {} })
    return undefined
  }, [location.pathname, location.state, navigate, schedules, user?.role])

  const openTimetableDrawer = () => {
    const period = viewMode
    const anchor = normalizeTimetableAnchor(period, focusDate)
    const { from, to } = getTimetableDateBounds(period, anchor)
    const instant = mergeSchedulesById(
      timetableRangeSchedules,
      filterSchedulesInDateRange(schedules, from, to)
    )
    setTimetablePeriod(period)
    setTimetableAnchor(anchor)
    setTimetableRangeSchedules(instant)
    const built = buildTimetableRowsForPeriod(routes, instant, period, anchor)
    setTimetableRows(applySharedTripTimes(built, defaultTripTimes()))
    setError('')
    setShowTimetable(true)
  }

  const handleTimetableRowChange = (tripRowId, field, value) => {
    setTimetableRows((rows) => {
      const next = rows.map((r) =>
        String(r.tripRowId) === String(tripRowId) ? { ...r, [field]: value } : r
      )
      if (field === 'departureTime' || field === 'arrivalTime') {
        const source = next.find((r) => String(r.tripRowId) === String(tripRowId))
        if (source) {
          return applySharedTripTimes(next, {
            departureTime: source.departureTime,
            arrivalTime: source.arrivalTime,
          })
        }
      }
      return next
    })
  }

  const handleTimetableToggleAll = (checked) => {
    setTimetableRows((rows) => rows.map((r) => ({ ...r, included: checked })))
  }

  const handleTimetablePeriodChange = (period) => {
    setTimetablePeriod(period)
    setTimetableAnchor((prev) => normalizeTimetableAnchor(period, prev))
  }

  const handleTimetableAnchorChange = (date) => {
    setTimetableAnchor(normalizeTimetableAnchor(timetablePeriod, date))
  }

  const handleAdjustChange = (e) => {
    const { name, value } = e.target
    setAdjustForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'reason') {
        next.status = reasonToStatus(value, prev.status)
      }
      return next
    })
  }

  const handleEmergencyToggle = (on) => {
    if (!selected) return
    setAdjustForm((prev) => ({
      ...prev,
      reason: on ? 'emergency' : 'normal',
      status: reasonToStatus(on ? 'emergency' : 'normal', on ? prev.status : selected.status || prev.status),
    }))
  }

  const handlePickMaintenanceBus = (bus) => {
    if (!selected || !bus) return
    setAdjustForm((prev) => ({
      ...prev,
      busId: bus._id,
      reason: 'maintenance',
      status: reasonToStatus('maintenance', prev.status),
      notes:
        prev.notes?.trim() ||
        `Maintenance swap from ${selected.busId?.regNumber || 'vehicle'} to ${bus.regNumber}`,
    }))
    setError('')
    showToast(`Selected ${bus.regNumber} — review and apply to save`)
  }

  const handlePickCoverDriver = (driver) => {
    if (!selected || !driver) return
    setAdjustForm((prev) => ({
      ...prev,
      driverId: driver._id,
      reason: 'absence',
      status: reasonToStatus('absence', prev.status),
      notes:
        prev.notes?.trim() ||
        `Cover driver for ${selected.driverId?.name || 'assigned driver'}: ${driver.name}`,
    }))
    setError('')
    showToast(`Selected ${driver.name} — review and apply to save`)
  }

  const closeMaintenanceOfflineUi = useCallback(() => {
    closeScheduleModals({ clearSelection: true })
    setAdjustForm({
      ...defaultTripTimes(),
      busId: '',
      driverId: '',
      status: 'scheduled',
      reason: 'maintenance',
      notes: '',
    })
  }, [])

  const handleMaintenanceOffline = async () => {
    const trip = maintenanceOfflineTripRef.current || selected
    if (!trip) {
      setMaintenanceConfirm(false)
      return
    }
    const busId = trip.busId?._id || trip.busId
    if (!busId) {
      setError('No vehicle assigned to this trip')
      setMaintenanceConfirm(false)
      return
    }

    setSaving(true)
    setError('')
    const notes =
      adjustForm.notes?.trim() ||
      `Emergency maintenance offline — trip ${scheduleCode(trip)} cancelled`

    try {
      const { data: updatedTrip } = await api.put(`/schedules/${trip._id}`, {
        status: 'cancelled',
        adjustmentReason: 'maintenance',
        adjustmentNotes: notes,
        routeId: trip.routeId?._id || trip.routeId,
        busId,
        driverId: trip.driverId?._id || trip.driverId,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        tripDate: trip.tripDate,
      })
      await api.post('/maintenance', {
        bus_id: busId,
        service_date: trip.tripDate || new Date().toISOString(),
        description: notes,
        cost: 0,
      })
      setSchedules((prev) =>
        prev.map((s) => (String(s._id) === String(updatedTrip._id) ? updatedTrip : s))
      )
      closeMaintenanceOfflineUi()
      invalidateRelatedPages()
      showToast('Maintenance logged; vehicle offline; trip cancelled')
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Maintenance offline action failed')
    } finally {
      setSaving(false)
    }
  }

  const createOneSchedule = async (tripDate, payload, timetableMeta) => {
    await api.post('/schedules', { ...payload, tripDate, ...timetableMeta })
  }

  const handleCreateTimetable = async (e) => {
    e.preventDefault()
    const validationErrors = validateTimetableRows(timetableRows)
    if (validationErrors.length) {
      setError(
        `Cannot create timetable: every included route needs a bus and driver. ${validationErrors.join('. ')}`
      )
      return
    }

    const dates = getTimetableDates(timetablePeriod, timetableAnchor)
    const included = timetableRows.filter((r) => r.included)

    try {
      const { data: precheck } = await api.post('/schedules/conflicts/timetable', {
        dates,
        rows: included,
      })
      if (precheck.hasConflict) {
        setError(
          `Cannot create timetable: ${precheck.conflictCount || precheck.issues?.length} conflict(s) detected. Resolve overlaps before saving.`
        )
        return
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Conflict check failed')
      return
    }

    if (timetableConflicts?.hasConflict) {
      setError('Resolve all scheduling conflicts before creating the timetable')
      return
    }

    setSaving(true)
    setError('')
    let created = 0
    const skipped = []
    const savedViewDate = normalizeTimetableAnchor(timetablePeriod, timetableAnchor)
    const timetableMeta = {
      timetableId: newTimetableId(),
      timetablePeriod,
      timetableAnchor: savedViewDate,
    }

    try {
      for (const row of included) {
        const payload = {
          routeId: row.routeId,
          busId: row.busId,
          driverId: row.driverId,
          departureTime: row.departureTime,
          arrivalTime: row.arrivalTime,
          status: 'pending',
          adjustmentReason: 'normal',
          adjustmentNotes: row.remarks?.trim() || '',
        }
        for (const day of dates) {
          try {
            await createOneSchedule(day, payload, timetableMeta)
            created += 1
          } catch (err) {
            const msg = err.response?.data?.message || 'Conflict'
            const detail = err.response?.data?.conflicts?.map((c) => c.message).join('; ')
            skipped.push(`${row.routeName} ${day}: ${detail || msg}`)
          }
        }
      }

      if (created > 0) {
        const savedViewMode = timetablePeriod
        closeScheduleModals()
        try {
          sessionStorage.setItem(
            SCHEDULES_VIEW_KEY,
            JSON.stringify({ viewMode: savedViewMode, focusDate })
          )
        } catch {
          /* ignore */
        }
        setViewMode(savedViewMode)
        invalidateRelatedPages()
        showToast(
          `${created} trip(s) sent for depot manager approval${
            skipped.length ? ` (${skipped.length} skipped)` : ''
          }`
        )
        await loadData({
          force: true,
          keepContent: false,
          viewMode: savedViewMode,
          focusDate,
        })
      }
      if (skipped.length) {
        setError(`Some trips could not be scheduled: ${skipped.slice(0, 5).join(' | ')}${skipped.length > 5 ? ` (+${skipped.length - 5} more)` : ''}`)
      }
      if (created === 0) {
        setError(skipped[0] || 'Failed to create timetable')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create timetable')
    } finally {
      setSaving(false)
    }
  }

  const [pendingApprovalCount, setPendingApprovalCount] = useState(() => {
    const cached =
      getCachedPageData('/schedules/approvals') || getStalePageData('/schedules/approvals')
    return cached?.pending?.length ?? 0
  })
  const [rejectedApprovalCount, setRejectedApprovalCount] = useState(() => {
    const cached =
      getCachedPageData('/schedules/approvals') || getStalePageData('/schedules/approvals')
    return cached?.rejected?.length ?? 0
  })

  const handleSubmitDraft = async () => {
    if (!selected || selected.status !== 'draft') return
    setSaving(true)
    try {
      await api.post(`/schedules/${selected._id}/submit`)
      invalidateRelatedPages()
      showToast('Submitted for approval')
      closeScheduleModals()
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTrip = async () => {
    if (!selected) return
    const cancelReason = adjustForm.reason === 'normal' ? 'obstruction' : adjustForm.reason
    if (requiresAdjustmentNotes(cancelReason) && !adjustForm.notes?.trim()) {
      setError('Add a cancellation note in the reason/notes section before cancelling')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data: updatedTrip } = await api.put(`/schedules/${selected._id}`, {
        status: 'cancelled',
        adjustmentReason: cancelReason,
        adjustmentNotes:
          adjustForm.notes?.trim() ||
          `Trip cancelled — ${cancelReason}`,
        tripDate: selected.tripDate,
        routeId: selected.routeId?._id || selected.routeId,
        busId: selected.busId?._id || selected.busId,
        driverId: selected.driverId?._id || selected.driverId,
        departureTime: selected.departureTime,
        arrivalTime: selected.arrivalTime,
      })
      setSchedules((prev) =>
        prev.map((s) => (String(s._id) === String(updatedTrip._id) ? updatedTrip : s))
      )
      invalidateRelatedPages()
      showToast('Trip cancelled')
      closeScheduleModals({ clearSelection: true })
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel trip')
    } finally {
      setSaving(false)
    }
  }

  const handleApply = async () => {
    if (!selected || !adjustForm) return
    const timeErr = validateTimeRange(adjustForm.departureTime, adjustForm.arrivalTime)
    if (timeErr) {
      setError(timeErr)
      return
    }
    if (requiresAdjustmentNotes(adjustForm.reason) && !adjustForm.notes?.trim()) {
      setError('Notes are required for emergency, maintenance, absence, or obstruction adjustments')
      return
    }
    if (adjustConflict?.hasConflict) {
      setError('Resolve scheduling conflicts before saving')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put(`/schedules/${selected._id}`, {
        departureTime: adjustForm.departureTime,
        arrivalTime: adjustForm.arrivalTime,
        busId: adjustForm.busId,
        driverId: adjustForm.driverId,
        status: reasonToStatus(adjustForm.reason, adjustForm.status),
        adjustmentReason: adjustForm.reason,
        adjustmentNotes: adjustForm.notes?.trim() || '',
        tripDate: selected.tripDate,
        routeId: selected.routeId?._id || selected.routeId,
      })
      setSchedules((prev) =>
        prev.map((s) => (String(s._id) === String(data._id) ? data : s))
      )
      const terminal = ['completed', 'cancelled'].includes(data.status)
      if (terminal) {
        closeScheduleModals({ clearSelection: true })
        showToast(
          data.status === 'completed' ? 'Trip marked completed' : 'Schedule updated'
        )
      } else {
        selectTrip(data, { openDetails: true })
        setShowAdjustDrawer(false)
        setShowConflictPanel(false)
        showToast('Schedule updated')
      }
      invalidateRelatedPages()
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update schedule'
      const conflictsData = err.response?.data?.conflicts
      setError(
        conflictsData?.length
          ? `${msg}: ${conflictsData.map((c) => c.message).join('; ')}`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  const handlePickDay = (dayKey) => {
    setFocusDate(coerceFocusDate(dayKey))
    setViewMode('daily')
    setSelected(null)
  }

  const handleApproveTrip = async (id) => {
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/schedules/${id}/approve`)
      setSchedules((prev) => prev.map((s) => (String(s._id) === String(id) ? data : s)))
      if (selected && String(selected._id) === String(id)) {
        selectTrip(data, { openDetails: true })
      }
      invalidateRelatedPages()
      invalidatePageData('/schedules/approvals')
      setPendingApprovalCount((c) => Math.max(0, c - 1))
      showToast('Trip approved — driver can view it in My trips')
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Approve failed'
      const conflictsData = err.response?.data?.conflicts
      setError(
        conflictsData?.length
          ? `${msg}: ${conflictsData.map((c) => c.message).join('; ')}`
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  const openRejectModal = (id) => {
    setRejectTargetId(id)
    setRejectReason('')
    setError('')
  }

  const closeRejectModal = () => {
    if (saving) return
    setRejectTargetId(null)
    setRejectReason('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectTargetId || !rejectReason.trim()) return
    setSaving(true)
    setError('')
    try {
      const { data } = await api.post(`/schedules/${rejectTargetId}/reject`, {
        reason: rejectReason.trim(),
      })
      setSchedules((prev) =>
        prev.map((s) => (String(s._id) === String(rejectTargetId) ? data : s))
      )
      if (selected && String(selected._id) === String(rejectTargetId)) {
        selectTrip(data, { openDetails: true })
      }
      invalidateRelatedPages()
      invalidatePageData('/schedules/approvals')
      setPendingApprovalCount((c) => Math.max(0, c - 1))
      closeRejectModal()
      showToast('Trip returned to scheduler')
      await loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed')
    } finally {
      setSaving(false)
    }
  }

  const dateLabel =
    viewMode === 'daily'
      ? formatTripDate(focusDate)
      : formatPeriodLabel(viewMode, focusDate)

  const isScheduler = user?.role === ROLES.TRANSPORT_SCHEDULER
  const isAdministrator = user?.role === ROLES.ADMINISTRATOR
  const isDepotManager = user?.role === ROLES.DEPOT_MANAGER
  const canPlanSchedules = isScheduler || isAdministrator
  const canApproveSchedules = isDepotManager || isAdministrator
  const canAdjustSchedules = canPlanSchedules
  const driverIssueCount = allDriverIssues.length

  useEffect(() => {
    if (!canSeeDriverIssues) return undefined
    const currentIds = new Set(allDriverIssues.map((t) => String(t._id)))
    const newIssues = [...currentIds].filter((id) => !prevDriverIssueIdsRef.current.has(id))
    if (prevDriverIssueIdsRef.current.size > 0 && newIssues.length > 0) {
      showToast(
        `Driver reported ${newIssues.length} trip issue${newIssues.length > 1 ? 's' : ''} — open Issues`
      )
    }
    prevDriverIssueIdsRef.current = currentIds
    return undefined
  }, [allDriverIssues, canSeeDriverIssues])

  const shouldPrefetchApprovals =
    canApproveSchedules || (isScheduler && !isAdministrator)

  useEffect(() => {
    if (!shouldPrefetchApprovals) return undefined

    let cancelled = false
    void prefetchScheduleApprovals().then((data) => {
      if (cancelled || !data) return
      if (data.pending) setPendingApprovalCount(data.pending.length)
      if (data.rejected) setRejectedApprovalCount(data.rejected.length)
    })

    return () => {
      cancelled = true
    }
  }, [shouldPrefetchApprovals, schedules])

  const scheduleHeaderTitle =
    canApproveSchedules && canPlanSchedules
      ? 'Schedule Management & Approvals'
      : canApproveSchedules
        ? 'Schedule Approval & Operations'
        : 'Schedule Management'

  const scheduleHeaderSubtitle = canApproveSchedules && !canPlanSchedules
    ? 'Review pending timetables from schedulers, approve trips for drivers, and return incomplete plans when needed.'
    : canApproveSchedules && canPlanSchedules
      ? 'Plan timetables, adjust live trips, and review pending approvals for drivers.'
      : 'Daily, weekly, and monthly timetables with automatic overlap detection—conflicts are blocked before save and approval.'

  const scheduleStatItems = [
    ...(canApproveSchedules
      ? [
          {
            label: 'Awaiting approval',
            value: pendingApprovalCount,
            hint: pendingApprovalCount ? 'Open pending approvals' : 'No pending trips',
            icon: 'pending_actions',
          },
        ]
      : []),
    ...(isScheduler && !isAdministrator
      ? [
          {
            label: 'Rejected',
            value: rejectedApprovalCount,
            hint: rejectedApprovalCount ? 'Review rejected trips' : 'No rejected trips',
            icon: 'cancel',
          },
        ]
      : []),
    {
      label: viewMode === 'daily' ? 'Trips today' : 'Trips in view',
      value: scheduleStats.trips,
      icon: 'event',
    },
    { label: 'Active trips', value: scheduleStats.active, icon: 'schedule' },
    ...(canSeeDriverIssues
      ? [
          {
            label: 'Driver issues',
            value: scheduleStats.driverIssues,
            hint: scheduleStats.driverIssues
              ? 'Driver reported trip delays'
              : 'No driver issues',
            icon: 'report_problem',
          },
        ]
      : []),
    ...(!canApproveSchedules
      ? [{ label: 'Delayed', value: scheduleStats.delayed, icon: 'schedule_send' }]
      : []),
  ]

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title={scheduleHeaderTitle}
        subtitle={scheduleHeaderSubtitle}
        action={
          canPlanSchedules || canAdjustSchedules || canApproveSchedules ? (
            <div className="flex flex-wrap items-center justify-end gap-2 overflow-visible">
              {canPlanSchedules && (
                <ModulePrimaryButton icon="add" onClick={openTimetableDrawer}>
                  Create Timetable
                </ModulePrimaryButton>
              )}
              {canAdjustSchedules && (
                <ModuleSecondaryButton icon="tune" onClick={openAdjustDrawer}>
                  Adjust
                </ModuleSecondaryButton>
              )}
              {canSeeDriverIssues && (
                <ModuleSecondaryButton
                  icon="report_problem"
                  badge={driverIssueCount}
                  onClick={() => {
                    setShowIssuesDrawer(true)
                    loadDriverIssues({ silent: true })
                  }}
                >
                  Issues
                </ModuleSecondaryButton>
              )}
              {isAdministrator && canApproveSchedules && (
                <ModuleSecondaryButton
                  icon="pending_actions"
                  badge={pendingApprovalCount + rejectedApprovalCount}
                  onClick={() => navigate('/schedules/approvals')}
                >
                  Approvals
                </ModuleSecondaryButton>
              )}
              {isDepotManager && (
                <ModuleSecondaryButton
                  icon="pending_actions"
                  badge={pendingApprovalCount}
                  onClick={() => navigate('/schedules/approvals')}
                >
                  Pending approvals
                </ModuleSecondaryButton>
              )}
              {isScheduler && !isAdministrator && (
                <ModuleSecondaryButton
                  icon="cancel"
                  badge={rejectedApprovalCount}
                  onClick={() => navigate('/schedules/approvals?tab=rejected')}
                >
                  Rejected approvals
                </ModuleSecondaryButton>
              )}
            </div>
          ) : null
        }
      />

      <ModuleStats items={scheduleStatItems} />

      {/* Conflict & emergency bar */}
      <div
        className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 ${
          conflicts.length > 0
            ? 'border-red-200 bg-red-50'
            : 'glass-panel border-white/50'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (canAdjustSchedules) {
              setShowConflictPanel(true)
              setShowAdjustDrawer(true)
            }
          }}
          disabled={!canAdjustSchedules}
          className={`flex items-center gap-2 text-left text-sm font-semibold text-fleet-ink ${
            canAdjustSchedules ? 'hover:opacity-80' : 'cursor-default'
          }`}
        >
          <Icon
            name="warning"
            size={20}
            className={conflicts.length > 0 ? 'text-red-600' : 'text-emerald-600'}
          />
          {conflicts.length > 0
            ? `${conflicts.length} active scheduling conflict${conflicts.length > 1 ? 's' : ''}`
            : 'No scheduling conflicts in this period'}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {conflicts.length > 0 && canAdjustSchedules && (
            <button
              type="button"
              onClick={() => {
                setShowConflictPanel(true)
                setShowAdjustDrawer(true)
              }}
              className="text-xs font-bold uppercase tracking-wide text-red-700 hover:underline"
            >
              Resolve conflicts
            </button>
          )}
        </div>
      </div>

      {error && !showTimetable && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {adjustAwaitingTrip && !selected && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-depot-blue-light/30 bg-depot-navy/5 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-depot-blue-light/15 text-depot-navy">
              <Icon name="touch_app" size={22} />
            </span>
            <div>
              <p className="text-sm font-semibold text-fleet-ink">Select a trip to adjust</p>
              <p className="mt-0.5 text-sm text-fleet-ink-muted">
                Click any trip in the daily, weekly, or monthly timetable. You can then change times,
                reassign the bus or driver, and save.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdjustAwaitingTrip(false)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-fleet-ink-muted hover:bg-white/60 hover:text-fleet-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Workspace card */}
      <div className="pro-card flex min-h-[560px] flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-col gap-4 border-b border-outline-variant bg-surface-container/50 px-3 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="pro-segmented w-full shrink-0 bg-white/50 sm:w-auto">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    if (mode === viewMode) return
                    setViewMode(mode)
                    setSelected(null)
                    closeScheduleModals()
                  }}
                  className={`rounded-md border px-4 py-2 text-sm capitalize transition-colors ${
                    viewMode === mode
                      ? 'border-outline-variant bg-white font-semibold text-fleet-ink shadow-sm'
                      : 'border-transparent bg-transparent text-fleet-ink-muted hover:text-fleet-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end lg:w-auto lg:gap-4">
              <div className="flex w-full flex-col gap-1 sm:min-w-[12rem] sm:w-auto lg:min-w-[14rem]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Search
                </span>
                <ModuleSearchInput
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  placeholder="Route, bus, driver, time..."
                  className="min-w-0"
                />
              </div>
              <div className="flex w-full flex-col gap-1 sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Route filter
                </span>
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  aria-label="Route filter"
                  className={`${inputClass} w-full py-2 sm:min-w-[9.5rem]`}
                >
                  <option value="">All routes</option>
                  {activeRoutes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex w-full flex-col gap-1 sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Driver filter
                </span>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  aria-label="Driver filter"
                  className={`${inputClass} w-full py-2 sm:min-w-[9.5rem]`}
                >
                  <option value="">All drivers</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className="relative flex w-full items-center rounded-lg border border-outline-variant bg-white sm:w-auto"
                role="group"
                aria-label="Date navigation"
              >
                <button
                  type="button"
                  onClick={() => shiftDate(-1)}
                  className="rounded-l-lg px-2.5 py-2 text-fleet-ink-muted transition-colors hover:bg-surface-container hover:text-fleet-ink"
                  aria-label="Previous period"
                >
                  <Icon name="chevron_left" size={18} />
                </button>
                <button
                  type="button"
                  onClick={openViewDatePicker}
                  className="flex min-w-0 flex-1 items-center justify-center gap-1.5 border-x border-outline-variant px-2 py-2 text-sm font-semibold text-fleet-ink transition-colors hover:bg-surface-container sm:min-w-[11.5rem] sm:flex-none sm:px-3 lg:min-w-[13rem]"
                  aria-label={
                    viewMode === 'monthly' ? 'Pick month' : 'Pick date'
                  }
                  title={viewMode === 'monthly' ? 'Pick month' : 'Pick date'}
                >
                  <Icon name="calendar_month" size={16} className="shrink-0 text-depot-blue-light" />
                  <span className="truncate">{dateLabel}</span>
                </button>
                <input
                  ref={viewDatePickerRef}
                  type={viewMode === 'monthly' ? 'month' : 'date'}
                  value={
                    viewMode === 'monthly'
                      ? focusDate.slice(0, 7)
                      : focusDate
                  }
                  onChange={handleViewDatePick}
                  className="pointer-events-none absolute h-0 w-0 opacity-0"
                  tabIndex={-1}
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => shiftDate(1)}
                  className="rounded-r-lg px-2.5 py-2 text-fleet-ink-muted transition-colors hover:bg-surface-container hover:text-fleet-ink"
                  aria-label="Next period"
                >
                  <Icon name="chevron_right" size={18} />
                </button>
              </div>
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white/20 p-2 backdrop-blur-sm sm:p-4"
          >
            {loading || (refreshing && displaySchedules.length === 0) ? (
              <div className="flex min-h-[320px] items-center justify-center text-on-surface-variant">
                Loading timetable...
              </div>
            ) : activeRoutes.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-on-surface-variant">
                <Icon name="event_busy" size={40} className="text-outline" />
                <p className="text-sm font-medium text-neutral-800">No active routes</p>
                <p className="max-w-sm text-xs">
                  Timetables are organised by route. Add or activate routes in Route Management first.
                </p>
              </div>
            ) : visibleRoutes.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-on-surface-variant">
                <Icon name="search" size={40} className="text-outline" />
                <p className="text-sm font-medium text-neutral-800">No matching trips</p>
                <p className="max-w-sm text-xs">
                  Try a different search term or clear the search and filters.
                </p>
              </div>
            ) : viewMode === 'weekly' ? (
              <ScheduleWeekTimetable
                schedules={displaySchedules}
                routes={visibleRoutes}
                focusDate={focusDate}
                selectedId={selected?._id}
                onSelectTrip={selectTrip}
              />
            ) : viewMode === 'monthly' ? (
              <ScheduleMonthOverview
                schedules={displaySchedules}
                routes={visibleRoutes}
                focusDate={focusDate}
                selectedId={selected?._id}
                onSelectTrip={selectTrip}
                onPickDay={handlePickDay}
              />
            ) : (
              <ScheduleGantt
                rows={ganttRows}
                selectedId={selected?._id}
                conflictPairs={conflicts}
                onSelectTrip={selectTrip}
              />
            )}
          </div>
        </div>
      </div>

      <ScheduleDriverIssuesDrawer
        open={showIssuesDrawer}
        onClose={() => setShowIssuesDrawer(false)}
        issues={allDriverIssues}
        loading={loadingDriverIssues}
        refreshing={refreshingDriverIssues}
        onRefresh={() => loadDriverIssues({ silent: true })}
        onSelectIssue={(trip) => {
          setShowIssuesDrawer(false)
          setFocusDate(coerceFocusDate(tripDateKey(trip)))
          selectTrip(trip)
        }}
      />

      <ScheduleTripDetailsDrawer
        open={showTripDetailsDrawer}
        onClose={() => {
          setShowTripDetailsDrawer(false)
        }}
        selected={selected}
        canAdjustSchedules={canAdjustSchedules}
        canApproveSchedules={canApproveSchedules}
        onAdjust={openAdjustDrawer}
        onApprove={handleApproveTrip}
        onReject={openRejectModal}
        saving={saving}
      />

      <ScheduleAdjustDrawer
        open={showAdjustDrawer}
        onClose={() => {
          setShowAdjustDrawer(false)
          setAdjustAwaitingTrip(false)
          setShowConflictPanel(false)
          maintenanceOfflineTripRef.current = null
          setMaintenanceConfirm(false)
        }}
        selected={selected}
        onEmergencyToggle={handleEmergencyToggle}
        adjustForm={adjustForm}
        onAdjustChange={handleAdjustChange}
        drivers={drivers}
        buses={buses}
        allBuses={buses}
        conflicts={conflicts}
        showConflictPanel={showConflictPanel}
        onToggleConflictPanel={() => setShowConflictPanel((v) => !v)}
        saving={saving}
        error={error}
        onApply={handleApply}
        onCancelTrip={handleCancelTrip}
        onSubmitDraft={handleSubmitDraft}
        canSubmitDraft={canPlanSchedules}
        canApproveSchedules={canApproveSchedules}
        onApprove={handleApproveTrip}
        onReject={openRejectModal}
        adjustConflict={adjustConflict}
        onPickMaintenanceBus={handlePickMaintenanceBus}
        onMaintenanceOffline={() => {
          maintenanceOfflineTripRef.current = selected
          setMaintenanceConfirm(true)
        }}
        onPickCoverDriver={handlePickCoverDriver}
      />

      <ConfirmDialog
        open={maintenanceConfirm}
        title="Maintenance offline"
        message="Log maintenance, mark the vehicle offline, and cancel this trip? Add details in the notes field first if needed."
        confirmLabel="Confirm offline"
        variant="danger"
        loading={saving}
        onConfirm={handleMaintenanceOffline}
        onCancel={() => {
          maintenanceOfflineTripRef.current = null
          setMaintenanceConfirm(false)
        }}
      />

      <ScheduleTimetableDrawer
        open={showTimetable}
        onClose={() => {
          setShowTimetable(false)
          setError('')
        }}
        period={timetablePeriod}
        onPeriodChange={handleTimetablePeriodChange}
        anchorDate={timetableAnchor}
        onAnchorDateChange={handleTimetableAnchorChange}
        rows={timetableRows}
        onRowChange={handleTimetableRowChange}
        onToggleAll={handleTimetableToggleAll}
        existingSchedules={timetableRangeSchedules}
        buses={buses}
        drivers={drivers}
        saving={saving}
        error={error}
        onSubmit={handleCreateTimetable}
        tripCount={timetableTripCount}
        conflictPreview={timetableConflicts}
        rowConflictHints={timetableRowConflicts}
        canCreateTimetable={timetableReady && !timetableConflicts?.hasConflict}
        onRefresh={handleTimetableRefresh}
        refreshing={timetableRefreshing}
        checkingConflicts={loadingTimetableRange}
      />

      {rejectTargetId && (
        <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                <Icon name="cancel" size={22} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900">Reject schedule</h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Return this trip to the scheduler as a draft. A reason is required.
                </p>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">Rejection reason</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="e.g. Incomplete bus or driver allocation"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={closeRejectModal}
                className="min-w-[7rem] rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !rejectReason.trim()}
                onClick={handleRejectConfirm}
                className="min-w-[7rem] rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? 'Please wait…' : 'Reject trip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SchedulesPage
