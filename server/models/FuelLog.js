import mongoose from 'mongoose'

const fuelLogSchema = new mongoose.Schema(
  {
    bus_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    fuel_date: {
      type: Date,
      required: [true, 'Fuel date is required'],
    },
    liters: {
      type: Number,
      required: [true, 'Liters is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
    },
  },
  { timestamps: true }
)

const FuelLog = mongoose.model('FuelLog', fuelLogSchema)
export default FuelLog
