/** Parse "HH:mm" to minutes from midnight */
export function timeToMinutes(time) {
  if (!time?.trim()) return null
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** True if two time ranges on the same day overlap */
export function timesOverlap(depA, arrA, depB, arrB) {
  const startA = timeToMinutes(depA)
  const endA = timeToMinutes(arrA)
  const startB = timeToMinutes(depB)
  const endB = timeToMinutes(arrB)
  if ([startA, endA, startB, endB].some((v) => v == null)) return false
  return startA < endB && startB < endA
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}
