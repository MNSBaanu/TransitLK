import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 } // Colombo

function RouteMap({ startPoint, endPoint, stops = [], distance }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const [mapError, setMapError] = useState('')
  const [scriptReady, setScriptReady] = useState(Boolean(window.google?.maps))

  const isOptimized = stops.length > 0 && Boolean(distance)

  useEffect(() => {
    if (!MAPS_KEY || scriptReady) return

    const existing = document.querySelector('script[data-google-maps]')
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = 'true'
    script.onload = () => setScriptReady(true)
    script.onerror = () => setMapError('Failed to load Google Maps')
    document.head.appendChild(script)
  }, [scriptReady])

  useEffect(() => {
    if (!MAPS_KEY || !scriptReady || !mapRef.current || !window.google?.maps) return

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })
    }

    const geocoder = new window.google.maps.Geocoder()
    const bounds = new window.google.maps.LatLngBounds()
    let pending = 0

    const markers = []
    const clearMarkers = () => {
      markers.forEach((m) => m.setMap(null))
      markers.length = 0
    }

    const addMarker = (location, label, color) => {
      const marker = new window.google.maps.Marker({
        map: mapInstance.current,
        position: location,
        label,
        icon: color
          ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: color,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#fff',
            }
          : undefined,
      })
      markers.push(marker)
      bounds.extend(location)
    }

    const geocodePlace = (address, label, color) => {
      if (!address?.trim()) return
      pending += 1
      geocoder.geocode({ address: `${address}, Sri Lanka` }, (results, status) => {
        pending -= 1
        if (status === 'OK' && results[0]) {
          addMarker(results[0].geometry.location, label, color)
          if (pending === 0) {
            mapInstance.current.fitBounds(bounds, 48)
          }
        }
      })
    }

    clearMarkers()
    geocodePlace(startPoint, 'S', '#191c1e')
    geocodePlace(endPoint, 'E', '#ba1a1a')
    stops.forEach((stop, i) => geocodePlace(stop, String(i + 1), '#191c1e'))
  }, [scriptReady, startPoint, endPoint, stops])

  if (!MAPS_KEY) {
    return (
      <div className="relative h-full w-full bg-surface-container-highest">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-on-surface-variant">
          <Icon name="map" size={64} className="mb-3 opacity-40" />
          <p className="text-sm font-medium">Map preview</p>
          <p className="mt-1 max-w-xs px-4 text-center text-xs opacity-80">
            Add <code className="rounded bg-white px-1">VITE_GOOGLE_MAPS_API_KEY</code> to enable
            Google Maps route visualization.
          </p>
        </div>
        {isOptimized && (
          <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-outline-variant bg-white px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Optimized
          </div>
        )}
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
      {isOptimized && (
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-outline-variant bg-white px-3 py-1.5 text-[10px] font-bold uppercase shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          Optimized
        </div>
      )}
    </div>
  )
}

export default RouteMap
