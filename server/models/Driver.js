import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    licenseNo: {
      type: String,
      required: [true, 'License number is required'],
      trim: true,
      unique: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    workingHours: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'on-leave', 'off-duty'],
      default: 'available',
    },
  },
  { timestamps: true, collection: 'drivers' }
)

const Driver = mongoose.model('Driver', driverSchema)
export default Driver
