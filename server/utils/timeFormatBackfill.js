import Driver from '../models/Driver.js'
import Schedule from '../models/Schedule.js'
import { normalizeTime, normalizeWorkingHours } from './timeFormat.js'

/** Normalize existing schedule and driver time strings to HH:mm storage format. */
export async function backfillTimeFormats() {
  let scheduleUpdates = 0
  let driverUpdates = 0

  const schedules = await Schedule.find({}).select('departureTime arrivalTime').lean()
  for (const schedule of schedules) {
    const departureTime = normalizeTime(schedule.departureTime)
    const arrivalTime = normalizeTime(schedule.arrivalTime)
    if (
      !departureTime ||
      !arrivalTime ||
      (departureTime === schedule.departureTime && arrivalTime === schedule.arrivalTime)
    ) {
      continue
    }
    await Schedule.updateOne(
      { _id: schedule._id },
      { $set: { departureTime, arrivalTime } }
    )
    scheduleUpdates++
  }

  const drivers = await Driver.find({ workingHours: { $exists: true, $ne: '' } })
    .select('workingHours')
    .lean()
  for (const driver of drivers) {
    const workingHours = normalizeWorkingHours(driver.workingHours)
    if (!workingHours || workingHours === driver.workingHours) continue
    await Driver.updateOne({ _id: driver._id }, { $set: { workingHours } })
    driverUpdates++
  }

  if (scheduleUpdates || driverUpdates) {
    console.log(
      `Time format backfill: ${scheduleUpdates} schedule(s), ${driverUpdates} driver(s)`
    )
  }

  return { scheduleUpdates, driverUpdates }
}
