const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
  assigned: 'Assigned',
}

/** Short single-line place label for route names (e.g. "Matale" not "Matale, Sri Lanka"). */
export function compactRouteSegment(value) {
  return String(value || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^via\s+/i, '')
    .split(',')[0]
    .trim()
}

export function compactPlaceLabel(placeOrText) {
  if (placeOrText && typeof placeOrText === 'object') {
    const name = placeOrText.name?.trim()
    const formatted = placeOrText.formatted_address?.trim()
    if (name) return compactRouteSegment(name)
    if (formatted) return compactRouteSegment(formatted)
    return ''
  }
  return compactRouteSegment(placeOrText)
}

export function buildRouteName(startPoint, endPoint, stops = []) {
  const start = compactRouteSegment(startPoint)
  const end = compactRouteSegment(endPoint)
  const viaStops = (Array.isArray(stops) ? stops : [])
    .map(compactRouteSegment)
    .filter(Boolean)
  const segments = [start, ...viaStops, end].filter(Boolean)
  return segments.join('-')
}

export function isSchedulableRoute(route) {
  return route?.status === 'active' || route?.status === 'assigned' || !route?.status
}

export function formatRouteStopsLabel(stops) {
  if (!stops?.length) return ''
  return stops.join(', ')
}

export function formatRouteStatus(status) {
  return STATUS_LABELS[status] || status || '—'
}

export function getRouteDeleteDisabledReason(route) {
  const count = Number(route?.scheduleCount) || 0
  if (count <= 0) return null
  return `Cannot delete — ${count} active trip${count !== 1 ? 's' : ''} linked to this route. Complete or remove those trips first.`
}

export function getRouteStatusChangeBlockedReason(route, nextStatus) {
  const current = route?.status || 'draft'
  if (!nextStatus || nextStatus === current) return null

  if ((current === 'active' || current === 'assigned') && nextStatus === 'draft') {
    return 'An active or assigned route cannot be moved back to draft. Set it to inactive to pause operations.'
  }

  if ((current === 'active' || current === 'assigned') && nextStatus === 'inactive') {
    const count = Number(route?.scheduleCount) || 0
    if (count > 0) {
      return `Cannot deactivate route while ${count} active trip${count !== 1 ? 's' : ''} are linked. Complete or remove those trips first.`
    }
  }

  return null
}

export function routeStatusClass(status) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'assigned':
      return 'bg-blue-100 text-blue-800'
    case 'draft':
      return 'bg-amber-100 text-amber-800'
    case 'inactive':
      return 'bg-neutral-200 text-neutral-700'
    default:
      return 'bg-surface-container-low text-on-surface-variant'
  }
}
