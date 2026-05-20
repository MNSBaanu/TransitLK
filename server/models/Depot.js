import mongoose from 'mongoose'

const depotSchema = new mongoose.Schema(
  {
    depotName: {
      type: String,
      required: [true, 'Depot name is required'],
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    contactNo: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true, collection: 'depots' }
)

const Depot = mongoose.model('Depot', depotSchema)
export default Depot
