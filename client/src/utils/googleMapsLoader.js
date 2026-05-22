const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let loadPromise = null

export function getGoogleMapsApiKey() {
  return MAPS_KEY
}

/** Load Maps JS API once (with Places library). */
export function loadGoogleMapsScript() {
  if (!MAPS_KEY) {
    return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'))
  }

  if (window.google?.maps?.places) {
    return Promise.resolve()
  }

  if (loadPromise) return loadPromise

  const existing = document.querySelector('script[data-google-maps]')
  if (existing) {
    loadPromise = new Promise((resolve, reject) => {
      if (window.google?.maps) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
    })
    return loadPromise
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return loadPromise
}
