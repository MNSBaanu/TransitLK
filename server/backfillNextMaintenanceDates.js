import dotenv from 'dotenv'
import connectDB from './config/db.js'
import Bus from './models/Bus.js'

dotenv.config()

async function run() {
  await connectDB()

  const buses = await Bus.find()
  console.log(`Found ${buses.length} buses`)

  let updated = 0
  
  for (const bus of buses) {
    // Calculate nextMaintenanceDate if not set (4 weeks from lastMaintenanceDate)
    if (bus.lastMaintenanceDate && !bus.nextMaintenanceDate) {
      const nextDate = new Date(bus.lastMaintenanceDate)
      nextDate.setDate(nextDate.getDate() + 28) // 4 weeks = 28 days
      
      bus.nextMaintenanceDate = nextDate
      await bus.save()
      updated += 1
      console.log(`Updated ${bus.regNumber}: Next maintenance on ${nextDate.toISOString().split('T')[0]}`)
    } else if (!bus.lastMaintenanceDate) {
      console.log(`Skipped ${bus.regNumber}: No last maintenance date`)
    } else {
      console.log(`Skipped ${bus.regNumber}: Next maintenance date already set`)
    }
  }

  console.log(`Updated ${updated} buses with next maintenance dates`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
