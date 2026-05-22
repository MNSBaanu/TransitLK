// Assigned to: Baanu
// Module: Route Planning

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import RouteListTable from '../components/routes/RouteListTable'
import RouteEditView from '../components/routes/RouteEditView'
import RouteFleetAssignModal from '../components/routes/RouteFleetAssignModal'
import {
  defaultMinCapacityForService,
  isBusAssignable,
  isDriverAssignable,
} from '../utils/fleetHelpers'
import {
  ModuleAlert,
  ModuleCard,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
const emptyForm = {
  routeName: '',
  distance: '',
  startPoint: '',
  endPoint: '',
  stops: [],
  startLocation: null,
  endLocation: null,
  stopLocations: [],
  serviceType: 'ordinary',
  status: 'draft',
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
    serviceType: route.serviceType || 'ordinary',
    status: route.status || 'active',
    busId: route.busId?._id || route.busId || '',
    driverId: route.driverId?._id || route.driverId || '',
  }
}

function RoutesPage() {
  const [pageView, setPageView] = useState('list')
  const [search, setSearch] = useState('')
  const [routes, setRoutes] = useState([])
  const [buses, setBuses] = useState([])
  const [drivers, setDrivers] = useState([])
  const [assignRoute, setAssignRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [stopInput, setStopInput] = useState('')

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
    const active = routes.filter((r) => r.status === 'active').length
    const assigned = routes.filter((r) => r.busId && r.driverId).length
    const avgDist = routes.length
      ? (routes.reduce((s, r) => s + (r.distance || 0), 0) / routes.length).toFixed(1)
      : '—'
    return { total: routes.length, active, assigned, avgDist }
  }, [routes])

  const selectedRoute = routes.find((r) => r._id === selectedId)
  const displayRouteCode = isEditing ? routeCode(selectedRoute) : 'NEW'

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

  const resetForm = () => {
    setSelectedId(null)
    setForm(emptyForm)
    setStopInput('')
    setError('')
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
        const minCap = defaultMinCapacityForService(value)
        if (bus && !isBusAssignable(bus, value, minCap)) next.busId = ''
      }
      return next
    })
  }

  const handleBusChange = (id) => {
    setForm((prev) => ({ ...prev, busId: id }))
  }

  const handleDriverChange = (id) => {
    setForm((prev) => ({ ...prev, driverId: id }))
  }

  const validateFleetAssignment = () => {
    const hasBus = Boolean(form.busId?.trim())
    const hasDriver = Boolean(form.driverId?.trim())
    if (!hasBus && !hasDriver) return true
    if (hasBus !== hasDriver) {
      setError('Select both a bus and a driver, or clear both.')
      return false
    }
    const minCap = defaultMinCapacityForService(form.serviceType)
    if (!isBusAssignable(selectedBus, form.serviceType, minCap)) {
      setError('Selected bus does not meet availability, capacity, or service type requirements.')
      return false
    }
    if (!isDriverAssignable(selectedDriver)) {
      setError('Selected driver is not available or is outside working hours.')
      return false
    }
    return true
  }

  const handleStartPlaceSelect = useCallback((place) => {
    setForm((prev) => ({
      ...prev,
      startPoint: place.label,
      startLocation: place.location,
    }))
  }, [])

  const handleEndPlaceSelect = useCallback((place) => {
    setForm((prev) => ({
      ...prev,
      endPoint: place.label,
      endLocation: place.location,
    }))
  }, [])

  const handleStopPlaceSelect = useCallback((place) => {
    const name = place.label?.trim()
    if (!name) return
    setForm((prev) => {
      const next = { ...prev, stops: [...prev.stops, name] }
      if (place.location?.lat != null) {
        next.stopLocations = [
          ...(prev.stopLocations || []),
          { name, lat: place.location.lat, lng: place.location.lng },
        ]
      }
      return next
    })
    setStopInput('')
  }, [])

  const removeStop = (index) => {
    setForm((prev) => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index),
      stopLocations: (prev.stopLocations || []).filter((_, i) => i !== index),
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
    if (form.status) payload.status = form.status
    if (isEditing) {
      payload.busId = form.busId?.trim() || null
      payload.driverId = form.driverId?.trim() || null
    }
    return payload
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (isEditing && !validateFleetAssignment()) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEditing) {
        const { data } = await api.put(`/routes/${selectedId}`, payload)
        setRoutes((prev) => prev.map((r) => (r._id === selectedId ? data : r)))
      } else {
        const { data } = await api.post('/routes', payload)
        setRoutes((prev) => [data, ...prev])
      }
      showToast('Route saved successfully')
      openList()
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
            subtitle="Plan routes, assign fleet from the list, and manage operational status."
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
                label: 'Active routes',
                value: routeStats.active,
                hint: 'Operational status',
                icon: 'check_circle',
              },
              {
                label: 'Fleet assigned',
                value: routeStats.assigned,
                hint: 'Bus and driver on route',
                icon: 'directions_bus',
              },
              {
                label: 'Avg distance',
                value: `${routeStats.avgDist} km`,
                icon: 'straighten',
              },
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
              onAssignFleet={setAssignRoute}
              onDelete={handleDelete}
            />
          </ModuleCard>

          <RouteFleetAssignModal
            route={assignRoute}
            buses={buses}
            drivers={drivers}
            onClose={() => setAssignRoute(null)}
            onSaved={(updated) => {
              setRoutes((prev) => prev.map((r) => (r._id === updated._id ? updated : r)))
              showToast('Fleet assignment saved')
            }}
          />
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
                Configure route ID, status, stops, fleet assignment, and map preview
              </p>
            </div>
          </div>
          {error && <ModuleAlert variant="error" title={error} />}
          <RouteEditView
            form={form}
            isEditing={isEditing}
            routeCode={displayRouteCode}
            stopInput={stopInput}
            onStopInputChange={setStopInput}
            onFormChange={handleFormChange}
            onBusChange={handleBusChange}
            onDriverChange={handleDriverChange}
            buses={buses}
            drivers={drivers}
            selectedBus={selectedBus}
            selectedDriver={selectedDriver}
            onStartPlaceSelect={handleStartPlaceSelect}
            onEndPlaceSelect={handleEndPlaceSelect}
            onStopPlaceSelect={handleStopPlaceSelect}
            onRemoveStop={removeStop}
            onMapUpdate={handleMapUpdate}
            onSave={handleSave}
            onCancel={openList}
            saving={saving}
          />
        </>
      )}
    </div>
  )
}

export default RoutesPage
