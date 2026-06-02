import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Depot from '../models/Depot.js'
import Bus from '../models/Bus.js'

dotenv.config()

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('Connected to MongoDB')

  // Create Matale Depot if it doesn't exist
  let depot = await Depot.findOne({ depotCode: 'MTL' })
  if (!depot) {
    depot = await Depot.create({
      depotCode: 'MTL',
      region: 'Central',
      depotName: 'Matale Depot',
      location: 'Matale, Sri Lanka',
      contactNo: '0662222000',
    })
    console.log(`Created depot: ${depot.depotName} (${depot._id})`)
  } else {
    console.log(`Depot already exists: ${depot.depotName} (${depot._id})`)
  }

  // Update all buses that have a string depotId (depot_01, depot_02, etc.)
  // to reference the Matale Depot ObjectId
  const result = await Bus.updateMany(
    { depotId: { $type: 'string' } },
    { $set: { depotId: depot._id } }
  )
  console.log(`Updated ${result.modifiedCount} bus(es) to reference Matale Depot`)

  await mongoose.disconnect()
  console.log('Done.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
