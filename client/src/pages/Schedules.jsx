// Assigned to: Baanu
// Module: Schedule Management

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import ScheduleGantt from '../components/schedules/ScheduleGantt'
import ScheduleWeekTimetable from '../components/schedules/ScheduleWeekTimetable'
import ScheduleMonthOverview from '../components/schedules/ScheduleMonthOverview'
import ScheduleAdjustDrawer from '../components/schedules/ScheduleAdjustDrawer'
import ScheduleAddDrawer from '../components/schedules/ScheduleAddDrawer'
import ScheduleApprovalBar from '../components/schedules/ScheduleApprovalBar'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import {
  detectPeriodConflicts,
  formatPeriodLabel,
  formatTripDate,
  getViewDateRange,
  getWeekDayDates,
  reasonToStatus,
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

const emptyAddForm = {
  routeId: '',
  busId: '',
  driverId: '',
  tripDate: toDateInputValue(new Date()),
  departureTime: '08:00',
  arrivalTime: '12:00',
}

function SchedulesPage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState([])
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const { scheduleSearch } = useLayout()
  const [viewDate, setViewDate] = useState(() => toDateInputValue(new Date()))
  const [routeFilter, setRouteFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [showAdjustDrawer, setShowAdjustDrawer] = useState(false)
  const [viewMode, setViewMode] = useState('daily')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [repeatWeek, setRepeatWeek] = useState(false)
  const [addConflict, setAddConflict] = useState(null)
  const [showConflictPanel, setShowConflictPanel] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [addForm, setAddForm] = useState(emptyAddForm)
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

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    const { from, to } = getViewDateRange(viewMode, viewDate)
    try {
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
      setSchedules(Array.isArray(schedRes.data) ? schedRes.data : [])
      setRoutes(Array.isArray(routeRes.data) ? routeRes.data : [])
      setBuses(Array.isArray(busRes.data) ? busRes.data : [])
      setDrivers(Array.isArray(driverRes.data) ? driverRes.data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedules')
    } finally {
      setLoading(false)
    }
  }, [viewDate, viewMode])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  const conflicts = useMemo(
    () => detectPeriodConflicts(filteredSchedules),
    [filteredSchedules]
  )

  const scheduleStats = useMemo(() => {
    const active = filteredSchedules.filter((s) => s.status !== 'cancelled').length
    const delayed = filteredSchedules.filter((s) => s.status === 'delayed').length
    return { trips: filteredSchedules.length, active, delayed, conflicts: conflicts.length }
  }, [filteredSchedules, conflicts])

  const eventLog = useMemo(() => {
    const entries = []
    if (emergencyMode) {
      entries.push({
        type: 'error',
        title: 'Emergency mode active',
        body: 'Priority adjustments enabled for depot officers',
      })
    }
    conflicts.forEach((c) => {
      entries.push({
        type: 'error',
        title: `${c.type === 'bus' ? 'Vehicle' : 'Driver'} conflict`,
        body: c.message,
      })
    })
    filteredSchedules
      .filter((s) => s.status === 'delayed')
      .forEach((s) => {
        entries.push({
          type: 'warning',
          title: `${scheduleCode(s)} delay`,
          body: `${s.routeId?.routeName || 'Route'} — ${s.departureTime}–${s.arrivalTime}`,
        })
      })
    buses
      .filter((b) => b.status === 'maintenance')
      .forEach((b) => {
        entries.push({
          type: 'error',
          title: 'Maintenance alert',
          body: `${b.regNumber} is offline for service`,
        })
      })
    return entries
  }, [conflicts, filteredSchedules, buses, emergencyMode])

  const ganttRows = useMemo(() => {
    const dayTrips = filteredSchedules.filter((s) => tripDateKey(s) === viewDate)
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
  }, [filteredSchedules, viewDate])

  const selectedRoute = useMemo(
    () => routes.find((r) => r._id === addForm.routeId),
    [routes, addForm.routeId]
  )

  useEffect(() => {
    if (!showAdd || !addForm.busId || !addForm.driverId || !addForm.tripDate) {
      setAddConflict(null)
      return
    }
    const timeErr = validateTimeRange(addForm.departureTime, addForm.arrivalTime)
    if (timeErr) {
      setAddConflict({ hasConflict: true, conflicts: [{ message: timeErr }] })
      return
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/schedules/conflicts/check', {
          params: {
            tripDate: addForm.tripDate,
            routeId: addForm.routeId,
            busId: addForm.busId,
            driverId: addForm.driverId,
            departureTime: addForm.departureTime,
            arrivalTime: addForm.arrivalTime,
          },
        })
        setAddConflict(data)
      } catch {
        setAddConflict(null)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [
    showAdd,
    addForm.routeId,
    addForm.busId,
    addForm.driverId,
    addForm.tripDate,
    addForm.departureTime,
    addForm.arrivalTime,
  ])

  const [adjustConflict, setAdjustConflict] = useState(null)

  useEffect(() => {
    if (!selected || !adjustForm.busId || !adjustForm.driverId) {
      setAdjustConflict(null)
      return
    }
    const timeErr = validateTimeRange(adjustForm.departureTime, adjustForm.arrivalTime)
    if (timeErr) {
      setAdjustConflict({ hasConflict: true, conflicts: [{ message: timeErr }] })
      return
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
      notes: '',
    })
    setShowAdjustDrawer(true)
  }

  const handleAddChange = (e) => {
    setAddForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
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

  const handleMaintenanceSwap = () => {
    if (!selected) return
    const currentBusId = String(selected.busId?._id || selected.busId)
    const alternate = buses.find(
      (b) => b.status === 'available' && String(b._id) !== currentBusId
    )
    if (!alternate) {
      setError('No alternate available bus for swap')
      return
    }
    setAdjustForm((prev) => ({
      ...prev,
      busId: alternate._id,
      reason: 'maintenance',
      status: 'delayed',
    }))
    setError('')
    showToast(`Suggested swap: ${alternate.regNumber}`)
  }

  const handleMaintenanceOffline = async () => {
    if (!selected) return
    const busId = selected.busId?._id || selected.busId
    if (!busId || !window.confirm('Take vehicle offline for maintenance and cancel this trip?')) {
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.put(`/buses/${busId}`, { status: 'maintenance' })
      await api.put(`/schedules/${selected._id}`, {
        status: 'cancelled',
        adjustmentReason: 'maintenance',
        routeId: selected.routeId?._id || selected.routeId,
        busId,
        driverId: selected.driverId?._id || selected.driverId,
        departureTime: selected.departureTime,
        arrivalTime: selected.arrivalTime,
        tripDate: selected.tripDate,
      })
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
      showToast('Vehicle set to maintenance; trip cancelled')
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Maintenance offline action failed')
    } finally {
      setSaving(false)
    }
  }

  const createOneSchedule = async (tripDate, payload) => {
    await api.post('/schedules', { ...payload, tripDate })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const timeErr = validateTimeRange(addForm.departureTime, addForm.arrivalTime)
    if (timeErr) {
      setError(timeErr)
      return
    }
    if (addConflict?.hasConflict) {
      setError('Resolve scheduling conflicts before creating this trip')
      return
    }

    setSaving(true)
    setError('')
    const dates = repeatWeek ? getWeekDayDates(addForm.tripDate) : [addForm.tripDate]
    const payload = {
      routeId: addForm.routeId,
      busId: addForm.busId,
      driverId: addForm.driverId,
      departureTime: addForm.departureTime,
      arrivalTime: addForm.arrivalTime,
      status: 'draft',
      adjustmentReason: emergencyMode ? 'emergency' : 'normal',
    }

    let created = 0
    const skipped = []

    try {
      for (const day of dates) {
        try {
          await createOneSchedule(day, payload)
          created += 1
        } catch (err) {
          const msg = err.response?.data?.message || 'Conflict'
          const detail = err.response?.data?.conflicts?.map((c) => c.message).join('; ')
          skipped.push(`${day}: ${detail || msg}`)
        }
      }

      setShowAdd(false)
      setAddForm({ ...emptyAddForm, tripDate: viewDate })
      setRepeatWeek(false)
      setAddConflict(null)

      if (created > 0) {
        showToast(
          repeatWeek
            ? `Weekly timetable: ${created} trip(s) created${skipped.length ? `, ${skipped.length} skipped` : ''}`
            : 'Schedule created'
        )
        loadData()
      }
      if (skipped.length) {
        setError(`Some days could not be scheduled: ${skipped.join(' | ')}`)
      }
      if (created === 0) {
        setError(skipped[0] || 'Failed to create schedule')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create schedule'
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

  const pendingSchedules = useMemo(
    () => schedules.filter((s) => s.status === 'pending'),
    [schedules]
  )

  const handleSubmitDraft = async () => {
    if (!selected || selected.status !== 'draft') return
    setSaving(true)
    try {
      await api.post(`/schedules/${selected._id}/submit`)
      showToast('Submitted for approval')
      loadData()
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
      showToast('Schedule approved')
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Approve failed')
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
      showToast('Returned to scheduler')
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Reject failed')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelTrip = async () => {
    if (!selected) return
    const reason = window.prompt('Cancellation reason (required):', 'operational')
    if (!reason?.trim()) return
    setSaving(true)
    setError('')
    try {
      await api.put(`/schedules/${selected._id}`, {
        status: 'cancelled',
        adjustmentReason: 'obstruction',
        tripDate: selected.tripDate,
        routeId: selected.routeId?._id || selected.routeId,
        busId: selected.busId?._id || selected.busId,
        driverId: selected.driverId?._id || selected.driverId,
        departureTime: selected.departureTime,
        arrivalTime: selected.arrivalTime,
      })
      showToast('Trip cancelled')
      setSelected(null)
      loadData()
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
        status: adjustForm.status,
        adjustmentReason: adjustForm.reason,
        tripDate: selected.tripDate,
        routeId: selected.routeId?._id || selected.routeId,
      })
      setSelected(data)
      selectTrip(data)
      showToast('Schedule updated')
      loadData()
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

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      <ModuleHeader
        title="Schedule Management"
        subtitle="Daily, weekly, and monthly timetables with conflict detection and emergency adjustments."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ModulePrimaryButton icon="add" onClick={() => setShowAdd(true)}>
              Add Schedule
            </ModulePrimaryButton>
            <ModuleSecondaryButton
              icon="tune"
              onClick={() => setShowAdjustDrawer(true)}
            >
              Adjust
            </ModuleSecondaryButton>
          </div>
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
        canApprove={
          user?.role === ROLES.DEPOT_MANAGER || user?.role === ROLES.ADMINISTRATOR
        }
        canSubmit={user?.role === ROLES.TRANSPORT_SCHEDULER || user?.role === ROLES.ADMINISTRATOR}
      />

      {error && !showAdd && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Workspace card */}
      <div className="pro-card flex min-h-[560px] flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
            <div className="pro-segmented">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode)
                    setSelected(null)
                  }}
                  className={`rounded-md px-4 py-2 text-sm capitalize transition-colors ${
                    viewMode === mode
                      ? 'pro-segmented-active'
                      : 'text-fleet-ink-muted hover:text-fleet-ink'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Filter
              </span>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className={`${inputClass} w-auto min-w-[120px] py-1.5`}
              >
                <option value="">All routes</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.routeName}
                  </option>
                ))}
              </select>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className={`${inputClass} w-auto min-w-[120px] py-1.5`}
              >
                <option value="">All drivers</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="mx-1 hidden h-6 w-px bg-outline-variant sm:block" />
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="rounded-lg border border-outline-variant p-1.5 hover:bg-surface-container"
                aria-label="Previous period"
              >
                <Icon name="chevron_left" size={18} />
              </button>
              <span className="min-w-[120px] text-center text-sm font-semibold text-neutral-900">
                {dateLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="rounded-lg border border-outline-variant p-1.5 hover:bg-surface-container"
                aria-label="Next period"
              >
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-white/20 p-4 backdrop-blur-sm">
            {loading ? (
              <div className="flex min-h-[320px] items-center justify-center text-on-surface-variant">
                Loading timetable...
              </div>
            ) : viewMode === 'weekly' ? (
              <ScheduleWeekTimetable
                schedules={filteredSchedules}
                routes={routes}
                anchorDate={viewDate}
                selectedId={selected?._id}
                onSelectTrip={selectTrip}
              />
            ) : viewMode === 'monthly' ? (
              <ScheduleMonthOverview
                schedules={filteredSchedules}
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
        }}
        selected={selected}
        emergencyMode={emergencyMode}
        onEmergencyToggle={handleEmergencyToggle}
        adjustForm={adjustForm}
        onAdjustChange={handleAdjustChange}
        drivers={drivers.filter((d) => d.status === 'available' || !d.status)}
        buses={buses}
        conflicts={conflicts}
        eventLog={eventLog}
        showConflictPanel={showConflictPanel}
        onToggleConflictPanel={() => setShowConflictPanel((v) => !v)}
        saving={saving}
        error={error}
        onApply={handleApply}
        onCancelTrip={handleCancelTrip}
        onSubmitDraft={handleSubmitDraft}
        canSubmitDraft={
          user?.role === ROLES.TRANSPORT_SCHEDULER || user?.role === ROLES.ADMINISTRATOR
        }
        adjustConflict={adjustConflict}
        onMaintenanceSwap={handleMaintenanceSwap}
        onMaintenanceOffline={handleMaintenanceOffline}
      />

      <ScheduleAddDrawer
        open={showAdd}
        onClose={() => {
          setShowAdd(false)
          setError('')
          setAddConflict(null)
        }}
        form={{ ...addForm, tripDate: addForm.tripDate || viewDate }}
        onChange={handleAddChange}
        routes={routes}
        buses={buses.filter(
          (b) =>
            (b.status === 'available' || b.status === 'in-service') &&
            (!selectedRoute?.serviceType ||
              !b.serviceType ||
              b.serviceType === selectedRoute.serviceType)
        )}
        drivers={drivers.filter((d) => d.status === 'available' || !d.status)}
        saving={saving}
        error={error}
        onSubmit={handleCreate}
        repeatWeek={repeatWeek}
        onRepeatWeekChange={setRepeatWeek}
        conflictPreview={addConflict}
        selectedRoute={selectedRoute}
      />
    </div>
  )
}

export default SchedulesPage
