import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import Driver from '../models/Driver.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)

const email = 'roshan@transitlk.com'
const newPassword = 'Roshan23456'

const salt = await bcrypt.genSalt(10)
const hashed = await bcrypt.hash(newPassword, salt)

const result = await Driver.updateOne(
  { email },
  { $set: { password: hashed } }
)

console.log(`Updated: ${result.modifiedCount} driver`)

// Verify
const driver = await Driver.findOne({ email }).select('+password')
const match = await driver.matchPassword(newPassword)
console.log('Password now matches:', match)

await mongoose.disconnect()
