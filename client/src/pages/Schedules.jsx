// Assigned to: Baanu
// Module: Schedule Management

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import ScheduleGantt from '../components/schedules/ScheduleGantt'
import ScheduleWeekTimetable from '../components/schedules/ScheduleWeekTimetable'
import ScheduleMonthOverview from '../components/schedules/ScheduleMonthOverview'
import ScheduleQuickAdjust from '../components/schedules/ScheduleQuickAdjust'
import ScheduleAddDrawer from '../components/schedules/ScheduleAddDrawer'
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
import { ModuleToast } from '../components/layout/ModuleLayout'
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
  const [schedules, setSchedules] = useState([])
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const { scheduleSearch } = useLayout()
  const [viewDate, setViewDate] = useState(() => toDateInputValue(new Date()))
  const [routeFilter, setRouteFilter] = useState('')
  const [driverFilter, setDriverFilter] = useState('')
  const [showQuickPanel, setShowQuickPanel] = useState(true)
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
  }, [showAdd, addForm.busId, addForm.driverId, addForm.tripDate, addForm.departureTime, addForm.arrivalTime])

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
    setShowQuickPanel(true)
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
      status: emergencyMode ? 'delayed' : 'scheduled',
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

  const handleApply = async () => {
    if (!selected || !adjustForm) return
    const timeErr = validateTimeRange(adjustForm.departureTime, adjustForm.arrivalTime)
    if (timeErr) {
      setError(timeErr)
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
    <div className="-m-6 flex h-[calc(100vh-72px)] flex-col overflow-hidden bg-[#f0f1f3] max-xl:h-[calc(100vh-72px-44px)]">
      <ModuleToast message={toast} />

      {/* Conflict alert bar (mockup) */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-[#e8eaed] px-6 py-3">
        <button
          type="button"
          onClick={() => {
            setShowConflictPanel(true)
            setShowQuickPanel(true)
          }}
          className="flex items-center gap-2 text-left text-sm font-semibold text-neutral-800 hover:opacity-80"
        >
          <Icon
            name="warning"
            size={20}
            className={conflicts.length > 0 ? 'text-red-600' : 'text-on-surface-variant'}
          />
          {conflicts.length > 0
            ? `${conflicts.length} Active Scheduling Conflict${conflicts.length > 1 ? 's' : ''} Detected`
            : 'No active scheduling conflicts'}
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {conflicts.length > 0 && (
            <span className="text-xs font-bold uppercase tracking-wide text-red-700">
              Click to resolve
            </span>
          )}
          <button
            type="button"
            onClick={() => handleEmergencyToggle(!emergencyMode)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              emergencyMode
                ? 'border-amber-400 bg-amber-100 text-amber-900'
                : 'border-outline-variant bg-white text-neutral-800 hover:bg-[#f5f5f5]'
            }`}
          >
            <Icon name="bolt" size={18} />
            Emergency Adjustment Mode
          </button>
        </div>
      </div>

      {error && !showAdd && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main workspace: grid + Quick Adjust panel */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {/* Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 py-3">
            <div className="flex rounded-lg border border-outline-variant bg-[#f0f1f3] p-0.5">
              {['daily', 'weekly', 'monthly'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setViewMode(mode)
                    setSelected(null)
                  }}
                  className={`rounded-md px-5 py-2 text-sm font-semibold capitalize transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-on-surface-variant hover:text-neutral-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                Filter:
              </span>
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className={`${inputClass} w-auto min-w-[130px] py-1.5 text-sm`}
              >
                <option value="">All Routes</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.routeName}
                  </option>
                ))}
              </select>
              <select
                value={driverFilter}
                onChange={(e) => setDriverFilter(e.target.value)}
                className={`${inputClass} w-auto min-w-[130px] py-1.5 text-sm`}
              >
                <option value="">All Drivers</option>
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
                className="rounded border border-outline-variant p-1.5 hover:bg-[#f0f1f3]"
              >
                <Icon name="chevron_left" size={18} />
              </button>
              <span className="min-w-[140px] text-center text-sm font-semibold text-neutral-900">
                {dateLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="rounded border border-outline-variant p-1.5 hover:bg-[#f0f1f3]"
              >
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>

          {/* Schedule grid */}
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-on-surface-variant">
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

        {/* Quick Adjust — fixed right column */}
        {showQuickPanel ? (
          <aside className="flex w-[320px] shrink-0 flex-col border-l border-outline-variant bg-white shadow-lg">
            <ScheduleQuickAdjust
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
              onClose={() => setShowQuickPanel(false)}
              saving={saving}
              error={error}
              onApply={handleApply}
              onMaintenanceSwap={handleMaintenanceSwap}
              onMaintenanceOffline={handleMaintenanceOffline}
            />
          </aside>
        ) : (
          <button
            type="button"
            onClick={() => setShowQuickPanel(true)}
            className="flex w-10 shrink-0 flex-col items-center justify-center gap-1 border-l border-outline-variant bg-[#e8eaed] text-xs font-bold uppercase tracking-wide text-neutral-700 hover:bg-white"
            title="Open Quick Adjust"
          >
            <Icon name="tune" size={20} />
            <span className="[writing-mode:vertical-rl] rotate-180">Adjust</span>
          </button>
        )}
      </div>

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
        buses={buses.filter((b) => b.status === 'available' || b.status === 'in-service')}
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
