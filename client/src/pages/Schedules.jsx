// Assigned to: Baanu
// Module: Schedule Management

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import { getCachedPageData, getStalePageData, invalidatePageData, loadPageData } from '../services/pagePrefetch'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import Icon from '../components/Icon'
import ScheduleGantt from '../components/schedules/ScheduleGantt'
import ScheduleWeekTimetable from '../components/schedules/ScheduleWeekTimetable'
import ScheduleMonthOverview from '../components/schedules/ScheduleMonthOverview'
import ScheduleAdjustDrawer from '../components/schedules/ScheduleAdjustDrawer'
import ScheduleTimetableDrawer from '../components/schedules/ScheduleTimetableDrawer'
import ScheduleApprovalBar from '../components/schedules/ScheduleApprovalBar'
import ConfirmDialog from '../components/ConfirmDialog'
import { defaultMinCapacityForService, isBusAssignable } from '../utils/fleetHelpers'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import {
  detectPeriodConflicts,
  detectTimetableConflicts,
  formatPeriodLabel,
  formatTripDate,
  buildTimetableRows,
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
  const [emergencyMode, setEmergencyMode] = useState(false)
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

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const invalidateRelatedPages = useCallback(() => {
    invalidatePageData('/schedules')
    invalidatePageData('/reports')
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
      if (!cancelled) loadData()
    })
    return () => {
      cancelled = true
    }
  }, [loadData])

  useAutoRefresh(
    () => loadData({ force: true, keepContent: true }),
    { enabled: !showTimetable && !showAdjustDrawer && !saving && !maintenanceConfirm }
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

  const selectTrip = (trip) => {
    setSelected(trip)
    setShowConflictPanel(false)
    if (viewMode !== 'daily') setViewDate(tripDateKey(trip))
    setAdjustForm({
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      busId: trip.busId?._id || trip.busId || '',
      driverId: trip.driverId?._id || trip.driverId || '',
      status: trip.status || 'scheduled',
      reason: trip.adjustmentReason || (emergencyMode ? 'emergency' : 'normal'),
      notes: trip.adjustmentNotes || '',
    })
    setShowAdjustDrawer(true)
  }

  const openTimetableDrawer = () => {
    setTimetablePeriod(viewMode)
    setTimetableAnchor(viewDate)
    setTimetableRows(buildTimetableRows(routes, schedules, viewDate))
    setError('')
    setShowTimetable(true)
  }

  const handleTimetableRowChange = (routeId, field, value) => {
    setTimetableRows((rows) =>
      rows.map((r) => (String(r.routeId) === String(routeId) ? { ...r, [field]: value } : r))
    )
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
    setEmergencyMode(on)
    setAdjustForm((prev) => ({
      ...prev,
      reason: on ? 'emergency' : 'normal',
      status: on ? 'delayed' : prev.status === 'delayed' ? 'scheduled' : prev.status,
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
    maintenanceOfflineTripRef.current = null
    setMaintenanceConfirm(false)
    setShowAdjustDrawer(false)
    setShowConflictPanel(false)
    setSelected(null)
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
          status: 'draft',
          adjustmentReason: emergencyMode ? 'emergency' : 'normal',
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
        setShowTimetable(false)
        setViewMode(timetablePeriod)
        setViewDate(timetableAnchor)
        invalidateRelatedPages()
        showToast(
          `${timetablePeriod.charAt(0).toUpperCase() + timetablePeriod.slice(1)} timetable: ${created} trip(s) created${
            skipped.length ? `, ${skipped.length} skipped` : ''
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
      loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Submit failed')
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (id) => {
    setSaving(true)
    try {
      await api.post(`/schedules/${id}/approve`)
      invalidateRelatedPages()
      showToast('Schedule approved — driver can view the trip in My trips')
      loadData({ force: true, keepContent: true })
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

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason:', 'Incomplete allocation')
    if (!reason?.trim()) return
    setSaving(true)
    try {
      await api.post(`/schedules/${id}/reject`, { reason })
      invalidateRelatedPages()
      showToast('Returned to scheduler')
      loadData({ force: true, keepContent: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed')
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
      setSelected(null)
      setShowAdjustDrawer(false)
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
      setSelected(data)
      selectTrip(data)
      invalidateRelatedPages()
      showToast('Schedule updated')
      loadData({ force: true, keepContent: true })
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
  const canApproveSchedules = isDepotManager
  const canAdjustSchedules = canPlanSchedules || isDepotManager

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="Schedule Management"
        subtitle="Daily, weekly, and monthly timetables with automatic overlap detection—conflicts are blocked before save and approval."
        action={
          canPlanSchedules || canAdjustSchedules ? (
            <div className="flex flex-wrap items-center gap-2">
              {canPlanSchedules && (
                <ModulePrimaryButton icon="add" onClick={openTimetableDrawer}>
                  Create Timetable
                </ModulePrimaryButton>
              )}
              {canAdjustSchedules && (
                <ModuleSecondaryButton
                  icon="tune"
                  onClick={() => {
                    if (selected) {
                      setShowAdjustDrawer(true)
                    } else {
                      showToast('Select a trip on the timetable to adjust it')
                    }
                  }}
                >
                  Adjust
                </ModuleSecondaryButton>
              )}
            </div>
          ) : null
        }
      />

      <ModuleStats
        items={[
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
        ]}
      />

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
          <button
            type="button"
            onClick={() => handleEmergencyToggle(!emergencyMode)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
              emergencyMode
                ? 'border-depot-blue-light bg-depot-blue-light/10 text-depot-blue-light'
                : 'border-outline-variant bg-surface-container text-neutral-800 hover:bg-white'
            }`}
          >
            <Icon name="bolt" size={18} />
            Emergency mode
          </button>
        </div>
      </div>

      <ScheduleApprovalBar
        pending={pendingSchedules}
        saving={saving}
        onApprove={handleApprove}
        onReject={handleReject}
        canApprove={canApproveSchedules}
      />

      {error && !showTimetable && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
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
                    setViewMode(mode)
                    setSelected(null)
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
                  {routes.map((r) => (
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

      <ScheduleAdjustDrawer
        open={showAdjustDrawer}
        onClose={() => {
          setShowAdjustDrawer(false)
          setShowConflictPanel(false)
          maintenanceOfflineTripRef.current = null
          setMaintenanceConfirm(false)
        }}
        selected={selected}
        emergencyMode={emergencyMode}
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
        onToggleAll={handleTimetableToggleAll}
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
