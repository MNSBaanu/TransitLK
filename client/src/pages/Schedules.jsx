// Assigned to: Baanu
// Module: Schedule Management

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getCachedPageData, getStalePageData, invalidatePageData, loadPageData } from '../services/pagePrefetch'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import Icon from '../components/Icon'
import ScheduleGantt from '../components/schedules/ScheduleGantt'
import ScheduleWeekTimetable from '../components/schedules/ScheduleWeekTimetable'
import ScheduleMonthOverview from '../components/schedules/ScheduleMonthOverview'
import ScheduleAdjustDrawer from '../components/schedules/ScheduleAdjustDrawer'
import ScheduleTripDetailsDrawer from '../components/schedules/ScheduleTripDetailsDrawer'
import ScheduleTimetableDrawer from '../components/schedules/ScheduleTimetableDrawer'
import ConfirmDialog from '../components/ConfirmDialog'
import { defaultMinCapacityForService, isBusAssignable } from '../utils/fleetHelpers'
import { isSchedulableRoute } from '../utils/routeHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import {
  detectPeriodConflicts,
  detectTimetableConflicts,
  formatPeriodLabel,
  formatTripDate,
  buildTimetableRows,
  duplicateTimetableRow,
  getTimetableDates,
  groupTimetableConflictsByRoute,
  reasonToStatus,
  requiresAdjustmentNotes,
  validateTimetableRows,
  isTimetableReady,
  scheduleCode,
  toDateInputValue,
  tripDateKey,
  validateTimeRange,
} from '../utils/scheduleHelpers'
import {
  ModuleHeader,
  ModulePrimaryButton,
  ModuleSecondaryButton,
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
    if (parsed?.viewMode && parsed?.viewDate) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function SchedulesPage() {
  const persistedView = readPersistedScheduleView()
  const initialViewDate = persistedView?.viewDate || toDateInputValue(new Date())
  const initialViewMode = persistedView?.viewMode || 'daily'
  const initialData =
    getCachedPageData('/schedules', {
      viewMode: initialViewMode,
      viewDate: initialViewDate,
    }) ||
    getStalePageData('/schedules', {
      viewMode: initialViewMode,
      viewDate: initialViewDate,
    })
  const { user } = useAuth()
  const [schedules, setSchedules] = useState(() => initialData?.schedules || [])
  const [routes, setRoutes] = useState(() => initialData?.routes || [])
  const [buses, setBuses] = useState(() => initialData?.buses || [])
  const [drivers, setDrivers] = useState(() => initialData?.drivers || [])
  const [loading, setLoading] = useState(!initialData)
  const { scheduleSearch } = useLayout()
  const [viewDate, setViewDate] = useState(initialViewDate)
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
    departureTime: '08:00',
    arrivalTime: '12:00',
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
  const maintenanceOfflineTripRef = useRef(null)
  const navigate = useNavigate()

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const invalidateRelatedPages = useCallback(() => {
    invalidatePageData('/schedules')
    invalidatePageData('/reports')
    invalidatePageData('/buses')
  }, [])

  const loadData = useCallback(async ({ force = false, keepContent = false, viewMode: viewModeOverride, viewDate: viewDateOverride } = {}) => {
    const activeViewMode = viewModeOverride ?? viewMode
    const activeViewDate = viewDateOverride ?? viewDate

    if (!force) {
      const cached = getCachedPageData('/schedules', { viewMode: activeViewMode, viewDate: activeViewDate })
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

    if (!keepContent) setLoading(true)
    setError('')
    try {
      const data = await loadPageData('/schedules', { viewMode: activeViewMode, viewDate: activeViewDate }, { force })
      if (!data) {
        setError('Failed to load schedules')
        return
      }
      setSchedules(data.schedules)
      setRoutes(data.routes)
      setBuses(data.buses)
      setDrivers(data.drivers)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [viewDate, viewMode])

  const activeRoutes = useMemo(
    () => routes.filter(isSchedulableRoute),
    [routes]
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(SCHEDULES_VIEW_KEY, JSON.stringify({ viewMode, viewDate }))
    } catch {
      /* ignore */
    }
  }, [viewMode, viewDate])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) loadData({ force: true, keepContent: true })
    })
    return () => {
      cancelled = true
    }
  }, [loadData])

  useAutoRefresh(
    () => loadData({ force: true, keepContent: true }),
    { enabled: !showTimetable && !showAdjustDrawer && !showTripDetailsDrawer && !saving && !maintenanceConfirm }
  )

  const handleTimetableRefresh = useCallback(async () => {
    setTimetableRefreshing(true)
    setError('')
    try {
      const data = await loadPageData('/schedules', { viewMode, viewDate }, { force: true })
      setSchedules(data.schedules)
      setRoutes(data.routes)
      setBuses(data.buses)
      setDrivers(data.drivers)
      setTimetableRows(buildTimetableRows(data.routes, data.schedules, timetableAnchor))

      const dates = getTimetableDates(timetablePeriod, timetableAnchor)
      if (dates.length) {
        const { data: rangeSchedules } = await api.get('/schedules', {
          params: { fromDate: dates[0], toDate: dates[dates.length - 1] },
        })
        setTimetableRangeSchedules(Array.isArray(rangeSchedules) ? rangeSchedules : [])
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to refresh timetable data')
    } finally {
      setTimetableRefreshing(false)
    }
  }, [timetableAnchor, timetablePeriod, viewDate, viewMode])

  const filteredSchedules = useMemo(() => {
    const q = scheduleSearch.trim().toLowerCase()
    return schedules.filter((s) => {
      if (viewMode === 'daily' && tripDateKey(s) !== viewDate) return false
      if (routeFilter && String(s.routeId?._id || s.routeId) !== routeFilter) return false
      if (driverFilter && String(s.driverId?._id || s.driverId) !== driverFilter) return false
      if (!q) return true
      const hay = [
        s.routeId?.routeName,
        s.busId?.regNumber,
        s.driverId?.name,
        s.departureTime,
        s.arrivalTime,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [schedules, scheduleSearch, routeFilter, driverFilter, viewMode, viewDate])

  const displaySchedules = useMemo(
    () => filteredSchedules.filter((s) => s.status !== 'cancelled'),
    [filteredSchedules]
  )

  const conflicts = useMemo(
    () => detectPeriodConflicts(displaySchedules),
    [displaySchedules]
  )

  const scheduleStats = useMemo(() => {
    const active = displaySchedules.filter((s) => s.status !== 'cancelled').length
    const delayed = displaySchedules.filter((s) => s.status === 'delayed').length
    return { trips: displaySchedules.length, active, delayed, conflicts: conflicts.length }
  }, [displaySchedules, conflicts])

  const adjustBuses = useMemo(() => {
    const serviceType = selected?.routeId?.serviceType
    const minCap = defaultMinCapacityForService(serviceType)
    const currentBusId = String(adjustForm.busId || selected?.busId?._id || selected?.busId || '')
    return buses.filter((b) => {
      const id = String(b._id)
      if (id === currentBusId) return true
      return (
        (b.status === 'available' || b.status === 'in-service') &&
        isBusAssignable(b, serviceType, minCap)
      )
    })
  }, [buses, selected, adjustForm.busId])

  const ganttRows = useMemo(() => {
    const dayTrips = displaySchedules.filter((s) => tripDateKey(s) === viewDate)
    const byBus = new Map()
    for (const trip of dayTrips) {
      const busId = String(trip.busId?._id || trip.busId || 'unknown')
      if (!byBus.has(busId)) {
        byBus.set(busId, {
          busId,
          regNumber: trip.busId?.regNumber || 'Unknown bus',
          driverName: trip.driverId?.name,
          trips: [],
        })
      }
      byBus.get(busId).trips.push(trip)
    }
    return [...byBus.values()].sort((a, b) => a.regNumber.localeCompare(b.regNumber))
  }, [displaySchedules, viewDate])

  const timetableTripCount = useMemo(() => {
    const included = timetableRows.filter((r) => r.included).length
    return included * getTimetableDates(timetablePeriod, timetableAnchor).length
  }, [timetableRows, timetablePeriod, timetableAnchor])

  const timetableReady = useMemo(() => isTimetableReady(timetableRows), [timetableRows])

  useEffect(() => {
    if (!showTimetable) {
      setTimetableRangeSchedules([])
      return undefined
    }

    const dates = getTimetableDates(timetablePeriod, timetableAnchor)
    if (!dates.length) return undefined

    let cancelled = false
    setLoadingTimetableRange(true)
    api
      .get('/schedules', {
        params: { fromDate: dates[0], toDate: dates[dates.length - 1] },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setTimetableRangeSchedules(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {
        if (!cancelled) setTimetableRangeSchedules([])
      })
      .finally(() => {
        if (!cancelled) setLoadingTimetableRange(false)
      })

    return () => {
      cancelled = true
    }
  }, [showTimetable, timetablePeriod, timetableAnchor])

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
    const d = new Date(viewDate)
    if (viewMode === 'weekly') d.setDate(d.getDate() + delta * 7)
    else if (viewMode === 'monthly') d.setMonth(d.getMonth() + delta)
    else d.setDate(d.getDate() + delta)
    setViewDate(toDateInputValue(d))
    setSelected(null)
  }

  const syncTripForm = (trip) => ({
    departureTime: trip.departureTime,
    arrivalTime: trip.arrivalTime,
    busId: trip.busId?._id || trip.busId || '',
    driverId: trip.driverId?._id || trip.driverId || '',
    status: trip.status || 'scheduled',
    reason: trip.adjustmentReason || 'normal',
    notes: trip.adjustmentNotes || '',
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
    if (viewMode !== 'daily') setViewDate(tripDateKey(trip))
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

  const openTimetableDrawer = () => {
    setTimetablePeriod(viewMode)
    setTimetableAnchor(viewDate)
    setTimetableRows(buildTimetableRows(routes, schedules, viewDate))
    setError('')
    setShowTimetable(true)
  }

  const handleTimetableRowChange = (tripRowId, field, value) => {
    setTimetableRows((rows) =>
      rows.map((r) => (String(r.tripRowId) === String(tripRowId) ? { ...r, [field]: value } : r))
    )
  }

  const handleAddTimetableTrip = (routeId) => {
    const route = routes.find((r) => String(r._id) === String(routeId))
    if (!route) return
    setTimetableRows((rows) => {
      const newRow = duplicateTimetableRow(route, rows)
      const lastIndex = rows.findLastIndex((r) => String(r.routeId) === String(routeId))
      if (lastIndex < 0) return [...rows, newRow]
      const next = [...rows]
      next.splice(lastIndex + 1, 0, newRow)
      return next
    })
  }

  const handleTimetableToggleAll = (checked) => {
    setTimetableRows((rows) => rows.map((r) => ({ ...r, included: checked })))
  }

  const handleTimetablePeriodChange = (period) => {
    setTimetablePeriod(period)
    setTimetableRows(buildTimetableRows(routes, schedules, timetableAnchor))
  }

  const handleTimetableAnchorChange = (date) => {
    setTimetableAnchor(date)
    setTimetableRows(buildTimetableRows(routes, schedules, date))
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
      departureTime: '08:00',
      arrivalTime: '12:00',
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

  const createOneSchedule = async (tripDate, payload) => {
    await api.post('/schedules', { ...payload, tripDate })
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
        }
        for (const day of dates) {
          try {
            await createOneSchedule(day, payload)
            created += 1
          } catch (err) {
            const msg = err.response?.data?.message || 'Conflict'
            const detail = err.response?.data?.conflicts?.map((c) => c.message).join('; ')
            skipped.push(`${row.routeName} ${day}: ${detail || msg}`)
          }
        }
      }

      if (created > 0) {
        closeScheduleModals()
        setViewMode(timetablePeriod)
        setViewDate(timetableAnchor)
        invalidateRelatedPages()
        showToast(
          `${created} trip(s) sent for depot manager approval${
            skipped.length ? ` (${skipped.length} skipped)` : ''
          }`
        )
        await loadData({
          force: true,
          keepContent: true,
          viewMode: timetablePeriod,
          viewDate: timetableAnchor,
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

  const pendingSchedules = useMemo(
    () => schedules.filter((s) => s.status === 'pending'),
    [schedules]
  )

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
    setViewDate(dayKey)
    setViewMode('daily')
    setSelected(null)
  }

  const dateLabel =
    viewMode === 'daily'
      ? formatTripDate(viewDate)
      : formatPeriodLabel(viewMode, viewDate)

  const isScheduler = user?.role === ROLES.TRANSPORT_SCHEDULER
  const isAdministrator = user?.role === ROLES.ADMINISTRATOR
  const isDepotManager = user?.role === ROLES.DEPOT_MANAGER
  const canPlanSchedules = isScheduler || isAdministrator
  const canAdjustSchedules = canPlanSchedules || isDepotManager

  const scheduleHeaderTitle = isDepotManager
    ? 'Schedule Approval & Operations'
    : 'Schedule Management'

  const scheduleHeaderSubtitle = isDepotManager
    ? 'Review pending timetables from schedulers, approve trips for drivers, return incomplete plans, and adjust live trips when depot operations change.'
    : 'Daily, weekly, and monthly timetables with automatic overlap detection—conflicts are blocked before save and approval.'

  const scheduleStatItems = isDepotManager
    ? [
        {
          label: 'Awaiting approval',
          value: pendingSchedules.length,
          hint: pendingSchedules.length ? 'Open pending approvals' : 'No pending trips',
          icon: 'pending_actions',
        },
        {
          label: viewMode === 'daily' ? 'Trips today' : 'Trips in view',
          value: scheduleStats.trips,
          icon: 'event',
        },
        { label: 'Active trips', value: scheduleStats.active, icon: 'schedule' },
        {
          label: 'Conflicts',
          value: scheduleStats.conflicts,
          hint: scheduleStats.conflicts ? 'Resolve in adjust panel' : 'No overlaps',
          icon: 'warning',
        },
      ]
    : [
        {
          label: viewMode === 'daily' ? 'Trips today' : 'Trips in view',
          value: scheduleStats.trips,
          icon: 'event',
        },
        { label: 'Active trips', value: scheduleStats.active, icon: 'schedule' },
        {
          label: 'Conflicts',
          value: scheduleStats.conflicts,
          hint: scheduleStats.conflicts ? 'Resolve in panel' : 'No overlaps',
          icon: 'warning',
        },
        { label: 'Delayed', value: scheduleStats.delayed, icon: 'schedule_send' },
      ]

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title={scheduleHeaderTitle}
        subtitle={scheduleHeaderSubtitle}
        action={
          canPlanSchedules || canAdjustSchedules ? (
            <div className="flex flex-wrap items-center gap-2">
              {canPlanSchedules && (
                <ModulePrimaryButton icon="add" onClick={openTimetableDrawer}>
                  Create Timetable
                </ModulePrimaryButton>
              )}
              {canAdjustSchedules && (
                <ModuleSecondaryButton icon="tune" onClick={openAdjustDrawer}>
                  {isDepotManager ? 'Adjust trip' : 'Adjust'}
                </ModuleSecondaryButton>
              )}
              {isDepotManager && (
                <ModuleSecondaryButton
                  icon="pending_actions"
                  onClick={() => navigate('/schedules/approvals')}
                >
                  Pending approvals
                  {pendingSchedules.length > 0 ? ` (${pendingSchedules.length})` : ''}
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
            setShowConflictPanel(true)
            setShowAdjustDrawer(true)
          }}
          className="flex items-center gap-2 text-left text-sm font-semibold text-fleet-ink hover:opacity-80"
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
          {conflicts.length > 0 && (
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
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface-container/50 px-5 py-4">
            <div className="pro-segmented shrink-0 bg-white/50">
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
            <div className="flex flex-wrap items-end justify-end gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Route filter
                </span>
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  aria-label="Route filter"
                  className={`${inputClass} w-full min-w-[9.5rem] py-2`}
                >
                  <option value="">All routes</option>
                  {activeRoutes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Driver filter
                </span>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  aria-label="Driver filter"
                  className={`${inputClass} w-full min-w-[9.5rem] py-2`}
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
                className="flex items-center rounded-lg border border-outline-variant bg-white"
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
                <span className="min-w-[11.5rem] border-x border-outline-variant px-3 py-2 text-center text-sm font-semibold text-fleet-ink sm:min-w-[13rem]">
                  {dateLabel}
                </span>
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

          <div className="min-h-0 flex-1 overflow-auto bg-white/20 p-4 backdrop-blur-sm">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center text-on-surface-variant">
                Loading timetable...
              </div>
            ) : displaySchedules.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-on-surface-variant">
                <Icon name="event_busy" size={40} className="text-outline" />
                <p className="text-sm font-medium text-neutral-800">No trips in this period</p>
                <p className="max-w-sm text-xs">
                  {canPlanSchedules
                    ? 'Create a timetable to add trips, or change the date range to view existing schedules.'
                    : 'Change the date range or wait for schedulers to submit trips for approval.'}
                </p>
              </div>
            ) : viewMode === 'weekly' ? (
              <ScheduleWeekTimetable
                schedules={displaySchedules}
                routes={routes}
                anchorDate={viewDate}
                selectedId={selected?._id}
                onSelectTrip={selectTrip}
              />
            ) : viewMode === 'monthly' ? (
              <ScheduleMonthOverview
                schedules={displaySchedules}
                anchorDate={viewDate}
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

      <ScheduleTripDetailsDrawer
        open={showTripDetailsDrawer}
        onClose={() => {
          setShowTripDetailsDrawer(false)
        }}
        selected={selected}
        canAdjustSchedules={canAdjustSchedules}
        onAdjust={openAdjustDrawer}
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
        buses={adjustBuses}
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
        onAddTrip={handleAddTimetableTrip}
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
        canCreateTimetable={
          timetableReady &&
          !loadingTimetableRange &&
          !timetableConflicts?.hasConflict
        }
        onRefresh={handleTimetableRefresh}
        refreshing={timetableRefreshing}
        checkingConflicts={loadingTimetableRange}
      />
    </div>
  )
}

export default SchedulesPage
