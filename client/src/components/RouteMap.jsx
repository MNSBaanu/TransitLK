import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { getGoogleMapsApiKey, loadGoogleMapsScript } from '../utils/googleMapsLoader'

const MAPS_KEY = getGoogleMapsApiKey()
const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 }

function toLatLng(loc) {
  if (!loc || loc.lat == null || loc.lng == null) return null
  return { lat: Number(loc.lat), lng: Number(loc.lng) }
}

function geocodeAddress(geocoder, address) {
  return new Promise((resolve) => {
    if (!address?.trim()) {
      resolve(null)
      return
    }
    geocoder.geocode(
      { address: address.trim(), componentRestrictions: { country: 'LK' } },
      (results, status) => {
        if (status === 'OK' && results[0]) {
          const { lat, lng } = results[0].geometry.location
          resolve({
            lat: lat(),
            lng: lng(),
            address: results[0].formatted_address,
          })
        } else {
          resolve(null)
        }
      }
    )
  })
}

function RouteMap({
  startPoint,
  endPoint,
  stops = [],
  startLocation,
  endLocation,
  stopLocations = [],
  liveLocation = null,
  liveLocationLabel = 'Driver',
  onRouteComputed,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const directionsRenderer = useRef(null)
  const liveMarkerRef = useRef(null)
  const [mapError, setMapError] = useState('')
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.maps))
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    if (!MAPS_KEY || scriptReady) return

    loadGoogleMapsScript()
      .then(() => setScriptReady(true))
      .catch(() => setMapError('Failed to load Google Maps'))
  }, [scriptReady])

  useEffect(() => {
    if (!MAPS_KEY || !scriptReady || !mapRef.current || !window.google?.maps) return

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      })
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: '#1e3a8a', strokeWeight: 5 },
      })
      directionsRenderer.current.setMap(mapInstance.current)
    }

    let cancelled = false

    const run = async () => {
      if (!startPoint?.trim() || !endPoint?.trim()) {
        directionsRenderer.current?.setDirections({ routes: [] })
        return
      }

      setComputing(true)
      const geocoder = new window.google.maps.Geocoder()

      const start =
        toLatLng(startLocation) ||
        (await geocodeAddress(geocoder, startPoint))
      const end =
        toLatLng(endLocation) || (await geocodeAddress(geocoder, endPoint))

      if (cancelled || !start || !end) {
        setComputing(false)
        return
      }

      const resolvedStops = []
      for (let i = 0; i < stops.length; i++) {
        const fromDb = stopLocations[i]
        const loc =
          toLatLng(fromDb) || (await geocodeAddress(geocoder, stops[i]))
        if (loc) {
          resolvedStops.push({
            name: stops[i],
            lat: loc.lat,
            lng: loc.lng,
            location: loc,
          })
        }
      }

      if (cancelled) return

      const directionsService = new window.google.maps.DirectionsService()
      const waypoints = resolvedStops.map((s) => ({
        location: { lat: s.lat, lng: s.lng },
        stopover: true,
      }))

      directionsService.route(
        {
          origin: start,
          destination: end,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          region: 'LK',
        },
        (result, status) => {
          setComputing(false)
          if (cancelled) return

          if (status === 'OK' && result) {
            directionsRenderer.current.setDirections(result)
            const meters = result.routes[0]?.legs?.reduce(
              (sum, leg) => sum + (leg.distance?.value || 0),
              0
            )
            const distanceKm = meters ? Math.round((meters / 1000) * 10) / 10 : null

            onRouteComputed?.({
              distanceKm,
              startLocation: { lat: start.lat, lng: start.lng, address: start.address || startPoint },
              endLocation: { lat: end.lat, lng: end.lng, address: end.address || endPoint },
              stopLocations: resolvedStops.map((s) => ({
                name: s.name,
                lat: s.lat,
                lng: s.lng,
              })),
            })
          } else {
            directionsRenderer.current.setDirections({ routes: [] })
            const bounds = new window.google.maps.LatLngBounds()
            bounds.extend(start)
            bounds.extend(end)
            resolvedStops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }))
            mapInstance.current.fitBounds(bounds, 48)

            onRouteComputed?.({
              startLocation: { lat: start.lat, lng: start.lng, address: startPoint },
              endLocation: { lat: end.lat, lng: end.lng, address: endPoint },
              stopLocations: resolvedStops.map((s) => ({
                name: s.name,
                lat: s.lat,
                lng: s.lng,
              })),
            })
          }
        }
      )
    }

    const timer = setTimeout(run, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    scriptReady,
    startPoint,
    endPoint,
    stops.join('|'),
    startLocation?.lat,
    startLocation?.lng,
    endLocation?.lat,
    endLocation?.lng,
    stopLocations.length,
  ])

  useEffect(() => {
    if (!mapInstance.current || !window.google?.maps || !scriptReady) return

    if (liveLocation?.lat == null || liveLocation?.lng == null) {
      liveMarkerRef.current?.setMap(null)
      liveMarkerRef.current = null
      return
    }

    const position = { lat: Number(liveLocation.lat), lng: Number(liveLocation.lng) }
    if (!liveMarkerRef.current) {
      liveMarkerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position,
        title: liveLocationLabel,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#15803d',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
    } else {
      liveMarkerRef.current.setPosition(position)
      liveMarkerRef.current.setTitle(liveLocationLabel)
    }
  }, [scriptReady, liveLocation?.lat, liveLocation?.lng, liveLocation?.updatedAt, liveLocationLabel])

  const handleZoom = (delta) => {
    if (!mapInstance.current) return
    const z = mapInstance.current.getZoom()
    mapInstance.current.setZoom(z + delta)
  }

  if (!MAPS_KEY) {
    return (
      <div className="relative h-full w-full bg-fleet-muted">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-fleet-ink-muted">
          <Icon name="map" size={64} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">Map preview</p>
          <p className="mt-1 max-w-xs px-4 text-center text-xs opacity-80">
            Add <code className="rounded bg-white px-1">VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
            <code className="rounded bg-white px-1">client/.env</code> for Google Maps route
            visualization.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {mapError ? (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-error">
          {mapError}
        </p>
      ) : (
        <div ref={mapRef} className="h-full w-full" />
      )}

      <div className="absolute left-4 top-4 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => handleZoom(1)}
          className="rounded border border-fleet-line bg-fleet-surface p-2 shadow-md hover:bg-fleet-muted-low"
          aria-label="Zoom in"
        >
          <Icon name="add" size={20} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          className="rounded border border-fleet-line bg-fleet-surface p-2 shadow-md hover:bg-fleet-muted-low"
          aria-label="Zoom out"
        >
          <Icon name="remove" size={20} />
        </button>
      </div>

      {computing && (
        <div className="absolute right-4 top-4 z-10 rounded-full border border-fleet-line bg-fleet-surface px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm">
          Calculating route…
        </div>
      )}

      {liveLocation?.lat != null && liveLocation?.lng != null && (
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-green-300 bg-green-50/95 px-3 py-1.5 text-[10px] font-bold uppercase text-green-900 shadow-sm">
          Live · {liveLocationLabel}
        </div>
      )}
    </div>
  )
}

export default RouteMap
