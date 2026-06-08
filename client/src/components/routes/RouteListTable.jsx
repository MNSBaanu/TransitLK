import Icon from '../Icon'
import { formatServiceType } from '../../utils/fleetHelpers'
import { formatRouteStatus, routeStatusClass } from '../../utils/routeHelpers'
import { ModuleSearchInput, ModuleSecondaryButton, ModuleTable } from '../layout/ModuleLayout'

function routeCode(route) {
  if (route?.routeNo) return route.routeNo
  if (!route?._id) return '—'
  return route._id.slice(-6).toUpperCase()
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
]

const SERVICE_FILTER_OPTIONS = [
  { value: '', label: 'All services' },
  { value: 'ordinary', label: 'Ordinary' },
  { value: 'express', label: 'Express' },
  { value: 'semi-luxury', label: 'Semi Luxury' },
]

function RouteListTable({
  routes,
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  serviceTypeFilter,
  onServiceTypeFilterChange,
  pagination,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onAssignFleet,
  onDelete,
}) {
  const startItem = routes.length === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const endItem = routes.length === 0 ? 0 : startItem + routes.length - 1

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ModuleSearchInput
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search route no, name, stops..."
          className="min-w-[240px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value || 'all-status'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={serviceTypeFilter}
          onChange={(e) => onServiceTypeFilterChange(e.target.value)}
          aria-label="Filter by service type"
          className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          {SERVICE_FILTER_OPTIONS.map((option) => (
            <option key={option.value || 'all-service'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="ml-auto flex items-center gap-2 text-sm text-on-surface-variant">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>
        </label>
      </div>
      <ModuleTable>
        <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          <tr>
            {['Route No', 'Route', 'Stops', 'Service', 'Distance', 'Bus', 'Driver', 'Status', ''].map((h) => (
              <th key={h || 'actions'} className="px-4 py-3 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant bg-white">
          {loading ? (
            <tr>
              <td colSpan={9} className="py-10 text-center text-on-surface-variant">
                Loading routes...
              </td>
            </tr>
          ) : routes.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-10 text-center text-on-surface-variant">
                No routes found. Add a route to get started.
              </td>
            </tr>
          ) : (
            routes.map((route) => (
              <tr key={route._id} className="transition-colors hover:bg-surface-container-low">
                <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums text-neutral-700">
                  {routeCode(route)}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onView(route)}
                    className="text-left hover:opacity-90"
                  >
                    <p className="font-semibold text-neutral-900 hover:underline">
                      {route.routeName}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {route.startPoint} → {route.endPoint}
                    </p>
                  </button>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {route.stops?.length ? route.stops.join(', ') : route.viaDescription || '—'}
                </td>
                <td className="px-4 py-3 capitalize text-on-surface-variant">
                  {formatServiceType(route.serviceType)}
                </td>
                <td className="px-4 py-3 tabular-nums text-neutral-700">{route.distance} km</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onAssignFleet(route)}
                    className="cursor-pointer text-left text-sm font-medium text-blue-800 hover:underline"
                  >
                    {route.busId?.regNumber || (
                      <span className="text-on-surface-variant">Set bus</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onAssignFleet(route)}
                    className="cursor-pointer text-left text-sm font-medium text-blue-800 hover:underline"
                  >
                    {route.driverId?.name || (
                      <span className="text-on-surface-variant">Set driver</span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${routeStatusClass(route.status)}`}
                  >
                    {formatRouteStatus(route.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onView(route)}
                      className="rounded-lg p-2 text-neutral-700 hover:bg-surface-container"
                      title="View route"
                    >
                      <Icon name="visibility" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(route)}
                      className="rounded-lg p-2 text-neutral-700 hover:bg-surface-container"
                      title="Edit"
                    >
                      <Icon name="edit" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(route._id)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      title="Delete"
                    >
                      <Icon name="delete" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </ModuleTable>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          Showing {startItem}-{endItem} of {pagination.totalItems}
        </p>
        <div className="flex items-center gap-2">
          <ModuleSecondaryButton
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPreviousPage || loading}
            icon="chevron_left"
          >
            Previous
          </ModuleSecondaryButton>
          <span className="px-2 text-sm font-medium text-neutral-700">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <ModuleSecondaryButton
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNextPage || loading}
            icon="chevron_right"
          >
            Next
          </ModuleSecondaryButton>
        </div>
      </div>
    </>
  )
}

export default RouteListTable
