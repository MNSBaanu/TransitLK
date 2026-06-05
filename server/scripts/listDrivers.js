import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Driver from '../models/Driver.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const drivers = await Driver.find({}).select('name email licenseNo').lean()
drivers.forEach(d => {
  console.log(`ID: ${d._id} | Name: ${d.name} | Email: ${d.email || 'none'} | License: ${d.licenseNo}`)
})

await mongoose.disconnect()
