import { createContext, useContext, useMemo, useState } from 'react'

const LayoutContext = createContext(null)

export function LayoutProvider({ children }) {
  const [routeSearch, setRouteSearch] = useState('')
  const [scheduleSearch, setScheduleSearch] = useState('')

  const value = useMemo(
    () => ({
      routeSearch,
      setRouteSearch,
      scheduleSearch,
      setScheduleSearch,
    }),
    [routeSearch, scheduleSearch]
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const ctx = useContext(LayoutContext)
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return ctx
}
