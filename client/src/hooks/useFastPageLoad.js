import { useCallback, useEffect, useRef, useState } from 'react'
import { useAutoRefresh } from './useAutoRefresh'
import { getCachedPageData, getStalePageData, loadPageData } from '../services/pagePrefetch'

/** Instant stale cache + background refresh + optional auto-poll for prefetchable pages. */
export function useFastPageLoad(path, { applyData, options = {}, refreshEnabled = true, forceRefresh = false } = {}) {
  const optionsRef = useRef(options)
  optionsRef.current = options

  const [loading, setLoading] = useState(() => !getStalePageData(path, options))
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async ({ keepContent = false, force = false } = {}) => {
      const loadOptions = optionsRef.current

      if (!force) {
        const cached = getCachedPageData(path, loadOptions)
        if (cached) {
          applyData(cached)
          setLoading(false)
          return
        }
      }

      if (keepContent) setRefreshing(true)
      else if (!getStalePageData(path, loadOptions)) setLoading(true)

      try {
        const data = await loadPageData(path, loadOptions, { force })
        if (data) applyData(data)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [path, applyData]
  )

  useEffect(() => {
    const loadOptions = optionsRef.current
    const stale = getStalePageData(path, loadOptions)
    if (stale) applyData(stale)
    load({ keepContent: Boolean(stale), force: forceRefresh })
  }, [path, load, applyData, forceRefresh])

  useAutoRefresh(() => load({ keepContent: true, force: true }), { enabled: refreshEnabled })

  return { loading, refreshing, reload: load }
}
