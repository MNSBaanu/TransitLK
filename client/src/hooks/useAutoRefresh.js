import { useEffect } from 'react'

export const AUTO_REFRESH_MS = 30_000

/** Polls `callback` on an interval; skips when disabled (e.g. modal open). */
export function useAutoRefresh(callback, { enabled = true, intervalMs = AUTO_REFRESH_MS } = {}) {
  useEffect(() => {
    if (!enabled) return undefined
    const id = window.setInterval(() => {
      callback()
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [callback, enabled, intervalMs])
}
