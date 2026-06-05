import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Driver from '../models/Driver.js'
import Schedule from '../models/Schedule.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const driver = await Driver.findOne({ email: 'roshan@transitlk.com' })
console.log('Roshan _id:', String(driver._id))

const schedules = await Schedule.find({ driverId: driver._id })
console.log('Schedules assigned to Roshan:', schedules.length)

if (schedules.length > 0) {
  schedules.forEach(s => {
    console.log(`  Schedule: ${s._id} | Status: ${s.status} | Date: ${s.tripDate}`)
  })
} else {
  // Check all schedules to see what driverIds exist
  const all = await Schedule.find({}).select('driverId status tripDate').limit(5)
  console.log('Sample schedules in DB:')
  all.forEach(s => console.log(`  driverId: ${s.driverId} | status: ${s.status}`))
}

await mongoose.disconnect()
