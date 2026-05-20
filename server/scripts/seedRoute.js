/**
 * Seed sample routes (requires fleet: npm run seed:fleet).
 * Run from server/: npm run seed:routes
 */
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Route from '../models/Route.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

dotenv.config()

const routes = [
  {
    routeName: 'Colombo — Kandy',
    distance: 116,
    startPoint: 'Colombo Fort',
    endPoint: 'Kandy',
    stops: ['Kaduwela', 'Nittambuwa', 'Peradeniya'],
    serviceType: 'express',
    busReg: 'NC-6055',
    driverLicense: 'B4521987',
    startLocation: { lat: 6.9344, lng: 79.8428, address: 'Colombo Fort, Sri Lanka' },
    endLocation: { lat: 7.2906, lng: 80.6337, address: 'Kandy, Sri Lanka' },
    stopLocations: [
      { name: 'Kaduwela', lat: 6.9408, lng: 79.8882 },
      { name: 'Nittambuwa', lat: 7.141, lng: 80.1048 },
      { name: 'Peradeniya', lat: 7.269, lng: 80.595 },
    ],
  },
  {
    routeName: 'Colombo — Galle',
    distance: 119,
    startPoint: 'Colombo Fort',
    endPoint: 'Galle',
    stops: ['Moratuwa', 'Kalutara', 'Hikkaduwa'],
    serviceType: 'ordinary',
    busReg: 'NC-8821',
    driverLicense: 'B3890123',
    startLocation: { lat: 6.9344, lng: 79.8428, address: 'Colombo Fort, Sri Lanka' },
    endLocation: { lat: 6.0535, lng: 80.221, address: 'Galle, Sri Lanka' },
    stopLocations: [
      { name: 'Moratuwa', lat: 6.773, lng: 79.8826 },
      { name: 'Kalutara', lat: 6.5854, lng: 79.9607 },
      { name: 'Hikkaduwa', lat: 6.1397, lng: 80.1063 },
    ],
  },
  {
    routeName: 'Kandy — Nuwara Eliya',
    distance: 78,
    startPoint: 'Kandy',
    endPoint: 'Nuwara Eliya',
    stops: ['Gampola', 'Nawalapitiya'],
    serviceType: 'semi-luxury',
    busReg: 'NC-1199',
    driverLicense: 'B3890123',
    startLocation: { lat: 7.2906, lng: 80.6337, address: 'Kandy, Sri Lanka' },
    endLocation: { lat: 6.9497, lng: 80.7891, address: 'Nuwara Eliya, Sri Lanka' },
    stopLocations: [
      { name: 'Gampola', lat: 7.1643, lng: 80.5765 },
      { name: 'Nawalapitiya', lat: 7.054, lng: 80.543 },
    ],
  },
  {
    routeName: 'Colombo — Negombo',
    distance: 38,
    startPoint: 'Colombo Fort',
    endPoint: 'Negombo',
    stops: ['Kelaniya'],
    serviceType: 'ordinary',
    busReg: null,
    driverLicense: null,
    startLocation: { lat: 6.9344, lng: 79.8428 },
    endLocation: { lat: 7.2084, lng: 79.8358 },
    stopLocations: [{ name: 'Kelaniya', lat: 6.9551, lng: 79.922 }],
  },
]

async function resolveFleet(busReg, driverLicense) {
  let busId
  let driverId
  if (busReg) {
    const bus = await Bus.findOne({ regNumber: busReg })
    if (!bus) console.warn(`  Bus ${busReg} not found — run npm run seed:fleet`)
    else busId = bus._id
  }
  if (driverLicense) {
    const driver = await Driver.findOne({ licenseNo: driverLicense })
    if (!driver) console.warn(`  Driver ${driverLicense} not found — run npm run seed:fleet`)
    else driverId = driver._id
  }
  return { busId, driverId }
}

async function seed() {
  await connectDB()

  let count = 0
  for (const item of routes) {
    const { busReg, driverLicense, ...data } = item
    const { busId, driverId } = await resolveFleet(busReg, driverLicense)

    await Route.findOneAndUpdate(
      { routeName: data.routeName },
      { ...data, busId, driverId },
      { upsert: true, new: true, runValidators: true }
    )
    count++
    console.log(`  Route: ${data.routeName}`)
  }

  console.log(`Seeded ${count} routes.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
