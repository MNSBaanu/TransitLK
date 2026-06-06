import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import connectDB from '../config/db.js'
import Depot from '../models/Depot.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

dotenv.config()

const SAMPLE_BUSES = [
  { regNumber: 'NC-6055', capacity: 52, mileage: 184200, serviceType: 'express', status: 'available' },
  { regNumber: 'NC-7123', capacity: 48, mileage: 156400, serviceType: 'ordinary', status: 'in-service' },
  { regNumber: 'NC-8891', capacity: 44, mileage: 201800, serviceType: 'semi-luxury', status: 'available' },
  { regNumber: 'NC-3340', capacity: 54, mileage: 92000, serviceType: 'express', status: 'available' },
  { regNumber: 'NC-9912', capacity: 42, mileage: 178500, serviceType: 'ordinary', status: 'maintenance' },
]

const SAMPLE_DRIVERS = [
  {
    name: 'Roshan Perera',
    licenseNo: 'B4521987',
    email: 'roshan@transitlk.com',
    password: 'Roshan23456',
    contactNo: '0771234567',
    workingHours: '05:00-18:00',
    status: 'available',
  },
  {
    name: 'Kamal Silva',
    licenseNo: 'B3891042',
    contactNo: '0772345678',
    workingHours: '06:00-20:00',
    status: 'available',
  },
  {
    name: 'Nimal Fernando',
    licenseNo: 'B5102933',
    contactNo: '0773456789',
    workingHours: '05:30-17:30',
    status: 'available',
  },
  {
    name: 'Sunil Jayawardena',
    licenseNo: 'B2788451',
    contactNo: '0774567890',
    workingHours: '07:00-19:00',
    status: 'on-leave',
  },
  {
    name: 'Ajith Bandara',
    licenseNo: 'B6012774',
    contactNo: '0775678901',
    workingHours: '06:00-18:00',
    status: 'available',
  },
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
  if (!depot) {
    throw new Error('No depot found. Run seedMataleDepot.js or create a depot first.')
  }

  let busesCreated = 0
  for (const bus of SAMPLE_BUSES) {
    const exists = await Bus.findOne({ regNumber: bus.regNumber })
    if (!exists) {
      await Bus.create({ ...bus, depotId: depot._id })
      busesCreated += 1
    }
  }

  let driversCreated = 0
  for (const driver of SAMPLE_DRIVERS) {
    const exists = await Driver.findOne({ licenseNo: driver.licenseNo })
    if (exists) {
      if (driver.email && !exists.email) {
        exists.email = driver.email
        if (driver.password) exists.password = driver.password
        await exists.save()
      }
      continue
    }
    const doc = { ...driver, depotId: depot._id }
    if (driver.password) {
      const salt = await bcrypt.genSalt(10)
      doc.password = await bcrypt.hash(driver.password, salt)
    }
    await Driver.create(doc)
    driversCreated += 1
  }

  const busCount = await Bus.countDocuments({ depotId: depot._id })
  const driverCount = await Driver.countDocuments({ depotId: depot._id })

  console.log(`Depot: ${depot.depotName} (${depot.depotCode})`)
  console.log(`Buses created: ${busesCreated} (total at depot: ${busCount})`)
  console.log(`Drivers created: ${driversCreated} (total at depot: ${driverCount})`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
