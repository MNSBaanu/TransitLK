import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { isPrefetchablePath, prefetchPageData } from '../services/pagePrefetch'

function isModifiedEvent(event) {
  return Boolean(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
}

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
  const navigate = useNavigate()
  const location = useLocation()
  const targetPath = typeof to === 'string' ? to : to?.pathname
  const canPrefetch = isPrefetchablePath(targetPath)

  const triggerPrefetch = () => {
    if (!canPrefetch) return
    prefetchPageData(targetPath)
  }

  const handleClick = async (event) => {
    onClick?.(event)

    if (
      event.defaultPrevented ||
      !canPrefetch ||
      event.button !== 0 ||
      isModifiedEvent(event) ||
      target === '_blank' ||
      targetPath === location.pathname
    ) {
      return
    }

    event.preventDefault()
    await prefetchPageData(targetPath)
    navigate(to, { replace, state })
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
