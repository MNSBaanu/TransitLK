// Assigned to: Baanu
// Module: Route Planning

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import {
  getCachedPageData,
  getStalePageData,
  invalidatePageData,
  loadPageData,
  prefetchPageData,
} from '../services/pagePrefetch'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import Icon from '../components/Icon'
import RouteListTable from '../components/routes/RouteListTable'
import RouteEditView from '../components/routes/RouteEditView'
import RouteView from '../components/routes/RouteView'
import RouteFleetAssignModal from '../components/routes/RouteFleetAssignModal'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  defaultMinCapacityForService,
  isBusAssignable,
  isDriverAssignable,
} from '../utils/fleetHelpers'
import { buildRouteName } from '../utils/routeHelpers'
import {
  ModuleAlert,
  ModuleCard,
  ModuleHeader,
  ModulePrimaryButton,
  ModuleStats,
  ModuleToast,
} from '../components/layout/ModuleLayout'
const emptyForm = {
  routeNo: '',
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

const DEFAULT_PAGE_SIZE = 10
const PAGE_SIZE_OPTIONS = [10, 15]
const DEFAULT_ROUTE_OPTIONS = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  search: '',
}
const EMPTY_PAGINATION = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  totalItems: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}
const EMPTY_SUMMARY = {
  total: 0,
  active: 0,
  assigned: 0,
  avgDistance: null,
}

function routeCode(route) {
  if (route?.routeNo) return route.routeNo
  if (!route?._id) return 'NEW'
  return route._id.slice(-6).toUpperCase()
}

function routeFromApi(route) {
  const startPoint = route.startPoint || ''
  const endPoint = route.endPoint || ''
  return {
    routeNo: route.routeNo || '',
    routeName: buildRouteName(startPoint, endPoint) || route.routeName || '',
    distance: String(route.distance ?? ''),
    startPoint,
    endPoint,
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
  const initialData =
    getCachedPageData('/routes', DEFAULT_ROUTE_OPTIONS) ||
    getStalePageData('/routes', DEFAULT_ROUTE_OPTIONS)
  const [pageView, setPageView] = useState('list')
  const [searchInput, setSearchInput] = useState(() => initialData?.search || '')
  const [search, setSearch] = useState(() => initialData?.search || '')
  const [currentPage, setCurrentPage] = useState(() => initialData?.pagination?.page || 1)
  const [pageSize, setPageSize] = useState(() => initialData?.pagination?.limit || DEFAULT_PAGE_SIZE)
  const [routes, setRoutes] = useState(() => initialData?.routes || [])
  const [buses, setBuses] = useState(() => initialData?.buses || [])
  const [drivers, setDrivers] = useState(() => initialData?.drivers || [])
  const [pagination, setPagination] = useState(() => initialData?.pagination || EMPTY_PAGINATION)
  const [summary, setSummary] = useState(() => initialData?.summary || EMPTY_SUMMARY)
  const [assignRoute, setAssignRoute] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(!initialData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [stopInput, setStopInput] = useState('')
  const [initialRouteStatus, setInitialRouteStatus] = useState('draft')

  const isViewing = pageView === 'view' && Boolean(selectedId)
  const isEditPage = pageView === 'edit'
  const isEditingExisting = isEditPage && Boolean(selectedId)

  const showToast = (message) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const invalidateRelatedPages = useCallback(() => {
    invalidatePageData('/routes')
    invalidatePageData('/schedules')
    invalidatePageData('/reports')
  }, [])

  const loadRoutes = useCallback(
    async ({
      page = currentPage,
      limit = pageSize,
      search: searchTerm = search,
      force = false,
      keepContent = false,
    } = {}) => {
    if (!force) {
        const cached = getCachedPageData('/routes', {
          page,
          limit,
          search: searchTerm,
        })
      if (cached) {
        setRoutes(cached.routes)
        setBuses(cached.buses)
        setDrivers(cached.drivers)
          setPagination(cached.pagination || EMPTY_PAGINATION)
          setSummary(cached.summary || EMPTY_SUMMARY)
        setLoading(false)
        setError('')
        return
      }
    }

    if (!keepContent) setLoading(true)
    setError('')
    try {
        const data = await loadPageData(
          '/routes',
          {
            page,
            limit,
            search: searchTerm,
          },
          { force }
        )
      setRoutes(data.routes)
      setBuses(data.buses)
      setDrivers(data.drivers)
        setPagination(data.pagination || EMPTY_PAGINATION)
        setSummary(data.summary || EMPTY_SUMMARY)
        if (data.pagination?.page && data.pagination.page !== currentPage) {
          setCurrentPage(data.pagination.page)
        }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load routes')
    } finally {
      setLoading(false)
    }
    },
    [currentPage, pageSize, search]
  )

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        loadRoutes({
          page: currentPage,
          limit: pageSize,
          search,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [currentPage, pageSize, search, loadRoutes])

  useAutoRefresh(
    () =>
      loadRoutes({
        page: currentPage,
        limit: pageSize,
        search,
        force: true,
        keepContent: true,
      }),
    {
      enabled:
        pageView === 'list' && !assignRoute && !deleteTargetId && !saving && !isEditPage && !isViewing,
    }
  )

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1)
      setSearch(searchInput.trim())
    }, 250)
    return () => clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    if (!pagination.hasNextPage) return
    prefetchPageData('/routes', {
      page: pagination.page + 1,
      limit: pagination.limit,
      search,
    })
  }, [pagination, search])

  const routeStats = useMemo(() => {
    const distanceValues = routes
      .map((route) => Number(route?.distance))
      .filter((distance) => Number.isFinite(distance) && distance > 0)
    const avgDist =
      distanceValues.length > 0
        ? (distanceValues.reduce((sum, distance) => sum + distance, 0) / distanceValues.length).toFixed(1)
        : null
    return {
      total: summary.total || 0,
      active: summary.active || 0,
      assigned: summary.assigned || 0,
      avgDist,
    }
  }, [routes, summary])

  const selectedRoute = routes.find((r) => r._id === selectedId)
  const displayRouteCode =
    isEditingExisting || isViewing ? routeCode(selectedRoute) : 'NEW'

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
    setInitialRouteStatus('draft')
    setError('')
  }

  const openList = () => {
    resetForm()
    setPageView('list')
  }

  const openViewer = (route) => {
    if (!route) return
    setSelectedId(route._id)
    setForm(routeFromApi(route))
    setStopInput('')
    setError('')
    setPageView('view')
  }

  const openEditor = (route) => {
    if (route) {
      setSelectedId(route._id)
      setForm(routeFromApi(route))
      setInitialRouteStatus(route.status || 'active')
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
      if (name === 'startPoint' || name === 'endPoint') {
        next.routeName = buildRouteName(
          name === 'startPoint' ? value : prev.startPoint,
          name === 'endPoint' ? value : prev.endPoint
        )
      }
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
    setForm((prev) => {
      const startPoint = place.label
      return {
        ...prev,
        startPoint,
        startLocation: place.location,
        routeName: buildRouteName(startPoint, prev.endPoint),
      }
    })
  }, [])

  const handleEndPlaceSelect = useCallback((place) => {
    setForm((prev) => {
      const endPoint = place.label
      return {
        ...prev,
        endPoint,
        endLocation: place.location,
        routeName: buildRouteName(prev.startPoint, endPoint),
      }
    })
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
      routeNo: form.routeNo.trim(),
      routeName: buildRouteName(form.startPoint, form.endPoint),
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
    if (isEditingExisting) {
      payload.busId = form.busId?.trim() || null
      payload.driverId = form.driverId?.trim() || null
    }
    return payload
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (isEditingExisting && !validateFleetAssignment()) return
    setSaving(true)
    try {
      const payload = buildPayload()
      if (isEditingExisting) {
        await api.put(`/routes/${selectedId}`, payload)
      } else {
        await api.post('/routes', payload)
        setSearchInput('')
        setSearch('')
        setCurrentPage(1)
      }
      invalidateRelatedPages()
      await loadRoutes({
        page: isEditingExisting ? currentPage : 1,
        limit: pageSize,
        search: isEditingExisting ? search : '',
        force: true,
      })
      showToast('Route saved successfully')
      openList()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save route')
    } finally {
      setSaving(false)
    }
  }

  const deleteTargetRoute = routes.find((r) => r._id === deleteTargetId)

  const handleDeleteRequest = (id) => {
    setDeleteTargetId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return
    setDeleting(true)
    setError('')
    try {
      await api.delete(`/routes/${deleteTargetId}`)
      invalidateRelatedPages()
      await loadRoutes({
        page: currentPage,
        limit: pageSize,
        search,
        force: true,
      })
      if (selectedId === deleteTargetId && (pageView === 'edit' || pageView === 'view')) {
        openList()
      }
      if (assignRoute?._id === deleteTargetId) setAssignRoute(null)
      setDeleteTargetId(null)
      showToast('Route removed')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete route')
    } finally {
      setDeleting(false)
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
                value: routeStats.avgDist == null ? '—' : `${routeStats.avgDist} km`,
                icon: 'straighten',
              },
            ]}
          />
          {error && (
            <ModuleAlert variant="error" title={error} />
          )}
          <ModuleCard className="p-5">
            <RouteListTable
              routes={routes}
              loading={loading}
              search={searchInput}
              onSearchChange={setSearchInput}
              pagination={pagination}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setCurrentPage}
              onPageSizeChange={(nextLimit) => {
                setCurrentPage(1)
                setPageSize(nextLimit)
              }}
              onView={openViewer}
              onEdit={openEditor}
              onAssignFleet={setAssignRoute}
              onDelete={handleDeleteRequest}
            />
          </ModuleCard>

          <ConfirmDialog
            open={Boolean(deleteTargetId)}
            title="Delete this route?"
            message={
              deleteTargetRoute
                ? `"${deleteTargetRoute.routeName}" will be permanently removed. This cannot be undone.`
                : 'This route will be permanently removed. This cannot be undone.'
            }
            confirmLabel="Delete route"
            cancelLabel="Cancel"
            variant="danger"
            loading={deleting}
            onConfirm={handleDeleteConfirm}
            onCancel={() => !deleting && setDeleteTargetId(null)}
          />

          <RouteFleetAssignModal
            key={assignRoute?._id || 'route-fleet-assign'}
            route={assignRoute}
            buses={buses}
            drivers={drivers}
            onClose={() => setAssignRoute(null)}
            onSaved={async () => {
              invalidateRelatedPages()
              await loadRoutes({
                page: currentPage,
                limit: pageSize,
                search,
                force: true,
              })
              showToast('Fleet assignment saved')
            }}
          />
        </>
      ) : isViewing ? (
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
                View route · {routeCode(selectedRoute)}
              </h2>
              <p className="pro-page-subtitle">
                Read-only preview — map, stops, status, and fleet assignment
              </p>
            </div>
          </div>
          <RouteView
            form={form}
            routeCode={displayRouteCode}
            selectedBus={selectedBus}
            selectedDriver={selectedDriver}
            buses={buses}
            drivers={drivers}
            onEdit={() => openEditor(selectedRoute)}
            onBack={openList}
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
                {isEditingExisting ? `Edit route · ${routeCode(selectedRoute)}` : 'New route'}
              </h2>
              <p className="pro-page-subtitle">
                Configure route ID, status, stops, fleet assignment, and map preview
              </p>
            </div>
          </div>
          {error && <ModuleAlert variant="error" title={error} />}
          <RouteEditView
            form={form}
            isEditing={isEditingExisting}
            routeCode={displayRouteCode}
            initialRouteStatus={initialRouteStatus}
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
