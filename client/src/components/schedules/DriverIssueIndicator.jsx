import Icon from '../Icon'

function DriverIssueIndicator({ size = 14, className = '', title = 'Driver reported issue' }) {
  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-amber-400/90 text-amber-950 shadow-sm ${className}`}
      style={{ width: size + 6, height: size + 6 }}
    >
      <Icon name="report_problem" size={size} />
    </span>
  )
}

export default DriverIssueIndicator
