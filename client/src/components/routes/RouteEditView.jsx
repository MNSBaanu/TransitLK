import Icon from '../Icon'
import RouteMap from '../RouteMap'
import { ModuleCard } from '../layout/ModuleLayout'
import {
  formatServiceType,
  driverAvailabilityLabel,
  isDriverAssignable,
} from '../../utils/fleetHelpers'

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
  onAddStop,
  onRemoveStop,
  onMapUpdate,
  onSave,
  onCancel,
  saving,
  selectedBus,
  selectedDriver,
  availableBuses,
  availableDrivers,
  assignmentReady,
  showBusPicker,
  setShowBusPicker,
  showDriverPicker,
  setShowDriverPicker,
}) {
  const estFuel = form.distance ? `${(Number(form.distance) * 0.1).toFixed(1)} L` : '—'

  return (
    <form onSubmit={onSave}>
      <div className="grid gap-5 lg:grid-cols-2">
        <ModuleCard className="p-5">
          <h3 className="mb-4 text-base font-semibold text-neutral-900">Route configuration</h3>
          <div className="space-y-4">
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
                <input name="startPoint" value={form.startPoint} onChange={onFormChange} required className={inputClass} />
              </label>
              <label className="block">
                <span className={labelClass}>End point</span>
                <input name="endPoint" value={form.endPoint} onChange={onFormChange} required className={inputClass} />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={labelClass}>Stops ({form.stops.length})</span>
                <button type="button" onClick={onAddStop} className="text-sm font-semibold text-neutral-900 hover:underline">
                  + Add stop
                </button>
              </div>
              <input
                value={stopInput}
                onChange={(e) => onStopInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddStop())}
                className="mb-2 w-full rounded-lg border border-outline-variant px-3 py-2 text-sm"
                placeholder="Stop name"
              />
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {form.stops.map((stop, i) => (
                  <li key={`${stop}-${i}`} className="flex items-center justify-between rounded-lg bg-surface-container-low px-2 py-1.5 text-sm">
                    <span>{stop}</span>
                    <button type="button" onClick={() => onRemoveStop(i)} className="text-red-600">
                      <Icon name="close" size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <span className={labelClass}>Assignment</span>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {selectedBus ? selectedBus.regNumber : 'No bus'}
                    </p>
                    {selectedBus && (
                      <p className="text-xs text-on-surface-variant">
                        {selectedBus.capacity} seats · {formatServiceType(selectedBus.serviceType)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBusPicker((v) => !v)}
                    className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-semibold"
                  >
                    Change
                  </button>
                </div>
                {showBusPicker && (
                  <select name="busId" value={form.busId} onChange={onFormChange} className={inputClass}>
                    <option value="">Select bus</option>
                    {availableBuses.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.regNumber} · {b.capacity} seats
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-outline-variant pt-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {selectedDriver ? selectedDriver.name : 'No driver'}
                    </p>
                    {selectedDriver && (
                      <p className="text-xs text-on-surface-variant">
                        {driverAvailabilityLabel(selectedDriver)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDriverPicker((v) => !v)}
                    className="rounded-lg border border-outline-variant px-2 py-1 text-xs font-semibold"
                  >
                    Change
                  </button>
                </div>
                {showDriverPicker && (
                  <select name="driverId" value={form.driverId} onChange={onFormChange} className={inputClass}>
                    <option value="">Select driver</option>
                    {availableDrivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                {form.busId && form.driverId && (
                  <p
                    className={`text-xs font-semibold ${assignmentReady ? 'text-green-700' : 'text-red-600'}`}
                  >
                    {assignmentReady
                      ? 'Assignment meets availability rules'
                      : 'Bus or driver does not meet rules'}
                  </p>
                )}
              </div>
            </div>
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
                <p className={labelClass}>Route ID</p>
                <p className="font-bold tabular-nums">{isEditing ? routeCode : 'NEW'}</p>
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
                <p className={labelClass}>Est. fuel</p>
                <p className="font-bold text-neutral-700">{estFuel}</p>
              </div>
            </div>
          </div>
        </ModuleCard>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-semibold hover:bg-surface-container"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-[2] rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save route'}
        </button>
      </div>
    </form>
  )
}

export default RouteEditView
