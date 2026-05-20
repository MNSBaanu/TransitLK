// Assigned to: Baanu
// Module: Route Planning

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import RouteMap from '../components/RouteMap'
import { useLayout } from '../context/LayoutContext'
import {
  formatServiceType,
  driverAvailabilityLabel,
  isDriverAssignable,
  isBusAssignable,
} from '../utils/fleetHelpers'

const emptyForm = {
  routeName: '',
  distance: '',
  startPoint: '',
  endPoint: '',
  stops: [],
  startLocation: null,
  endLocation: null,
  stopLocations: [],
  busId: '',
  driverId: '',
}

function routeCode(route) {
  if (!route?._id) return 'NEW'
  return route._id.slice(-6).toUpperCase()
}

function routeFromApi(route) {
  return {
    routeName: route.routeName || '',
    distance: String(route.distance ?? ''),
    startPoint: route.startPoint || '',
    endPoint: route.endPoint || '',
    stops: route.stops?.length ? [...route.stops] : [],
    startLocation: route.startLocation || null,
    endLocation: route.endLocation || null,
    stopLocations: route.stopLocations?.length ? [...route.stopLocations] : [],
    busId: route.busId?._id || route.busId || '',
    driverId: route.driverId?._id || route.driverId || '',
  }
}

function RoutesPage() {
  const { routeSearch } = useLayout()
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [stopInput, setStopInput] = useState('')
  const [showBusPicker, setShowBusPicker] = useState(false)
  const [showDriverPicker, setShowDriverPicker] = useState(false)

  const isEditing = Boolean(selectedId)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const loadRoutes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/routes')
      setRoutes(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load routes')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFleet = useCallback(async () => {
    try {
      const [busRes, driverRes] = await Promise.all([
        api.get('/buses'),
        api.get('/drivers'),
      ])
      setBuses(Array.isArray(busRes.data) ? busRes.data : [])
      setDrivers(Array.isArray(driverRes.data) ? driverRes.data : [])
    } catch {
      setBuses([])
      setDrivers([])
    }
  }, [])

  useEffect(() => {
    loadRoutes()
    loadFleet()
  }, [loadRoutes, loadFleet])

  const filteredRoutes = useMemo(() => {
    const q = routeSearch.trim().toLowerCase()
    if (!q) return routes
    return routes.filter(
      (r) =>
        r.routeName?.toLowerCase().includes(q) ||
        r.startPoint?.toLowerCase().includes(q) ||
        r.endPoint?.toLowerCase().includes(q)
    )
  }, [routes, routeSearch])

  const selectedRoute = routes.find((r) => r._id === selectedId)

  const selectedBus = useMemo(() => {
    if (!form.busId) return null
    const fromList = buses.find((b) => b._id === form.busId)
    if (fromList) return fromList
    if (selectedRoute?.busId && typeof selectedRoute.busId === 'object') {
      return selectedRoute.busId
    }
    return null
  }, [form.busId, buses, selectedRoute])

  const selectedDriver = useMemo(() => {
    if (!form.driverId) return null
    const fromList = drivers.find((d) => d._id === form.driverId)
    if (fromList) return fromList
    if (selectedRoute?.driverId && typeof selectedRoute.driverId === 'object') {
      return selectedRoute.driverId
    }
    return null
  }, [form.driverId, drivers, selectedRoute])

  const availableBuses = useMemo(
    () => buses.filter((b) => isBusAssignable(b)),
    [buses]
  )

  const availableDrivers = useMemo(
    () => drivers.filter((d) => isDriverAssignable(d)),
    [drivers]
  )

  const assignmentReady = useMemo(() => {
    if (!form.busId || !form.driverId) return false
    const bus = buses.find((b) => b._id === form.busId) || selectedBus
    const driver = drivers.find((d) => d._id === form.driverId) || selectedDriver
    return isBusAssignable(bus) && isDriverAssignable(driver)
  }, [form.busId, form.driverId, buses, drivers, selectedBus, selectedDriver])

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
    setStopInput('')
    setError('')
    setShowBusPicker(false)
    setShowDriverPicker(false)
  }

  const selectRoute = (route) => {
    setSelectedId(route._id)
    setForm(routeFromApi(route))
    setStopInput('')
    setError('')
    setShowBusPicker(false)
    setShowDriverPicker(false)
  }

  const handleMapUpdate = useCallback((data) => {
    setForm((prev) => ({
      ...prev,
      ...(data.distanceKm != null ? { distance: String(data.distanceKm) } : {}),
      ...(data.startLocation ? { startLocation: data.startLocation } : {}),
      ...(data.endLocation ? { endLocation: data.endLocation } : {}),
      ...(data.stopLocations ? { stopLocations: data.stopLocations } : {}),
    }))
  }, [])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const addStop = () => {
    const name = stopInput.trim()
    if (!name) return
    setForm((prev) => ({ ...prev, stops: [...prev.stops, name] }))
    setStopInput('')
  }

  const removeStop = (index) => {
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
    }))
  }

  const buildPayload = () => {
    const payload = {
      routeName: form.routeName.trim(),
      distance: Number(form.distance),
      startPoint: form.startPoint.trim(),
      endPoint: form.endPoint.trim(),
      stops: form.stops,
    }
    if (form.startLocation?.lat != null) payload.startLocation = form.startLocation
    if (form.endLocation?.lat != null) payload.endLocation = form.endLocation
    if (form.stopLocations?.length) payload.stopLocations = form.stopLocations
    if (form.busId?.trim()) payload.busId = form.busId.trim()
    if (form.driverId?.trim()) payload.driverId = form.driverId.trim()
    return payload
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = buildPayload()
      if (isEditing) {
        const { data } = await api.put(`/routes/${selectedId}`, payload)
        setRoutes((prev) => prev.map((r) => (r._id === selectedId ? data : r)))
        showToast('Route saved successfully')
      } else {
        const { data } = await api.post('/routes', payload)
        setRoutes((prev) => [data, ...prev])
        setSelectedId(data._id)
        showToast('Route saved successfully')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save route')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this route?')) return
    setError('')
    try {
      await api.delete(`/routes/${id}`)
      setRoutes((prev) => prev.filter((r) => r._id !== id))
      if (selectedId === id) resetForm()
      showToast('Route removed')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete route')
    }
  }

  const estFuel = form.distance ? `${(Number(form.distance) * 0.1).toFixed(1)} L` : '—'

  return (
    <div className="routes-workspace relative flex h-full min-h-0 flex-1 overflow-hidden bg-fleet-canvas">
      {toast && (
        <div className="absolute left-1/2 top-4 z-[60] flex -translate-x-1/2 items-center gap-2 rounded bg-fleet-primary px-4 py-2 font-sans text-sm font-semibold text-white shadow-lg">
          <Icon name="check_circle" size={20} />
          {toast}
          <button type="button" onClick={() => setToast('')} className="ml-2 hover:opacity-75">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {error && (
        <div className="absolute left-0 right-0 top-0 z-50 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: existing routes (design) */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-fleet-line bg-fleet-surface lg:flex xl:w-80">
          <div className="space-y-3 border-b border-fleet-line p-4">
            <div className="flex items-center justify-between">
              <h2 className="label-caps text-fleet-primary">Existing Routes</h2>
              <button
                type="button"
                className="rounded p-1 text-fleet-ink-muted hover:bg-fleet-muted-low"
                aria-label="Filter routes"
              >
                <Icon name="filter_list" size={20} />
              </button>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              <Icon name="add" size={18} />
              Add New Route
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-fleet-ink-muted">Loading routes...</p>
            ) : filteredRoutes.length === 0 ? (
              <p className="p-4 text-sm text-fleet-ink-muted">
                No routes yet. Click Add New Route to create one.
              </p>
            ) : (
              filteredRoutes.map((route) => {
                const active = route._id === selectedId
                return (
                  <div
                    key={route._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectRoute(route)}
                    onKeyDown={(e) => e.key === 'Enter' && selectRoute(route)}
                    className={`group cursor-pointer border-b border-fleet-line p-4 transition-colors hover:bg-fleet-canvas ${
                      active ? 'border-l-2 border-l-fleet-primary bg-fleet-canvas' : 'border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-mono text-xs font-bold tabular-nums text-fleet-ink">
                        {routeCode(route)}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="status-badge status-badge-available">Active</span>
                        <button type="button" className="rounded p-1 text-fleet-ink-muted">
                          <Icon name="more_vert" size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-fleet-ink">{route.routeName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-fleet-ink-muted">
                      {route.startPoint}
                      <Icon name="arrow_forward" size={14} />
                      {route.endPoint}
                    </p>
                    <p className="mt-1 text-xs text-fleet-ink-muted">{route.distance} km</p>
                    <div className="mt-2 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => selectRoute(route)}
                        className="btn-accent inline-flex items-center p-1.5"
                        title="Edit route"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(route._id)}
                        className="btn-tertiary inline-flex items-center p-1.5"
                        title="Delete route"
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Center: route configuration (design) */}
        <section className="flex min-w-0 flex-1 flex-col border-r border-fleet-line bg-fleet-surface">
          <div className="flex items-center justify-between border-b border-fleet-line px-4 py-3">
            <h2 className="text-base font-semibold text-fleet-ink">Route Configuration</h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-fleet-ink-muted hover:bg-fleet-muted"
              title="Reset form"
            >
              <Icon name="more_vert" size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="space-y-5 p-4">
              <label className="block">
                <span className="label-caps text-fleet-ink-muted">Route Name</span>
                <input
                  name="routeName"
                  value={form.routeName}
                  onChange={handleFormChange}
                  required
                  className="mt-1 w-full rounded border border-fleet-line px-3 py-2 text-sm outline-none focus:border-fleet-primary focus:ring-2 focus:ring-fleet-primary/20"
                  placeholder="Colombo — Kandy Express"
                />
              </label>

              <label className="block">
                <span className="label-caps text-fleet-ink-muted">Distance (km)</span>
                <input
                  name="distance"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distance}
                  onChange={handleFormChange}
                  required
                  className="mt-1 w-full rounded border border-fleet-line px-3 py-2 text-sm tabular-nums outline-none focus:border-fleet-primary focus:ring-2 focus:ring-fleet-primary/20"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label-caps text-fleet-ink-muted">Start Point</span>
                  <div className="relative mt-1">
                    <Icon
                      name="location_on"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-fleet-primary"
                      size={18}
                    />
                    <input
                      name="startPoint"
                      value={form.startPoint}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded border border-fleet-line py-2 pl-8 pr-2 text-sm outline-none focus:border-fleet-primary focus:ring-2 focus:ring-fleet-primary/20"
                      placeholder="Colombo Fort"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="label-caps text-fleet-ink-muted">End Point</span>
                  <div className="relative mt-1">
                    <Icon
                      name="flag"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-fleet-tertiary"
                      size={18}
                    />
                    <input
                      name="endPoint"
                      value={form.endPoint}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded border border-fleet-line py-2 pl-8 pr-2 text-sm outline-none focus:border-fleet-primary focus:ring-2 focus:ring-fleet-primary/20"
                      placeholder="Kandy"
                    />
                  </div>
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="label-caps text-fleet-primary">
                    Stops Management ({form.stops.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addStop}
                    className="flex items-center gap-1 text-sm font-bold text-fleet-primary hover:underline"
                  >
                    <Icon name="add_circle" size={18} />
                    Add Stop
                  </button>
                </div>
                <input
                  value={stopInput}
                  onChange={(e) => setStopInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStop())}
                  className="mb-2 w-full rounded border border-fleet-line px-3 py-2 text-sm outline-none focus:border-fleet-primary focus:ring-2 focus:ring-fleet-primary/20"
                  placeholder="Stop name"
                />
                <ul className="space-y-2">
                  {form.stops.map((stop, index) => (
                    <li
                      key={`${stop}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-transparent bg-fleet-muted-low p-2 hover:border-fleet-line"
                    >
                      <Icon name="drag_indicator" className="cursor-grab text-fleet-ink-muted" size={20} />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fleet-primary text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium">{stop}</span>
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="text-fleet-ink-muted hover:text-fleet-tertiary"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 rounded border border-fleet-line bg-fleet-canvas p-4">
                <div className="flex items-center justify-between">
                  <h3 className="label-caps text-fleet-ink">Assignment</h3>
                  <span className="text-[10px] text-fleet-ink-muted">Last updated just now</span>
                </div>

                {/* Bus */}
                <div className="rounded border border-fleet-line bg-fleet-surface p-3">
                  <div className="flex items-start gap-3">
                    <Icon name="directions_bus" className="text-fleet-primary" size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="label-caps text-fleet-ink-muted">Bus Selection</p>
                      <p className="text-sm font-bold text-fleet-ink">
                        {selectedBus
                          ? `${selectedBus.regNumber} (${formatServiceType(selectedBus.serviceType)})`
                          : 'No bus assigned'}
                      </p>
                      {selectedBus && (
                        <p className="mt-1 text-[11px] font-semibold text-fleet-primary">
                          Vehicle status: {formatServiceType(selectedBus.status)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBusPicker((v) => !v)}
                      className="shrink-0 rounded border border-fleet-line bg-fleet-canvas px-2 py-1 text-xs font-bold text-fleet-ink"
                    >
                      Change
                    </button>
                  </div>
                  {showBusPicker && (
                    <select
                      name="busId"
                      value={form.busId}
                      onChange={(e) => {
                        handleFormChange(e)
                        setShowBusPicker(false)
                      }}
                      className="mt-2 w-full rounded border border-fleet-line px-2 py-2 text-sm"
                    >
                      <option value="">Select available bus</option>
                      {availableBuses.map((b) => (
                        <option key={b._id} value={b._id}>
                          {b.regNumber} · {b.capacity} seats · {formatServiceType(b.serviceType)}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedBus && (
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-fleet-line pt-2">
                      <span className="rounded bg-fleet-muted px-2 py-1 text-center text-[10px] font-medium">
                        {selectedBus.capacity} Seater
                      </span>
                      <span className="rounded bg-fleet-muted px-2 py-1 text-center text-[10px] font-medium capitalize">
                        {selectedBus.status}
                      </span>
                      <span className="rounded bg-fleet-muted px-2 py-1 text-center text-[10px] font-medium capitalize">
                        {formatServiceType(selectedBus.serviceType)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Driver */}
                <div className="rounded border border-fleet-line bg-fleet-surface p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-fleet-line bg-fleet-canvas">
                      <Icon name="person" className="text-fleet-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="label-caps text-fleet-ink-muted">Driver</p>
                      <p className="text-sm font-bold text-fleet-ink">
                        {selectedDriver ? selectedDriver.name : 'No driver assigned'}
                      </p>
                      {selectedDriver && (
                        <p
                          className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                            isDriverAssignable(selectedDriver)
                              ? 'text-fleet-primary'
                              : 'text-fleet-tertiary'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isDriverAssignable(selectedDriver)
                                ? 'bg-fleet-primary'
                                : 'bg-fleet-tertiary'
                            }`}
                          />
                          {driverAvailabilityLabel(selectedDriver)}
                          {selectedDriver.workingHours
                            ? ` · ${selectedDriver.workingHours}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDriverPicker((v) => !v)}
                      className="shrink-0 rounded border border-fleet-line bg-fleet-canvas px-2 py-1 text-xs font-bold text-fleet-ink"
                    >
                      Change
                    </button>
                  </div>
                  {showDriverPicker && (
                    <select
                      name="driverId"
                      value={form.driverId}
                      onChange={(e) => {
                        handleFormChange(e)
                        setShowDriverPicker(false)
                      }}
                      className="mt-2 w-full rounded border border-fleet-line px-2 py-2 text-sm"
                    >
                      <option value="">Select available driver</option>
                      {availableDrivers.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} · {d.licenseNo}
                          {d.workingHours ? ` · ${d.workingHours}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {form.busId && form.driverId && (
                  <div
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${
                      assignmentReady
                        ? 'border-fleet-primary/20 bg-fleet-primary-light text-fleet-primary'
                        : 'border-fleet-tertiary/30 bg-fleet-tertiary-light text-fleet-tertiary'
                    }`}
                  >
                    <Icon name={assignmentReady ? 'verified' : 'warning'} size={16} />
                    {assignmentReady
                      ? 'Bus and driver meet availability, capacity, and working-hour rules'
                      : 'Selected bus or driver no longer meets assignment criteria'}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto flex gap-2 border-t border-fleet-line p-4">
              <button type="button" onClick={resetForm} className="btn-outlined flex-1">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-[2]">
                {saving ? 'Saving...' : 'Save Route'}
              </button>
            </div>
          </form>
        </section>

        {/* Right: map preview (design) */}
        <aside className="relative hidden min-w-0 flex-1 flex-col bg-fleet-muted-low md:flex">
          <RouteMap
            startPoint={form.startPoint}
            endPoint={form.endPoint}
            stops={form.stops}
            startLocation={form.startLocation}
            endLocation={form.endLocation}
            stopLocations={form.stopLocations}
            onRouteComputed={handleMapUpdate}
          />
          <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-10">
            <div className="pointer-events-auto flex flex-wrap items-center gap-4 rounded border border-fleet-line bg-fleet-surface p-4 shadow-md">
              <div className="border-r border-fleet-line pr-4">
                <p className="label-caps text-fleet-ink-muted">Route ID</p>
                <p className="text-sm font-bold tabular-nums text-fleet-ink">
                  {isEditing ? routeCode(selectedRoute) : 'NEW'}
                </p>
              </div>
              <div>
                <p className="label-caps text-fleet-ink-muted">Distance</p>
                <p className="text-sm font-bold tabular-nums">
                  {form.distance ? `${form.distance} km` : '—'}
                </p>
              </div>
              <div>
                <p className="label-caps text-fleet-ink-muted">Stops</p>
                <p className="text-sm font-bold tabular-nums">{form.stops.length} points</p>
              </div>
              <div>
                <p className="label-caps text-fleet-ink-muted">Est. Fuel</p>
                <p className="text-sm font-bold tabular-nums text-fleet-tertiary">{estFuel}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default RoutesPage
