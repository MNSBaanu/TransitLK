// Assigned to: Baanu
// Module: Route Planning

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import RouteListTable from '../components/routes/RouteListTable'
import RouteEditView from '../components/routes/RouteEditView'
import {
  ModuleAlert,
  ModuleCard,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
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
  serviceType: 'ordinary',
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
    serviceType: route.serviceType || 'ordinary',
  }
}

function RoutesPage() {
  const [pageView, setPageView] = useState('list')
  const [search, setSearch] = useState('')
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
    const q = search.trim().toLowerCase()
    if (!q) return routes
    return routes.filter(
      (r) =>
        r.routeName?.toLowerCase().includes(q) ||
        r.startPoint?.toLowerCase().includes(q) ||
        r.endPoint?.toLowerCase().includes(q)
    )
  }, [routes, search])

  const routeStats = useMemo(() => {
    const assigned = routes.filter((r) => r.busId && r.driverId).length
    const avgDist = routes.length
      ? (routes.reduce((s, r) => s + (r.distance || 0), 0) / routes.length).toFixed(1)
      : '—'
    return { total: routes.length, assigned, avgDist }
  }, [routes])

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
    () => buses.filter((b) => isBusAssignable(b, form.serviceType)),
    [buses, form.serviceType]
  )

  const availableDrivers = useMemo(
    () => drivers.filter((d) => isDriverAssignable(d)),
    [drivers]
  )

  const assignmentReady = useMemo(() => {
    if (!form.busId || !form.driverId) return false
    const bus = buses.find((b) => b._id === form.busId) || selectedBus
    const driver = drivers.find((d) => d._id === form.driverId) || selectedDriver
    return isBusAssignable(bus, form.serviceType) && isDriverAssignable(driver)
  }, [form.busId, form.driverId, form.serviceType, buses, drivers, selectedBus, selectedDriver])

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
    setStopInput('')
    setError('')
    setShowBusPicker(false)
    setShowDriverPicker(false)
  }

  const openList = () => {
    resetForm()
    setPageView('list')
  }

  const openEditor = (route) => {
    if (route) {
      setSelectedId(route._id)
      setForm(routeFromApi(route))
    } else {
      resetForm()
    }
    setStopInput('')
    setError('')
    setPageView('edit')
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
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'serviceType' && prev.busId) {
        const bus = buses.find((b) => b._id === prev.busId)
        if (bus && !isBusAssignable(bus, value)) next.busId = ''
      }
      return next
    })
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
    if (form.serviceType) payload.serviceType = form.serviceType
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
      if (selectedId === id) openList()
      showToast('Route removed')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete route')
    }
  }

  return (
    <div className="w-full">
      <ModuleToast message={toast} />

      {pageView === 'list' ? (
        <>
          <ModuleHeader
            title="Route Management"
            subtitle="Plan routes with stops, distance, and fleet assignment."
            action={
              <ModulePrimaryButton icon="add" onClick={() => openEditor(null)}>
                Add route
              </ModulePrimaryButton>
            }
          />
          <ModuleStats
            items={[
              { label: 'Total routes', value: routeStats.total, icon: 'map' },
              {
                label: 'Fully assigned',
                value: routeStats.assigned,
                hint: 'Bus and driver linked',
                icon: 'check_circle',
              },
              {
                label: 'Avg distance',
                value: `${routeStats.avgDist} km`,
                icon: 'straighten',
              },
              { label: 'Fleet buses', value: buses.length, icon: 'directions_bus' },
            ]}
          />
          {error && (
            <ModuleAlert variant="error" title={error} />
          )}
          <ModuleCard className="p-5">
            <RouteListTable
              routes={filteredRoutes}
              loading={loading}
              search={search}
              onSearchChange={setSearch}
              onEdit={openEditor}
              onDelete={handleDelete}
            />
          </ModuleCard>
        </>
      ) : (
        <>
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={openList}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-white hover:bg-surface-container"
            >
              <Icon name="arrow_back" size={20} />
            </button>
            <div>
              <h2 className="pro-page-title">
                {isEditing ? `Edit route · ${routeCode(selectedRoute)}` : 'New route'}
              </h2>
              <p className="pro-page-subtitle">
                Configure stops, assignment, and map preview
              </p>
            </div>
          </div>
          {error && <ModuleAlert variant="error" title={error} />}
          <RouteEditView
            form={form}
            isEditing={isEditing}
            routeCode={routeCode(selectedRoute)}
            stopInput={stopInput}
            onStopInputChange={setStopInput}
            onFormChange={handleFormChange}
            onAddStop={addStop}
            onRemoveStop={removeStop}
            onMapUpdate={handleMapUpdate}
            onSave={handleSave}
            onCancel={openList}
            saving={saving}
            selectedBus={selectedBus}
            selectedDriver={selectedDriver}
            availableBuses={availableBuses}
            availableDrivers={availableDrivers}
            assignmentReady={assignmentReady}
            showBusPicker={showBusPicker}
            setShowBusPicker={setShowBusPicker}
            showDriverPicker={showDriverPicker}
            setShowDriverPicker={setShowDriverPicker}
          />
        </>
      )}
    </div>
  )
}

export default RoutesPage
