import dotenv from 'dotenv'
import connectDB from './config/db.js'
import Bus from './models/Bus.js'

dotenv.config()

async function run() {
  await connectDB()

  const buses = await Bus.find()
  console.log(`Found ${buses.length} buses`)

  let updated = 0
  const today = new Date()
  
  for (const bus of buses) {
    // Generate a random maintenance date within the last 6 months
    const monthsAgo = Math.floor(Math.random() * 6)
    const daysAgo = Math.floor(Math.random() * 30)
    const maintenanceDate = new Date(today)
    maintenanceDate.setMonth(maintenanceDate.getMonth() - monthsAgo)
    maintenanceDate.setDate(maintenanceDate.getDate() - daysAgo)
    
    // For buses in maintenance status, set a more recent date
    if (bus.status === 'maintenance') {
      const recentDays = Math.floor(Math.random() * 14)
      maintenanceDate.setDate(today.getDate() - recentDays)
    }
    
    // For buses with no maintenance date, set it
    if (!bus.lastMaintenanceDate) {
      bus.lastMaintenanceDate = maintenanceDate
      try {
        await bus.save()
        updated += 1
        console.log(`Updated ${bus.regNumber}: ${maintenanceDate.toISOString().split('T')[0]}`)
      } catch (err) {
        console.error(`Failed to update ${bus.regNumber}: ${err.message}`)
      }
    }
  }

  console.log(`Updated ${updated} buses with last maintenance dates`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
