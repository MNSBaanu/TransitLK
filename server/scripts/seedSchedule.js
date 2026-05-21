/**
 * Seed sample schedules (requires routes & fleet: npm run seed:routes, seed:fleet).
 * Run from server/: npm run seed:schedules
 */
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Schedule from '../models/Schedule.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

dotenv.config()

/** Trip dates relative to today so list views stay relevant */
function tripDate(daysFromToday) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(12, 0, 0, 0)
  return d
}

const schedules = [
  {
    routeName: 'Colombo — Kandy',
    busReg: 'NC-6055',
    driverLicense: 'B4521987',
    departureTime: '08:00',
    arrivalTime: '11:30',
    tripDate: tripDate(1),
    status: 'scheduled',
  },
  {
    routeName: 'Colombo — Kandy',
    busReg: 'NC-6055',
    driverLicense: 'B4521987',
    departureTime: '14:00',
    arrivalTime: '17:30',
    tripDate: tripDate(2),
    status: 'scheduled',
  },
  {
    routeName: 'Colombo — Galle',
    busReg: 'NC-8821',
    driverLicense: 'B3890123',
    departureTime: '07:30',
    arrivalTime: '10:45',
    tripDate: tripDate(1),
    status: 'scheduled',
  },
  {
    routeName: 'Colombo — Galle',
    busReg: 'NC-8821',
    driverLicense: 'B3890123',
    departureTime: '15:00',
    arrivalTime: '18:15',
    tripDate: tripDate(3),
    status: 'on-time',
  },
  {
    routeName: 'Kandy — Nuwara Eliya',
    busReg: 'NC-1199',
    driverLicense: 'B3890123',
    departureTime: '09:00',
    arrivalTime: '11:00',
    tripDate: tripDate(2),
    status: 'scheduled',
  },
  {
    routeName: 'Colombo — Negombo',
    busReg: 'NC-8821',
    driverLicense: 'B4521987',
    departureTime: '18:00',
    arrivalTime: '19:15',
    tripDate: tripDate(0),
    status: 'completed',
  },
]

async function resolveRefs({ routeName, busReg, driverLicense }) {
  const route = await Route.findOne({ routeName })
  if (!route) throw new Error(`Route "${routeName}" not found — run npm run seed:routes`)

  const bus = await Bus.findOne({ regNumber: busReg })
  if (!bus) throw new Error(`Bus ${busReg} not found — run npm run seed:fleet`)

  const driver = await Driver.findOne({ licenseNo: driverLicense })
  if (!driver) throw new Error(`Driver ${driverLicense} not found — run npm run seed:fleet`)

  return { routeId: route._id, busId: bus._id, driverId: driver._id }
}

async function seed() {
  await connectDB()

  let count = 0
  for (const item of schedules) {
    const { routeName, busReg, driverLicense, departureTime, arrivalTime, tripDate, status } =
      item
    const { routeId, busId, driverId } = await resolveRefs({ routeName, busReg, driverLicense })

    const dayStart = new Date(tripDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(tripDate)
    dayEnd.setHours(23, 59, 59, 999)

    await Schedule.findOneAndUpdate(
      { routeId, busId, tripDate: { $gte: dayStart, $lte: dayEnd }, departureTime },
      {
        routeId,
        busId,
        driverId,
        departureTime,
        arrivalTime,
        tripDate,
        status,
      },
      { upsert: true, new: true, runValidators: true }
    )
    count++
    console.log(`  ${routeName} · ${departureTime} · ${tripDate.toISOString().slice(0, 10)}`)
  }

  console.log(`Seeded ${count} schedules.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
