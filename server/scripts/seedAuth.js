/**
 * Seed login accounts for all roles.
 * Run from server/: node scripts/seedAuth.js
 */
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Admin from '../models/Admin.js'
import User from '../models/User.js'
import Driver from '../models/Driver.js'
import { ROLES } from '../utils/roles.js'

dotenv.config()

const PASSWORD = 'password123'

const accounts = {
  admin: {
    model: Admin,
    filter: { email: 'admin@transitlk.lk' },
    data: {
      name: 'System Administrator',
      email: 'admin@transitlk.lk',
      password: PASSWORD,
      role: 'administrator',
    },
  },
  scheduler: {
    model: User,
    filter: { email: 'scheduler@transitlk.lk' },
    data: {
      name: 'Transport Scheduler',
      email: 'scheduler@transitlk.lk',
      password: PASSWORD,
      role: ROLES.TRANSPORT_SCHEDULER,
    },
  },
  fleet: {
    model: User,
    filter: { email: 'fleet@transitlk.lk' },
    data: {
      name: 'Fleet Manager',
      email: 'fleet@transitlk.lk',
      password: PASSWORD,
      role: ROLES.FLEET_MANAGER,
    },
  },
  depot: {
    model: User,
    filter: { email: 'depot@transitlk.lk' },
    data: {
      name: 'Depot Manager',
      email: 'depot@transitlk.lk',
      password: PASSWORD,
      role: ROLES.DEPOT_MANAGER,
    },
  },
}

async function seedDriverLogin() {
  const email = 'driver@transitlk.lk'
  let driver = await Driver.findOne({ licenseNo: 'B4521987' })
  if (!driver) {
    driver = await Driver.findOne({ name: 'Kamal Perera' })
  }
  if (driver) {
    driver.email = email
    driver.password = PASSWORD
    await driver.save()
    console.log(`  driver: ${email} (linked to ${driver.name})`)
  } else {
    await Driver.create({
      name: 'Kamal Perera',
      licenseNo: 'B4521987',
      email,
      password: PASSWORD,
      contactNo: '0771234567',
      workingHours: '06:00-18:00',
      status: 'available',
    })
    console.log(`  driver: ${email} (new record)`)
  }
}

async function seed() {
  await connectDB()

  for (const [key, { model, filter, data }] of Object.entries(accounts)) {
    const existing = await model.findOne(filter)
    if (existing) {
      existing.password = PASSWORD
      Object.assign(existing, data)
      await existing.save()
    } else {
      await model.create(data)
    }
    console.log(`  ${key}: ${data.email}`)
  }

  await seedDriverLogin()
  console.log(`\nAll accounts use password: ${PASSWORD}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
