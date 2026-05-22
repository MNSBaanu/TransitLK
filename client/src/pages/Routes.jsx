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
  }
}

function RoutesPage() {
  const [pageView, setPageView] = useState('list')
  const [search, setSearch] = useState('')
  const [routes, setRoutes] = useState([])
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

  useEffect(() => {
    loadRoutes()
  }, [loadRoutes])

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
    const avgDist = routes.length
      ? (routes.reduce((s, r) => s + (r.distance || 0), 0) / routes.length).toFixed(1)
      : '—'
    return { total: routes.length, active, avgDist }
  }, [routes])

  const selectedRoute = routes.find((r) => r._id === selectedId)
  const displayRouteCode = isEditing ? routeCode(selectedRoute) : 'NEW'

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
        if (bus && !isBusAssignable(bus, value)) next.busId = ''
      }
      return next
    })
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
    return payload
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
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
            subtitle="Plan routes with stops, distance, and operational status."
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
                Configure route ID, status, stops, and map preview
              </p>
            </div>
          </div>
          {error && <ModuleAlert variant="error" title={error} />}
          <RouteEditView
            form={form}
            routeCode={displayRouteCode}
            stopInput={stopInput}
            onStopInputChange={setStopInput}
            onFormChange={handleFormChange}
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
