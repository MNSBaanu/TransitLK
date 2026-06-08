import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Depot from '../models/Depot.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'
import User from '../models/User.js'
import Schedule from '../models/Schedule.js'
import FuelLog from '../models/FuelLog.js'
import Maintenance from '../models/Maintenance.js'
import { normalizeTripDate } from '../utils/scheduleHelpers.js'

dotenv.config()

/** Calendar day at UTC noon (matches API storage) */
function tripDate(y, m, d) {
  return normalizeTripDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
}

function addDays(base, offset) {
  const d = new Date(base)
  d.setUTCDate(d.getUTCDate() + offset)
  return tripDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

const TIME_SLOTS = [
  { departureTime: '05:30', arrivalTime: '09:45' },
  { departureTime: '07:00', arrivalTime: '11:30' },
  { departureTime: '10:15', arrivalTime: '14:00' },
  { departureTime: '13:00', arrivalTime: '17:20' },
  { departureTime: '15:30', arrivalTime: '19:00' },
  { departureTime: '18:00', arrivalTime: '21:30' },
]

const STATUS_ROTATION = [
  'completed',
  'on-time',
  'completed',
  'delayed',
  'completed',
  'scheduled',
  'on-time',
  'cancelled',
  'completed',
  'approved',
  'pending',
  'draft',
]

async function resolveDepot() {
  return (
    (await Depot.findOne({ depotCode: 'ML' })) ||
    (await Depot.findOne({ depotCode: 'MTL' })) ||
    (await Depot.findOne())
  )
}

async function run() {
  await connectDB()

  const depot = await resolveDepot()
  if (!depot) throw new Error('No depot found. Run seedMataleDepot.js first.')

  const routes = await Route.find({ depotId: depot._id, status: 'active' })
    .sort({ routeNo: 1 })
    .limit(8)
  const buses = await Bus.find({ depotId: depot._id, status: { $ne: 'maintenance' } }).limit(4)
  const allBuses = await Bus.find({ depotId: depot._id })
  const drivers = await Driver.find({ depotId: depot._id, status: 'available' }).limit(4)

  if (!routes.length) {
    throw new Error('No active routes. Run: npm run seed:routes')
  }
  if (!buses.length || !drivers.length) {
    throw new Error('No buses/drivers. Run: npm run seed:fleet')
  }

  const approver =
    (await User.findOne({ role: 'depot_manager', depotId: depot._id })) ||
    (await User.findOne({ role: 'administrator' }))

  const anchor = tripDate(2026, 6, 5)
  const daysBack = 21
  const daysForward = 7

  const removed = await Schedule.deleteMany({
    routeId: { $in: routes.map((r) => r._id) },
    adjustmentNotes: 'seed-sample-data',
  })
  console.log(`Removed ${removed.deletedCount} previous sample schedule(s).`)

  const trips = []
  let statusIdx = 0

  for (let dayOffset = -daysBack; dayOffset <= daysForward; dayOffset += 1) {
    const date = addDays(anchor, dayOffset)
    const isPast = dayOffset < 0
    const isToday = dayOffset === 0

    routes.forEach((route, routeIdx) => {
      if (routeIdx >= TIME_SLOTS.length) return

      const slot = TIME_SLOTS[routeIdx]
      const bus = buses[routeIdx % buses.length]
      const driver = drivers[routeIdx % drivers.length]

      let status = STATUS_ROTATION[statusIdx % STATUS_ROTATION.length]
      statusIdx += 1

      if (isPast && ['draft', 'pending', 'approved', 'scheduled'].includes(status)) {
        status = status === 'scheduled' ? 'completed' : 'completed'
      }
      if (isToday && status === 'draft') status = 'scheduled'
      if (dayOffset > 2 && ['completed', 'cancelled', 'delayed'].includes(status)) {
        status = 'scheduled'
      }

      const doc = {
        routeId: route._id,
        busId: bus._id,
        driverId: driver._id,
        tripDate: date,
        departureTime: slot.departureTime,
        arrivalTime: slot.arrivalTime,
        status,
        adjustmentReason: 'normal',
        adjustmentNotes: 'seed-sample-data',
      }

      if (['pending', 'approved', 'scheduled', 'on-time', 'delayed', 'completed'].includes(status)) {
        doc.submittedAt = new Date(date.getTime() - 86400000)
      }
      if (['approved', 'scheduled', 'on-time', 'delayed', 'completed'].includes(status) && approver) {
        doc.approvedBy = approver._id
      }

      trips.push(doc)
    })
  }

  const roshan = await Driver.findOne({ email: 'roshan@transitlk.com' })
  if (roshan) {
    const roshanRoute = routes[0]
    const roshanBus = buses[0]
    for (let d = 0; d <= 6; d += 1) {
      const date = addDays(anchor, d)
      trips.push({
        routeId: roshanRoute._id,
        busId: roshanBus._id,
        driverId: roshan._id,
        tripDate: date,
        departureTime: '06:00',
        arrivalTime: '10:15',
        status: d < 2 ? 'completed' : d === 2 ? 'on-time' : 'scheduled',
        adjustmentReason: 'normal',
        adjustmentNotes: 'seed-sample-data',
        submittedAt: new Date(),
        ...(approver ? { approvedBy: approver._id } : {}),
      })
    }
  }

  const inserted = await Schedule.insertMany(trips)
  console.log(`Inserted ${inserted.length} sample trips (${daysBack + daysForward + 1} days).`)

  if (roshan) {
    const roshanTrips = inserted.filter((t) => String(t.driverId) === String(roshan._id))
    const visible = roshanTrips.filter((t) =>
      ['approved', 'scheduled', 'on-time', 'delayed', 'completed'].includes(t.status)
    )
    console.log(`Driver portal (roshan@transitlk.com): ${visible.length} visible trip(s).`)
  }

  const fuelBusIds = allBuses.slice(0, 4).map((b) => b._id)
  const fuelStart = addDays(anchor, -20)
  const fuelEnd = addDays(anchor, 3)
  const fuelRemoved = await FuelLog.deleteMany({
    bus_id: { $in: fuelBusIds },
    fuel_date: { $gte: fuelStart, $lte: fuelEnd },
  })
  console.log(`Removed ${fuelRemoved.deletedCount} fuel log(s) in sample window.`)

  const fuelEntries = []
  for (let i = 0; i < 24; i += 1) {
    const bus = allBuses[i % allBuses.length]
    const day = addDays(anchor, -20 + i)
    fuelEntries.push({
      bus_id: bus._id,
      fuel_date: day,
      liters: 85 + (i % 5) * 12,
      amount: 18500 + (i % 7) * 2200,
    })
  }

  await FuelLog.insertMany(fuelEntries)
  console.log(`Inserted ${fuelEntries.length} fuel log(s) for analytics.`)

  console.log('Maintenance sample data: run npm run seed:maintenance')

  const statusCounts = {}
  for (const t of inserted) {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
  }
  console.log('Trip status breakdown:', statusCounts)
  console.log('Done. Open Dashboard, Schedules, Reports, and My Trips (roshan@transitlk.com).')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
