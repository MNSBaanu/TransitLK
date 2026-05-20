/**
 * Seed sample buses and drivers for route assignment testing.
 * Run: node scripts/seedFleet.js  (from server folder, with MONGO_URI in .env)
 */
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

dotenv.config()

const buses = [
  { regNumber: 'NC-6055', capacity: 52, status: 'available', serviceType: 'express', mileage: 12000 },
  { regNumber: 'NC-8821', capacity: 45, status: 'available', serviceType: 'ordinary', mileage: 8500 },
  { regNumber: 'NC-3340', capacity: 38, status: 'maintenance', serviceType: 'semi-luxury', mileage: 22000 },
  { regNumber: 'NC-1199', capacity: 54, status: 'available', serviceType: 'semi-luxury', mileage: 5100 },
]

const drivers = [
  { name: 'Kamal Perera', licenseNo: 'B4521987', contactNo: '0771234567', workingHours: '06:00-18:00', status: 'available' },
  { name: 'Nimal Silva', licenseNo: 'B3890123', contactNo: '0772345678', workingHours: '08:00-20:00', status: 'available' },
  { name: 'Sunil Fernando', licenseNo: 'B2100456', contactNo: '0773456789', workingHours: '06:00-14:00', status: 'on-leave' },
]

async function seed() {
  await connectDB()

  for (const bus of buses) {
    await Bus.findOneAndUpdate({ regNumber: bus.regNumber }, bus, { upsert: true, new: true })
  }
  for (const driver of drivers) {
    await Driver.findOneAndUpdate({ licenseNo: driver.licenseNo }, driver, { upsert: true, new: true })
  }

  console.log(`Seeded ${buses.length} buses and ${drivers.length} drivers.`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
