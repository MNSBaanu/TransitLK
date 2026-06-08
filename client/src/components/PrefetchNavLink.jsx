import { NavLink } from 'react-router-dom'
import { isPrefetchablePath, prefetchPageData } from '../services/pagePrefetch'

function PrefetchNavLink({
  to,
  replace,
  state,
  target,
  onClick,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}) {
  const targetPath = typeof to === 'string' ? to : to?.pathname
  const canPrefetch = isPrefetchablePath(targetPath)

  const triggerPrefetch = () => {
    if (!canPrefetch) return
    prefetchPageData(targetPath)
  }

  const handleClick = (event) => {
    onClick?.(event)
    if (!event.defaultPrevented && canPrefetch) {
      prefetchPageData(targetPath)
    }
  }

  return (
    <NavLink
      {...props}
      to={to}
      replace={replace}
      state={state}
      target={target}
      onClick={handleClick}
      onMouseEnter={(event) => {
        onMouseEnter?.(event)
        if (!event.defaultPrevented) triggerPrefetch()
      }}
      onFocus={(event) => {
        onFocus?.(event)
        if (!event.defaultPrevented) triggerPrefetch()
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event)
        if (!event.defaultPrevented) triggerPrefetch()
      }}
    />
  )
}

export default PrefetchNavLink
