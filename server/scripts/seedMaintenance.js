import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Bus from '../models/Bus.js'
import Maintenance from '../models/Maintenance.js'
import {
  reconcileFleetMaintenanceData,
  syncBusMaintenanceFields,
} from '../utils/busMaintenanceSync.js'
import { normalizeTripDate } from '../utils/scheduleHelpers.js'

dotenv.config()

const SEED_TAG = 'transitlk-seed'

function tripDate(y, m, d) {
  return normalizeTripDate(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
}

/** @type {Array<{ regNumber: string, service_date: Date, description: string, cost: number, inWorkshop?: boolean }>} */
const SAMPLE_MAINTENANCE = [
  // Currently in depot workshop
  {
    regNumber: 'NC-9912',
    service_date: tripDate(2026, 6, 8),
    description: `${SEED_TAG} — Transmission overhaul`,
    cost: 85000,
    inWorkshop: true,
  },
  {
    regNumber: 'NC-3340',
    service_date: tripDate(2026, 6, 2),
    description: `${SEED_TAG} — Brake pad & disc replacement`,
    cost: 42000,
    inWorkshop: true,
  },
  {
    regNumber: 'NC-6055',
    service_date: tripDate(2026, 6, 5),
    description: `${SEED_TAG} — Clutch assembly repair`,
    cost: 56000,
    inWorkshop: true,
  },
  {
    regNumber: 'NC-5124',
    service_date: tripDate(2026, 6, 7),
    description: `${SEED_TAG} — Oil change & filter replacement`,
    cost: 12000,
    inWorkshop: true,
  },
  {
    regNumber: 'NB-3401',
    service_date: tripDate(2026, 6, 6),
    description: `${SEED_TAG} — Air conditioning compressor service`,
    cost: 38500,
    inWorkshop: true,
  },
  {
    regNumber: 'NC-9256',
    service_date: tripDate(2026, 6, 4),
    description: `${SEED_TAG} — Suspension bush replacement`,
    cost: 29500,
    inWorkshop: true,
  },
  {
    regNumber: 'NC-4019',
    service_date: tripDate(2026, 6, 3),
    description: `${SEED_TAG} — Electrical system diagnosis & wiring repair`,
    cost: 33200,
    inWorkshop: true,
  },
  {
    regNumber: 'NB-1234',
    service_date: tripDate(2026, 6, 1),
    description: `${SEED_TAG} — Engine tune-up & injector cleaning`,
    cost: 47800,
    inWorkshop: true,
  },

  // Completed service history (vehicles back on the road)
  {
    regNumber: 'NC-4402',
    service_date: tripDate(2026, 1, 23),
    description: `${SEED_TAG} — Routine service & safety inspection`,
    cost: 22400,
  },
  {
    regNumber: 'NC-1199',
    service_date: tripDate(2026, 5, 11),
    description: `${SEED_TAG} — Tyre rotation & wheel alignment`,
    cost: 16800,
  },
  {
    regNumber: 'NB-1456',
    service_date: tripDate(2026, 1, 13),
    description: `${SEED_TAG} — Cooling system flush`,
    cost: 19500,
  },
  {
    regNumber: 'NB-2789',
    service_date: tripDate(2026, 2, 8),
    description: `${SEED_TAG} — Battery & alternator check`,
    cost: 14200,
  },
  {
    regNumber: 'ND-8763',
    service_date: tripDate(2025, 12, 10),
    description: `${SEED_TAG} — Annual roadworthiness inspection`,
    cost: 8900,
  },
  {
    regNumber: 'ND-1478',
    service_date: tripDate(2026, 1, 2),
    description: `${SEED_TAG} — Gearbox oil change`,
    cost: 17600,
  },
  {
    regNumber: 'NB-6825',
    service_date: tripDate(2026, 5, 22),
    description: `${SEED_TAG} — Exhaust system repair`,
    cost: 21300,
  },
  {
    regNumber: 'ND-7332',
    service_date: tripDate(2026, 2, 16),
    description: `${SEED_TAG} — Door mechanism & step repair`,
    cost: 15400,
  },
  {
    regNumber: 'NB-5597',
    service_date: tripDate(2026, 3, 30),
    description: `${SEED_TAG} — Routine service & oil change`,
    cost: 18700,
  },
  {
    regNumber: 'NC-7123',
    service_date: tripDate(2026, 4, 4),
    description: `${SEED_TAG} — Brake fluid replacement`,
    cost: 9800,
  },
  {
    regNumber: 'NC-8891',
    service_date: tripDate(2026, 5, 3),
    description: `${SEED_TAG} — Semi-luxury interior detailing & AC service`,
    cost: 26500,
  },
]

async function run() {
  await connectDB()

  const removedStale = await Maintenance.deleteMany({
    $or: [
      { description: { $regex: /synced from fleet/i } },
      { description: { $regex: /marked in maintenance from fleet/i } },
      { description: { $regex: /Maintenance swap from/i } },
      { description: { $regex: /^Sample workshop/i } },
      { description: { $regex: /^Oil Change$/i } },
      { description: { $not: new RegExp(`^${SEED_TAG}`, 'i') } },
    ],
  })
  console.log(`Removed ${removedStale.deletedCount} old/placeholder maintenance record(s).`)

  const buses = await Bus.find().select('_id regNumber status')
  const busByReg = new Map(buses.map((b) => [b.regNumber, b]))

  let inserted = 0
  let updated = 0
  const workshopRegs = new Set()

  for (const entry of SAMPLE_MAINTENANCE) {
    const bus = busByReg.get(entry.regNumber)
    if (!bus) {
      console.warn(`  Skipped ${entry.regNumber} — bus not found`)
      continue
    }

    if (entry.inWorkshop) workshopRegs.add(entry.regNumber)

    const existing = await Maintenance.findOne({
      bus_id: bus._id,
      description: entry.description,
    })

    if (existing) {
      existing.service_date = entry.service_date
      existing.cost = entry.cost
      await existing.save()
      updated += 1
    } else {
      await Maintenance.create({
        bus_id: bus._id,
        service_date: entry.service_date,
        description: entry.description,
        cost: entry.cost,
      })
      inserted += 1
    }
  }

  for (const bus of buses) {
    if (workshopRegs.has(bus.regNumber)) {
      await Bus.findByIdAndUpdate(bus._id, { status: 'maintenance' })
    } else if (bus.status === 'maintenance') {
      await Bus.findByIdAndUpdate(bus._id, { status: 'available' })
    }
    await syncBusMaintenanceFields(bus._id)
  }

  await reconcileFleetMaintenanceData()

  const total = await Maintenance.countDocuments()
  const inWorkshop = await Bus.countDocuments({ status: 'maintenance' })
  const seedCount = await Maintenance.countDocuments({
    description: { $regex: new RegExp(`^${SEED_TAG}`, 'i') },
  })

  console.log(`Upserted ${inserted} new + ${updated} updated seed record(s).`)
  console.log(`Seed records in DB: ${seedCount} · Total maintenance records: ${total}`)
  console.log(`Buses in workshop (maintenance): ${inWorkshop}`)

  const preview = await Maintenance.find()
    .populate('bus_id', 'regNumber status')
    .sort({ service_date: -1 })
    .limit(12)
    .lean()

  console.log('\nLatest maintenance logs:')
  for (const row of preview) {
    console.log(
      `  ${row.bus_id?.regNumber} | ${row.service_date?.toISOString?.().slice(0, 10)} | ${row.description.replace(`${SEED_TAG} — `, '')} | LKR ${row.cost} | ${row.bus_id?.status}`
    )
  }

  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
