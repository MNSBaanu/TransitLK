import RouteMap from '../RouteMap'
import { ModuleCard } from '../layout/ModuleLayout'
import { formatRouteStatus, routeStatusClass } from '../../utils/routeHelpers'
import { formatServiceType, driverAvailabilityLabel } from '../../utils/fleetHelpers'
import RouteFleetAssignment from './RouteFleetAssignment'

const labelClass = 'text-xs font-semibold uppercase tracking-wide text-on-surface-variant'

function ReadOnlyField({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className={labelClass}>{label}</p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value || '—'}</p>
    </div>
  )
}

function RouteView({
  form,
  routeCode,
  selectedBus,
  selectedDriver,
  buses,
  drivers,
  onEdit,
  onBack,
}) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-w-[7.5rem] rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold hover:bg-surface-container"
        >
          Back to list
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="min-w-[9rem] rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          Edit route
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-neutral-900">Route details</h3>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-800">
              Preview
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Route No" value={routeCode} className="font-mono tabular-nums" />
              <div>
                <p className={labelClass}>Route status</p>
                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${routeStatusClass(form.status)}`}
                >
                  {formatRouteStatus(form.status)}
                </span>
              </div>
            </div>

            <ReadOnlyField label="Route name" value={form.routeName} />

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Service type" value={formatServiceType(form.serviceType)} />
              <ReadOnlyField
                label="Distance"
                value={form.distance ? `${form.distance} km` : '—'}
                className="tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ReadOnlyField label="Start point" value={form.startPoint} />
              <ReadOnlyField label="End point" value={form.endPoint} />
            </div>

            <div>
              <p className={labelClass}>Stops ({form.stops.length})</p>
              {form.stops.length === 0 ? (
                <p className="mt-1 text-sm text-on-surface-variant">No stops on this route.</p>
              ) : (
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                  {form.stops.map((stop, i) => (
                    <li
                      key={`${stop}-${i}`}
                      className="rounded-lg bg-surface-container-low px-3 py-2 text-sm text-neutral-800"
                    >
                      {i + 1}. {stop}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-outline-variant pt-4">
              <ReadOnlyField
                label="Assigned bus"
                value={
                  selectedBus
                    ? `${selectedBus.regNumber} · ${selectedBus.capacity} seats`
                    : 'Not assigned'
                }
              />
              <ReadOnlyField
                label="Assigned driver"
                value={
                  selectedDriver
                    ? `${selectedDriver.name} · ${driverAvailabilityLabel(selectedDriver)}`
                    : 'Not assigned'
                }
              />
            </div>

            <RouteFleetAssignment
              readOnly
              serviceType={form.serviceType}
              busId={form.busId}
              driverId={form.driverId}
              buses={buses}
              drivers={drivers}
              selectedBus={selectedBus}
              selectedDriver={selectedDriver}
              onBusChange={() => {}}
              onDriverChange={() => {}}
            />
          </div>
        </ModuleCard>

        <ModuleCard className="relative min-h-[420px] overflow-hidden p-0">
          <div className="absolute inset-0 pointer-events-auto">
            <RouteMap
              startPoint={form.startPoint}
              endPoint={form.endPoint}
              stops={form.stops}
              startLocation={form.startLocation}
              endLocation={form.endLocation}
              stopLocations={form.stopLocations}
            />
          </div>
          <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant shadow-sm">
            Map preview
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex flex-wrap gap-4 rounded-xl border border-outline-variant bg-white/95 p-3 text-sm shadow-md backdrop-blur">
              <div>
                <p className={labelClass}>Route No</p>
                <p className="font-bold font-mono tabular-nums">{routeCode}</p>
              </div>
              <div>
                <p className={labelClass}>Status</p>
                <p className="font-bold">{formatRouteStatus(form.status)}</p>
              </div>
              <div>
                <p className={labelClass}>Distance</p>
                <p className="font-bold">{form.distance ? `${form.distance} km` : '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Stops</p>
                <p className="font-bold">{form.stops.length}</p>
              </div>
              <div>
                <p className={labelClass}>Bus</p>
                <p className="font-bold text-sm">{selectedBus?.regNumber || '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Driver</p>
                <p className="font-bold text-sm">{selectedDriver?.name || '—'}</p>
              </div>
            </div>
          </div>
        </ModuleCard>
      </div>
    </div>
  )
}

export default RouteView
