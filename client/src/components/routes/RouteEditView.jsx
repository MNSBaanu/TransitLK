import Icon from '../Icon'
import RouteMap from '../RouteMap'
import PlacesAutocompleteInput from './PlacesAutocompleteInput'
import { ModuleCard } from '../layout/ModuleLayout'
import { formatRouteStatus } from '../../utils/routeHelpers'
import RouteFleetAssignment from './RouteFleetAssignment'

const inputClass =
  'mt-1 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-on-surface-variant'

function RouteEditView({
  form,
  isEditing,
  routeCode,
  stopInput,
  onStopInputChange,
  onFormChange,
  onBusChange,
  onDriverChange,
  buses,
  drivers,
  selectedBus,
  selectedDriver,
  onStopPlaceSelect,
  onStartPlaceSelect,
  onEndPlaceSelect,
  onRemoveStop,
  onMapUpdate,
  onSave,
  onCancel,
  saving,
}) {
  return (
    <form onSubmit={onSave}>
      <div className="grid gap-5 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <h3 className="mb-4 text-base font-semibold text-neutral-900">Route configuration</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Route No</span>
                <input
                  name="routeNo"
                  value={form.routeNo}
                  onChange={onFormChange}
                  required
                  className={`${inputClass} font-mono tabular-nums`}
                  placeholder="8 / 593 / 636/1"
                />
              </label>
              <label className="block">
                <span className={labelClass}>Route status</span>
                <select name="status" value={form.status} onChange={onFormChange} className={inputClass}>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className={labelClass}>Route name</span>
              <input
                name="routeName"
                value={form.routeName}
                onChange={onFormChange}
                required
                className={inputClass}
                placeholder="Colombo — Kandy"
              />
            </label>
            <label className="block">
              <span className={labelClass}>Via</span>
              <input
                name="viaDescription"
                value={form.viaDescription}
                onChange={onFormChange}
                className={inputClass}
                placeholder="via Warakamura"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Service type</span>
                <select name="serviceType" value={form.serviceType} onChange={onFormChange} className={inputClass}>
                  <option value="ordinary">Ordinary</option>
                  <option value="express">Express</option>
                  <option value="semi-luxury">Semi-luxury</option>
                </select>
              </label>
              <label className="block">
                <span className={labelClass}>Distance (km)</span>
                <input
                  name="distance"
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.distance}
                  onChange={onFormChange}
                  required
                  className={`${inputClass} tabular-nums`}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass}>Start point</span>
                <PlacesAutocompleteInput
                  name="startPoint"
                  value={form.startPoint}
                  onChange={onFormChange}
                  onPlaceSelect={onStartPlaceSelect}
                  required
                  className={inputClass}
                  placeholder="Search start location…"
                />
              </label>
              <label className="block">
                <span className={labelClass}>End point</span>
                <PlacesAutocompleteInput
                  name="endPoint"
                  value={form.endPoint}
                  onChange={onFormChange}
                  onPlaceSelect={onEndPlaceSelect}
                  required
                  className={inputClass}
                  placeholder="Search end location…"
                />
              </label>
            </div>

            <div>
              <span className={labelClass}>Stops ({form.stops.length})</span>
              <p className="mt-0.5 text-xs text-on-surface-variant">
                Pick a location from suggestions to add a stop.
              </p>
              <PlacesAutocompleteInput
                name="stopInput"
                value={stopInput}
                onChange={(e) => onStopInputChange(e.target.value)}
                onPlaceSelect={onStopPlaceSelect}
                className={`${inputClass} mt-2`}
                placeholder="Search stop location…"
              />
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {form.stops.map((stop, i) => (
                  <li
                    key={`${stop}-${i}`}
                    className="flex items-center justify-between rounded-lg bg-surface-container-low px-2 py-1.5 text-sm"
                  >
                    <span>{stop}</span>
                    <button type="button" onClick={() => onRemoveStop(i)} className="text-red-600">
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {isEditing && (
              <RouteFleetAssignment
                serviceType={form.serviceType}
                busId={form.busId}
                driverId={form.driverId}
                buses={buses}
                drivers={drivers}
                selectedBus={selectedBus}
                selectedDriver={selectedDriver}
                onBusChange={onBusChange}
                onDriverChange={onDriverChange}
              />
            )}
          </div>
        </ModuleCard>

        <ModuleCard className="relative min-h-[420px] overflow-hidden p-0">
          <div className="absolute inset-0">
            <RouteMap
              startPoint={form.startPoint}
              endPoint={form.endPoint}
              stops={form.stops}
              startLocation={form.startLocation}
              endLocation={form.endLocation}
              stopLocations={form.stopLocations}
              onRouteComputed={onMapUpdate}
            />
          </div>
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="flex flex-wrap gap-4 rounded-xl border border-outline-variant bg-white/95 p-3 text-sm shadow-md backdrop-blur">
              <div>
                <p className={labelClass}>Route No</p>
                <p className="font-bold font-mono tabular-nums">{routeCode}</p>
              </div>
              <div>
                <p className={labelClass}>Status</p>
                <p className="font-bold capitalize">{formatRouteStatus(form.status)}</p>
              </div>
              <div>
                <p className={labelClass}>Distance</p>
                <p className="font-bold">{form.distance ? `${form.distance} km` : '—'}</p>
              </div>
              <div>
                <p className={labelClass}>Stops</p>
                <p className="font-bold">{form.stops.length}</p>
              </div>
              {isEditing && (
                <>
                  <div>
                    <p className={labelClass}>Bus</p>
                    <p className="font-bold text-sm">
                      {selectedBus?.regNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <p className={labelClass}>Driver</p>
                    <p className="font-bold text-sm">
                      {selectedDriver?.name || '—'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </ModuleCard>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-w-[7.5rem] rounded-xl border border-outline-variant px-5 py-2.5 text-sm font-semibold hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="min-w-[9rem] rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save route'}
        </button>
      </div>
    </form>
  )
}

export default RouteEditView
