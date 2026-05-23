import { useEffect, useMemo, useState } from 'react'
import api from '../../services/api'
import Icon from '../Icon'
import RouteFleetAssignment from './RouteFleetAssignment'
import {
  defaultMinCapacityForService,
  isBusAssignable,
  isDriverAssignable,
} from '../../utils/fleetHelpers'

function routeCode(route) {
  if (!route?._id) return '—'
  return route._id.slice(-6).toUpperCase()
}

function RouteFleetAssignModal({ route, buses, drivers, onClose, onSaved }) {
  const [busId, setBusId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!route) return
    setBusId(route.busId?._id || route.busId || '')
    setDriverId(route.driverId?._id || route.driverId || '')
    setError('')
  }, [route])

  const serviceType = route?.serviceType || 'ordinary'
  const minCapacity = defaultMinCapacityForService(serviceType)

  const selectedBus = useMemo(() => {
    if (!busId) return null
    const fromList = buses.find((b) => b._id === busId)
    if (fromList) return fromList
    if (route?.busId && typeof route.busId === 'object' && route.busId._id === busId) {
      return route.busId
    }
    return null
  }, [busId, buses, route])

  const selectedDriver = useMemo(() => {
    if (!driverId) return null
    const fromList = drivers.find((d) => d._id === driverId)
    if (fromList) return fromList
    if (route?.driverId && typeof route.driverId === 'object' && route.driverId._id === driverId) {
      return route.driverId
    }
    return null
  }, [driverId, drivers, route])

  const handleSave = async () => {
    if (!route) return
    setError('')

    const hasBus = Boolean(busId)
    const hasDriver = Boolean(driverId)
    if (hasBus !== hasDriver) {
      setError('Select both a bus and a driver, or clear both.')
      return
    }
    if (hasBus && !isBusAssignable(selectedBus, serviceType, minCapacity)) {
      setError('Selected bus does not meet availability, capacity, or service type requirements.')
      return
    }
    if (hasDriver && !isDriverAssignable(selectedDriver)) {
      setError('Selected driver is not available or is outside working hours.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        routeName: route.routeName,
        distance: route.distance,
        startPoint: route.startPoint,
        endPoint: route.endPoint,
        stops: route.stops || [],
        serviceType: route.serviceType,
        status: route.status || 'active',
        busId: busId || null,
        driverId: driverId || null,
      }
      if (route.startLocation) payload.startLocation = route.startLocation
      if (route.endLocation) payload.endLocation = route.endLocation
      if (route.stopLocations?.length) payload.stopLocations = route.stopLocations

      const { data } = await api.put(`/routes/${route._id}`, payload)
      onSaved?.(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assignment')
    } finally {
      setSaving(false)
    }
  }

  if (!route) return null

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-fleet-assign-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="route-fleet-assign-title" className="text-lg font-semibold text-neutral-900">
              Assign bus &amp; driver
            </h3>
            <p className="text-sm text-on-surface-variant">
              {route.routeName} · ID {routeCode(route)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-surface-container"
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <RouteFleetAssignment
          serviceType={serviceType}
          busId={busId}
          driverId={driverId}
          buses={buses}
          drivers={drivers}
          selectedBus={selectedBus}
          selectedDriver={selectedDriver}
          onBusChange={setBusId}
          onDriverChange={setDriverId}
        />

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-w-[7rem] rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-w-[9rem] rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RouteFleetAssignModal
