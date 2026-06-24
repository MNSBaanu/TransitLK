import { useCallback, useEffect, useMemo, useRef } from 'react'
import { clampDepartureTime, currentTimeHHmm } from '../../utils/scheduleHelpers'

/**
 * Native `<input type="time">`.
 * When minTime is set (trip includes today), min is locked to the live clock
 * so the picker only offers now and later.
 */
function ScheduleTimeInput({
  value,
  onChange,
  minTime = null,
  disabled = false,
  required = false,
  className = '',
  name,
  id,
  'data-field': dataField,
  'data-focus-priority': dataFocusPriority,
}) {
  const inputRef = useRef(null)
  const locked = Boolean(minTime)
  const liveMin = locked ? currentTimeHHmm() : null

  const displayValue = useMemo(
    () => (liveMin ? clampDepartureTime(value, liveMin) : value),
    [value, liveMin]
  )

  const applyLiveMin = useCallback(() => {
    if (!locked || !inputRef.current) return
    const now = currentTimeHHmm()
    inputRef.current.min = now
  }, [locked])

  useEffect(() => {
    if (!locked) return undefined
    applyLiveMin()
    const id = window.setInterval(applyLiveMin, 30_000)
    return () => window.clearInterval(id)
  }, [locked, applyLiveMin])

  useEffect(() => {
    if (!liveMin || !value || displayValue === value) return
    onChange(displayValue)
  }, [liveMin, value, displayValue, onChange])

  const commit = (next) => {
    if (liveMin) {
      onChange(clampDepartureTime(next, currentTimeHHmm()))
    } else {
      onChange(next)
    }
  }

  return (
    <input
      ref={inputRef}
      type="time"
      name={name}
      id={id}
      value={displayValue || ''}
      min={liveMin || undefined}
      onFocus={applyLiveMin}
      onClick={applyLiveMin}
      onChange={(e) => commit(e.target.value)}
      onInput={(e) => commit(e.target.value)}
      disabled={disabled}
      required={required}
      data-field={dataField}
      data-focus-priority={dataFocusPriority}
      className={className}
    />
  )
}

export default ScheduleTimeInput
