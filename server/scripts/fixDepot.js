import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Depot from '../models/Depot.js'
import Bus from '../models/Bus.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const realDepot = await Depot.findOne({ depotCode: 'ML' })
const dupeDepot = await Depot.findOne({ depotCode: 'MTL' })

if (!realDepot) {
  console.log('ML depot not found')
  process.exit(1)
}

console.log(`Real depot: ${realDepot.depotName} (${realDepot._id})`)

// Update all buses pointing to MTL depot to use ML depot
const result = await Bus.updateMany(
  { depotId: dupeDepot._id },
  { $set: { depotId: realDepot._id } }
)
console.log(`Updated ${result.modifiedCount} bus(es) to use ML depot`)

// Delete the duplicate MTL depot
await Depot.findByIdAndDelete(dupeDepot._id)
console.log(`Deleted duplicate MTL depot (${dupeDepot._id})`)

await mongoose.disconnect()
console.log('Done.')
