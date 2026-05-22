import {
  busUnassignableReason,
  defaultMinCapacityForService,
  driverAvailabilityLabel,
  formatServiceType,
  isBusAssignable,
  isDriverAssignable,
  isWithinWorkingHours,
} from '../../utils/fleetHelpers'

const selectClass =
  'mt-1 w-full rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900'
const labelClass = 'text-xs font-semibold uppercase tracking-wide text-on-surface-variant'

function RequirementChecklist({ title, items }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-white p-3">
      <p className={`${labelClass} mb-2`}>{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                item.ok === null
                  ? 'bg-neutral-200 text-neutral-500'
                  : item.ok
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-700'
              }`}
              aria-hidden
            >
              {item.ok === null ? '·' : item.ok ? '✓' : '✗'}
            </span>
            <span className={item.ok === false ? 'text-red-700' : 'text-neutral-700'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function busRequirementItems(bus, serviceType, minCapacity) {
  if (!bus) {
    return [
      { label: 'Status: available', ok: null },
      { label: `Service type: ${formatServiceType(serviceType)}`, ok: null },
      { label: `Minimum capacity: ${minCapacity} seats`, ok: null },
    ]
  }
  return [
    {
      label: `Status: available (current: ${formatServiceType(bus.status)})`,
      ok: bus.status === 'available',
    },
    {
      label: `Service type: ${formatServiceType(serviceType)} (bus: ${formatServiceType(bus.serviceType)})`,
      ok: !bus.serviceType || bus.serviceType === serviceType,
    },
    {
      label: `Minimum capacity: ${minCapacity} seats (bus: ${bus.capacity})`,
      ok: Number(bus.capacity) >= minCapacity,
    },
  ]
}

function driverRequirementItems(driver) {
  if (!driver) {
    return [
      { label: 'Status: available', ok: null },
      { label: 'Within working hours', ok: null },
    ]
  }
  const statusOk = !driver.status || driver.status === 'available'
  return [
    {
      label: `Status: available (current: ${formatServiceType(driver.status || 'available')})`,
      ok: statusOk,
    },
    {
      label: `Within working hours (${driver.workingHours || 'not set'})`,
      ok: statusOk && isWithinWorkingHours(driver.workingHours),
    },
  ]
}

function RouteFleetAssignment({
  serviceType,
  busId,
  driverId,
  buses = [],
  drivers = [],
  onBusChange,
  onDriverChange,
  selectedBus,
  selectedDriver,
}) {
  const minCapacity = defaultMinCapacityForService(serviceType)

  const busEligible = buses.filter((b) => isBusAssignable(b, serviceType, minCapacity))
  const driverEligible = drivers.filter((d) => isDriverAssignable(d))

  const currentBusInList =
    selectedBus && !busEligible.some((b) => b._id === selectedBus._id)
  const currentDriverInList =
    selectedDriver && !driverEligible.some((d) => d._id === selectedDriver._id)

  const assignmentReady =
    busId &&
    driverId &&
    selectedBus &&
    selectedDriver &&
    isBusAssignable(selectedBus, serviceType, minCapacity) &&
    isDriverAssignable(selectedDriver)

  const busChecks = busRequirementItems(selectedBus, serviceType, minCapacity)
  const driverChecks = driverRequirementItems(selectedDriver)

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <span className={labelClass}>Fleet assignment</span>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RequirementChecklist title="Bus requirements" items={busChecks} />
        <RequirementChecklist title="Driver requirements" items={driverChecks} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Bus</span>
          <select
            value={busId}
            onChange={(e) => onBusChange(e.target.value)}
            className={selectClass}
          >
            <option value="">No bus assigned</option>
            {currentBusInList && (
              <option value={selectedBus._id}>
                {selectedBus.regNumber} (current — may not meet rules)
              </option>
            )}
            {busEligible.map((b) => (
              <option key={b._id} value={b._id}>
                {b.regNumber} · {b.capacity} seats · {formatServiceType(b.serviceType)}
              </option>
            ))}
          </select>
          {selectedBus && !isBusAssignable(selectedBus, serviceType, minCapacity) && (
            <p className="mt-1 text-xs text-red-600">
              {busUnassignableReason(selectedBus, serviceType, minCapacity)}
            </p>
          )}
        </label>

        <label className="block">
          <span className={labelClass}>Driver</span>
          <select
            value={driverId}
            onChange={(e) => onDriverChange(e.target.value)}
            className={selectClass}
          >
            <option value="">No driver assigned</option>
            {currentDriverInList && (
              <option value={selectedDriver._id}>
                {selectedDriver.name} (current — may not meet rules)
              </option>
            )}
            {driverEligible.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} · {driverAvailabilityLabel(d)}
              </option>
            ))}
          </select>
          {selectedDriver && !isDriverAssignable(selectedDriver) && (
            <p className="mt-1 text-xs text-red-600">{driverAvailabilityLabel(selectedDriver)}</p>
          )}
        </label>
      </div>

      <p className="mt-3 text-xs text-on-surface-variant">
        {busEligible.length} bus(es) and {driverEligible.length} driver(s) meet all requirements
        for this route.
      </p>

      {busId && driverId && (
        <p
          className={`mt-3 text-xs font-semibold ${assignmentReady ? 'text-green-700' : 'text-red-600'}`}
        >
          {assignmentReady
            ? 'Assignment meets availability, capacity, and service type rules.'
            : 'Selected bus or driver does not meet all requirements.'}
        </p>
      )}
    </div>
  )
}

export default RouteFleetAssignment
