export const LIVE_TRACKING_STATUSES = ['on-duty', 'on-time', 'delayed']

export function isLiveTrackingEligible(status) {
  return LIVE_TRACKING_STATUSES.includes(status)
}

export function formatLiveLocationAge(updatedAt) {
  if (!updatedAt) return 'No update yet'
  const ms = Date.now() - new Date(updatedAt).getTime()
  if (ms < 0) return 'Just now'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 15) return 'Just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  return new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function pickActiveSharingTrip(trips = []) {
  const priority = { 'on-duty': 0, 'on-time': 1, delayed: 2 }
  return [...trips]
    .filter((trip) => trip.liveLocationSharing && isLiveTrackingEligible(trip.status))
    .sort((a, b) => {
      const statusDiff = (priority[a.status] ?? 9) - (priority[b.status] ?? 9)
      if (statusDiff !== 0) return statusDiff
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    })[0]
}

export function findLiveTrackingTrips(trips = []) {
  return trips.filter((trip) => isLiveTrackingEligible(trip.status))
}
