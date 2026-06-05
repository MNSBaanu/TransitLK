import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Driver from '../models/Driver.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const drivers = await Driver.find({}).select('+password').lean()
drivers.forEach((d) => {
  console.log(`Name: ${d.name} | Email: ${d.email || 'NO EMAIL'} | Has Password: ${!!d.password}`)
})

await mongoose.disconnect()
