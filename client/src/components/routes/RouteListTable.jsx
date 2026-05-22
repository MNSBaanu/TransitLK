import Icon from '../Icon'
import { formatServiceType } from '../../utils/fleetHelpers'
import { formatRouteStatus, routeStatusClass } from '../../utils/routeHelpers'
import { ModuleSearchInput, ModuleTable } from '../layout/ModuleLayout'

function routeCode(route) {
  if (!route?._id) return '—'
  return route._id.slice(-6).toUpperCase()
}

function RouteListTable({ routes, loading, search, onSearchChange, onEdit, onDelete }) {
  return (
    <>
      <ModuleSearchInput
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search routes, stops..."
      />
      <ModuleTable>
        <thead className="bg-surface-container text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          <tr>
            {['ID', 'Route', 'Service', 'Distance', 'Stops', 'Status', ''].map((h) => (
              <th key={h || 'actions'} className="px-4 py-3 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant bg-white">
          {loading ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                Loading routes...
              </td>
            </tr>
          ) : routes.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-on-surface-variant">
                No routes found. Add a route to get started.
              </td>
            </tr>
          ) : (
            routes.map((route) => (
              <tr
                key={route._id}
                className="transition-colors hover:bg-surface-container-low"
              >
                <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums text-neutral-700">
                  {routeCode(route)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-neutral-900">{route.routeName}</p>
                  <p className="text-xs text-on-surface-variant">
                    {route.startPoint} → {route.endPoint}
                  </p>
                </td>
                <td className="px-4 py-3 capitalize text-on-surface-variant">
                  {formatServiceType(route.serviceType)}
                </td>
                <td className="px-4 py-3 tabular-nums text-neutral-700">{route.distance} km</td>
                <td className="px-4 py-3 tabular-nums">{route.stops?.length ?? 0}</td>
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
    </>
  )
}

export default RouteListTable
