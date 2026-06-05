import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Driver from '../models/Driver.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const driver = await Driver.findOne({ email: 'roshan@transitlk.com' }).select('+password')
if (!driver) {
  console.log('Driver not found')
  process.exit()
}

console.log('Driver found:', driver.name)
console.log('Email:', driver.email)
console.log('Has password:', !!driver.password)

const match = await driver.matchPassword('Roshan23456')
console.log('Password match for Roshan23456:', match)

await mongoose.disconnect()
