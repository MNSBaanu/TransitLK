import mongoose from 'mongoose'

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    license_no: {
      type: String,
      required: [true, 'License number is required'],
      unique: true,
      trim: true,
    },
    Contact_no: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    working_hours: {
      type: String,
      trim: true,
    },
    depot_id: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

const Driver = mongoose.model('Driver', driverSchema)
export default Driver
