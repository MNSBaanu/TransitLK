import mongoose from 'mongoose'

const scheduleSchema = new mongoose.Schema(
  {
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: [true, 'Route is required'],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus is required'],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver is required'],
    },
    departureTime: {
      type: String,
      required: [true, 'Departure time is required'],
      trim: true,
    },
    arrivalTime: {
      type: String,
      required: [true, 'Arrival time is required'],
      trim: true,
    },
    tripDate: {
      type: Date,
      required: [true, 'Trip date is required'],
    },
    status: {
      type: String,
      enum: ['scheduled', 'on-time', 'delayed', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, collection: 'schedules' }
)

scheduleSchema.index({ tripDate: 1, busId: 1 })
scheduleSchema.index({ tripDate: 1, driverId: 1 })

const Schedule = mongoose.model('Schedule', scheduleSchema)
export default Schedule
