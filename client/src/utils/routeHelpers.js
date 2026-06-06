const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
}

export function buildRouteName(startPoint, endPoint) {
  const start = String(startPoint || '').trim()
  const end = String(endPoint || '').trim()
  if (!start && !end) return ''
  if (!start) return end
  if (!end) return start
  return `${start} — ${end}`
}

export function isSchedulableRoute(route) {
  return route?.status === 'active' || !route?.status
}

export function formatRouteStopsLabel(stops) {
  if (!stops?.length) return ''
  return stops.join(', ')
}

export function formatRouteStatus(status) {
  return STATUS_LABELS[status] || status || '—'
}

export function routeStatusClass(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'draft':
      return 'bg-amber-100 text-amber-800'
    case 'inactive':
      return 'bg-neutral-200 text-neutral-700'
    default:
      return 'bg-surface-container-low text-on-surface-variant'
  }
}
