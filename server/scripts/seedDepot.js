/**
 * Seed default SRMSS depot and link fleet records.
 * Run from server/: node scripts/seedDepot.js
 */
import dotenv from 'dotenv'
import connectDB from '../config/db.js'
import Depot from '../models/Depot.js'
import Bus from '../models/Bus.js'
import Driver from '../models/Driver.js'

dotenv.config()

async function seed() {
  await connectDB()

  const depot = await Depot.findOneAndUpdate(
    { depotName: 'SRMSS Central Depot' },
    {
      depotName: 'SRMSS Central Depot',
      location: 'Colombo',
      contactNo: '0112345678',
    },
    { upsert: true, new: true }
  )

  await Bus.updateMany({ depotId: { $exists: false } }, { depotId: depot._id })
  await Driver.updateMany({ depotId: { $exists: false } }, { depotId: depot._id })

  console.log(`Depot seeded: ${depot.depotName} (${depot._id})`)
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
