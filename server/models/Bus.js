import mongoose from 'mongoose'

const busSchema = new mongoose.Schema(
  {
    regNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: 1,
    },
    mileage: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['available', 'in-service', 'maintenance'],
      default: 'available',
    },
    serviceType: {
      type: String,
      enum: ['express', 'ordinary', 'semi-luxury'],
      default: 'ordinary',
    },
    depotId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, collection: 'buses' }
)

const Bus = mongoose.model('Bus', busSchema)
export default Bus
