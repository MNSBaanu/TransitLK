import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Depot from '../models/Depot.js'

dotenv.config()
await mongoose.connect(process.env.MONGO_URI)
const depots = await Depot.find({ depotName: /matale/i })
console.log(JSON.stringify(depots, null, 2))
await mongoose.disconnect()
