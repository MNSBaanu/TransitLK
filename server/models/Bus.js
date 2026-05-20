import mongoose from 'mongoose'

const busSchema = new mongoose.Schema(
  {
    reg_number: {
      type: String,
      required: [true, 'Registration number is required'],
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
    },
    mileage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'in service', 'in maintenance', 'retired'],
      default: 'available',
    },
    depot_id: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

const Bus = mongoose.model('Bus', busSchema)
export default Bus
