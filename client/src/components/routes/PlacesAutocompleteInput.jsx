import { useEffect, useRef, useState } from 'react'
import { loadGoogleMapsScript } from '../../utils/googleMapsLoader'

/**
 * Text input with Google Places Autocomplete.
 * onPlaceSelect: ({ label, location: { lat, lng, address } })
 */
function PlacesAutocompleteInput({
  name,
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  required = false,
  className = '',
  disabled = false,
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const onChangeRef = useRef(onChange)
  const [ready, setReady] = useState(false)
  const [hint, setHint] = useState('')

  onPlaceSelectRef.current = onPlaceSelect
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false
    loadGoogleMapsScript()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setHint(err.message || 'Maps unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !inputRef.current || !window.google?.maps?.places) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'lk' },
      fields: ['formatted_address', 'geometry', 'name'],
    })
    autocompleteRef.current = autocomplete

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      const loc = place?.geometry?.location
      if (!loc) return

      const label =
        place.formatted_address || place.name || inputRef.current?.value || ''
      const location = {
        lat: loc.lat(),
        lng: loc.lng(),
        address: label,
      }

      onChangeRef.current?.({
        target: { name, value: label },
      })
      onPlaceSelectRef.current?.({ label, location })
    })

    return () => {
      if (listener) window.google.maps.event.removeListener(listener)
      autocompleteRef.current = null
    }
  }, [ready, name])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {hint ? (
        <p className="mt-0.5 text-[10px] text-on-surface-variant">{hint}</p>
      ) : null}
    </div>
  )
}

export default PlacesAutocompleteInput
