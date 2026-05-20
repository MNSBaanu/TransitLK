import mongoose from 'mongoose'

const maintenanceSchema = new mongoose.Schema(
  {
    bus_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: [true, 'Bus reference is required'],
    },
    service_date: {
      type: Date,
      required: [true, 'Service date is required'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    cost: {
      type: Number,
      required: [true, 'Cost is required'],
    },
  },
  { timestamps: true, collection: 'maintenances' }
)

const Maintenance = mongoose.model('Maintenance', maintenanceSchema)
export default Maintenance
