const STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
  draft: 'Draft',
  assigned: 'Assigned',
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
