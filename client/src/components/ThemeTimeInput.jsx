const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function splitTime(value) {
  if (!value?.trim()) return ['', '']
  const [h = '', m = ''] = value.split(':')
  return [h.padStart(2, '0'), m.padStart(2, '0')]
}

function combineTime(hour, minute) {
  if (!hour) return ''
  return `${hour}:${minute || '00'}`
}

export default function ThemeTimeInput({
  name,
  value = '',
  onChange,
  placeholder = '00:00',
  hasError = false,
  disabled = false,
  className = '',
}) {
  const [placeholderHour, placeholderMinute] = splitTime(placeholder)
  const [hour, minute] = splitTime(value)

  const emitChange = (nextHour, nextMinute) => {
    onChange({
      target: {
        name,
        value: combineTime(nextHour, nextMinute),
      },
    })
  }

  const handleHour = (e) => {
    const nextHour = e.target.value
    emitChange(nextHour, nextHour ? minute || '00' : '')
  }

  const handleMinute = (e) => {
    const nextMinute = e.target.value
    if (!hour) return
    emitChange(hour, nextMinute)
  }

  const selectClass = [
    'theme-time-input__select',
    hasError ? 'theme-time-input__select--error' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={`theme-time-input ${className}`.trim()}>
      <select
        name={`${name}-hour`}
        value={hour}
        onChange={handleHour}
        disabled={disabled}
        aria-label={`${name} hour`}
        className={`${selectClass} ${!hour ? 'theme-time-input__select--placeholder' : ''}`}
      >
        <option value="">{placeholderHour}</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="theme-time-input__sep" aria-hidden>
        :
      </span>
      <select
        name={`${name}-minute`}
        value={minute}
        onChange={handleMinute}
        disabled={disabled || !hour}
        aria-label={`${name} minute`}
        className={`${selectClass} ${!minute ? 'theme-time-input__select--placeholder' : ''}`}
      >
        <option value="">{placeholderMinute}</option>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}
