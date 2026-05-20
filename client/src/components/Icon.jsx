function Icon({ name, className = '', size = 22 }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden={true}
    >
      {name}
    </span>
  )
}

export default Icon
