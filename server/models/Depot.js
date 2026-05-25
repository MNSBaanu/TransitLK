import mongoose from 'mongoose'

const depotSchema = new mongoose.Schema(
  {
    depotCode: {
      type: String,
      required: [true, 'Depot code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    region: {
      type: String,
      required: [true, 'Region is required'],
      trim: true,
      index: true,
    },
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
