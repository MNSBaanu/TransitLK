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
  preferredServiceType: '',
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
    preferredServiceType: route.busId?.serviceType || '',
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

  const availableBuses = useMemo(() => {
    return buses.filter((b) => {
      if (!isBusAssignable(b)) return false
      if (form.preferredServiceType && b.serviceType !== form.preferredServiceType) {
        return false
      }
      return true
    })
  }, [buses, form.preferredServiceType])

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
    <div className="routes-workspace flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      {toast && (
        <div className="absolute left-1/2 top-20 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white shadow-xl">
          <Icon name="check_circle" size={20} />
          {toast}
          <button type="button" onClick={() => setToast('')} className="ml-2 hover:opacity-75">
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Page header */}
      <header className="flex shrink-0 items-center justify-between border-b border-outline-variant px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Routes</h1>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            Plan routes with stops, map visualization, and bus/driver assignment by FK.
          </p>
        </div>
        <button
          type="button"
          onClick={resetForm}
          className="flex items-center gap-2 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          <Icon name="add" size={18} />
          Add New Route
        </button>
      </header>

      {error && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left: existing routes */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-outline-variant bg-white lg:flex xl:w-80">
          <div className="flex items-center justify-between border-b border-outline-variant p-4">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-secondary">
              Existing Routes
            </h2>
            <button
              type="button"
              className="rounded p-1 text-neutral-700 hover:bg-surface-container"
              aria-label="Filter routes"
            >
              <Icon name="filter_list" size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-on-surface-variant">Loading routes...</p>
            ) : filteredRoutes.length === 0 ? (
              <p className="p-4 text-sm text-on-surface-variant">
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
                    className={`group cursor-pointer border-b border-outline-variant p-4 transition-colors hover:bg-surface-container-low ${
                      active ? 'border-l-4 border-l-neutral-900 bg-neutral-50' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <span className="font-mono text-xs font-bold text-neutral-800">
                        {routeCode(route)}
                      </span>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                          Active
                        </span>
                        <button type="button" className="rounded p-1 text-on-surface-variant">
                          <Icon name="more_vert" size={18} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{route.routeName}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-on-surface-variant">
                      {route.startPoint}
                      <Icon name="arrow_forward" size={14} />
                      {route.endPoint}
                    </p>
                    <p className="mt-1 text-xs text-on-surface-variant">{route.distance} km</p>
                    <div className="mt-2 flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => selectRoute(route)}
                        className="rounded border border-outline-variant bg-white p-1.5 hover:border-neutral-900 hover:text-neutral-900"
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(route._id)}
                        className="rounded border border-outline-variant bg-white p-1.5 hover:border-error hover:text-error"
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

        {/* Center: map */}
        <section className="relative hidden min-w-0 flex-1 flex-col border-r border-outline-variant md:flex">
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
            <div className="pointer-events-auto flex flex-wrap items-center gap-4 rounded-xl border border-outline-variant bg-white p-4 shadow-lg">
              <div className="border-r border-outline-variant pr-4">
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">Route ID</p>
                <p className="text-sm font-bold text-neutral-900">
                  {isEditing ? routeCode(selectedRoute) : 'NEW'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">Distance</p>
                <p className="text-sm font-bold">
                  {form.distance ? `${form.distance} km` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">Stops</p>
                <p className="text-sm font-bold">{form.stops.length} points</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-on-surface-variant">Est. Fuel</p>
                <p className="text-sm font-bold text-amber-700">{estFuel}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right: configuration */}
        <aside className="flex w-full shrink-0 flex-col bg-white sm:w-[400px]">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="text-base font-semibold text-neutral-900">Configuration</h2>
            <button
              type="button"
              onClick={resetForm}
              className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
              title="Reset form"
            >
              <Icon name="more_vert" size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="space-y-5 p-4">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  Route Name
                </span>
                <input
                  name="routeName"
                  value={form.routeName}
                  onChange={handleFormChange}
                  required
                  className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  placeholder="Colombo — Kandy Express"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  Distance (km)
                </span>
                <input
                  name="distance"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distance}
                  onChange={handleFormChange}
                  required
                  className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
                <p className="mt-1 text-[10px] text-on-surface-variant">
                  Auto-calculated from Google Maps when API key is set; editable manually.
                </p>
              </label>

              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                  Preferred bus service type
                </span>
                <select
                  name="preferredServiceType"
                  value={form.preferredServiceType}
                  onChange={handleFormChange}
                  className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
                >
                  <option value="">Any service type</option>
                  <option value="express">Express</option>
                  <option value="ordinary">Ordinary</option>
                  <option value="semi-luxury">Semi-luxury</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    Start Point
                  </span>
                  <div className="relative mt-1">
                    <Icon
                      name="location_on"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-700"
                      size={18}
                    />
                    <input
                      name="startPoint"
                      value={form.startPoint}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-lg border border-outline-variant py-2 pl-8 pr-2 text-sm outline-none focus:border-neutral-900"
                      placeholder="Colombo Fort"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
                    End Point
                  </span>
                  <div className="relative mt-1">
                    <Icon
                      name="flag"
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-error"
                      size={18}
                    />
                    <input
                      name="endPoint"
                      value={form.endPoint}
                      onChange={handleFormChange}
                      required
                      className="w-full rounded-lg border border-outline-variant py-2 pl-8 pr-2 text-sm outline-none focus:border-neutral-900"
                      placeholder="Kandy"
                    />
                  </div>
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                    Stops Management ({form.stops.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addStop}
                    className="flex items-center gap-1 text-sm font-bold text-neutral-900 hover:underline"
                  >
                    <Icon name="add_circle" size={18} />
                    Add Stop
                  </button>
                </div>
                <input
                  value={stopInput}
                  onChange={(e) => setStopInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStop())}
                  className="mb-2 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:border-neutral-900"
                  placeholder="Stop name"
                />
                <ul className="space-y-2">
                  {form.stops.map((stop, index) => (
                    <li
                      key={`${stop}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-transparent bg-surface-container-low p-2 hover:border-outline-variant"
                    >
                      <Icon name="drag_indicator" className="cursor-grab text-outline" size={20} />
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium">{stop}</span>
                      <button
                        type="button"
                        onClick={() => removeStop(index)}
                        className="text-on-surface-variant hover:text-error"
                      >
                        <Icon name="delete" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase text-neutral-900">Assignment</h3>
                  <span className="text-[10px] text-on-surface-variant">Last updated just now</span>
                </div>

                {/* Bus */}
                <div className="rounded-lg border border-outline-variant bg-white p-3">
                  <div className="flex items-start gap-3">
                    <Icon name="directions_bus" className="text-neutral-800" size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                        Bus Selection
                      </p>
                      <p className="text-sm font-bold text-neutral-900">
                        {selectedBus
                          ? `${selectedBus.regNumber} (${formatServiceType(selectedBus.serviceType)})`
                          : 'No bus assigned'}
                      </p>
                      {selectedBus && (
                        <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                          Vehicle status: {formatServiceType(selectedBus.status)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBusPicker((v) => !v)}
                      className="shrink-0 rounded bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-900"
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
                      className="mt-2 w-full rounded border border-outline-variant px-2 py-2 text-sm"
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
                    <div className="mt-2 grid grid-cols-3 gap-2 border-t border-outline-variant pt-2">
                      <span className="rounded bg-surface-container px-2 py-1 text-center text-[10px] font-medium">
                        {selectedBus.capacity} Seater
                      </span>
                      <span className="rounded bg-surface-container px-2 py-1 text-center text-[10px] font-medium capitalize">
                        {selectedBus.status}
                      </span>
                      <span className="rounded bg-surface-container px-2 py-1 text-center text-[10px] font-medium capitalize">
                        {formatServiceType(selectedBus.serviceType)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Driver */}
                <div className="rounded-lg border border-outline-variant bg-white p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container">
                      <Icon name="person" className="text-neutral-800" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant">Driver</p>
                      <p className="text-sm font-bold text-neutral-900">
                        {selectedDriver ? selectedDriver.name : 'No driver assigned'}
                      </p>
                      {selectedDriver && (
                        <p
                          className={`mt-1 flex items-center gap-1 text-[11px] font-semibold ${
                            isDriverAssignable(selectedDriver)
                              ? 'text-emerald-600'
                              : 'text-amber-700'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isDriverAssignable(selectedDriver)
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
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
                      className="shrink-0 rounded bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-900"
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
                      className="mt-2 w-full rounded border border-outline-variant px-2 py-2 text-sm"
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
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
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

            <div className="mt-auto flex gap-2 border-t border-outline-variant p-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 rounded-lg border border-outline-variant bg-white py-2.5 text-sm font-semibold text-secondary hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-[2] rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Route'}
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}

export default RoutesPage
