import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { isLiveTrackingEligible } from '../utils/liveLocationHelpers'

const MIN_SEND_INTERVAL_MS = 12000

function getSharingTrips(trips = []) {
  return trips.filter((trip) => trip.liveLocationSharing && isLiveTrackingEligible(trip.status))
}

export default function useDriverLiveLocationSharing(trips, onTripUpdate) {
  const [geoError, setGeoError] = useState('')
  const [sharingBusy, setSharingBusy] = useState(false)
  const watchIdRef = useRef(null)
  const lastSentRef = useRef(0)
  const postingRef = useRef(false)

  const sharingTrips = getSharingTrips(trips)

  const updateTrip = useCallback(
    (updated) => {
      onTripUpdate?.(updated)
    },
    [onTripUpdate]
  )

  const setSharing = useCallback(
    async (tripId, enabled) => {
      setSharingBusy(true)
      setGeoError('')
      try {
        const { data } = await api.patch(`/schedules/${tripId}/live-location`, {
          sharing: enabled,
        })
        updateTrip(data)
        return data
      } catch (err) {
        setGeoError(err.response?.data?.message || 'Failed to update live location sharing')
        throw err
      } finally {
        setSharingBusy(false)
      }
    },
    [updateTrip]
  )

  const postPosition = useCallback(
    async (tripId, position) => {
      try {
        const { coords } = position
        const { data } = await api.patch(`/schedules/${tripId}/live-location`, {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy,
          heading: coords.heading,
          speed: coords.speed,
        })
        updateTrip(data)
      } catch (err) {
        setGeoError(err.response?.data?.message || 'Failed to send live location')
      }
    },
    [updateTrip]
  )

  const broadcastPosition = useCallback(
    async (position) => {
      if (postingRef.current || !sharingTrips.length) return
      const now = Date.now()
      if (now - lastSentRef.current < MIN_SEND_INTERVAL_MS) return

      postingRef.current = true
      lastSentRef.current = now
      try {
        await Promise.all(sharingTrips.map((trip) => postPosition(trip._id, position)))
        setGeoError('')
      } finally {
        postingRef.current = false
      }
    },
    [sharingTrips, postPosition]
  )

  useEffect(() => {
    if (!sharingTrips.length) {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return undefined
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported on this device')
      return undefined
    }

    navigator.geolocation.getCurrentPosition(
      (position) => broadcastPosition(position),
      (error) => setGeoError(error.message || 'Unable to access device location'),
      { enableHighAccuracy: true, timeout: 25000 }
    )

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => broadcastPosition(position),
      (error) => setGeoError(error.message || 'Unable to access device location'),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 }
    )

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [sharingTrips.map((trip) => trip._id).join(','), broadcastPosition])

  return {
    sharingTrips,
    geoError,
    sharingBusy,
    setSharing,
    isSharingActive: sharingTrips.length > 0,
  }
}
