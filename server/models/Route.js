import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, trim: true },
  },
  { _id: false }
)

const stopLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
)

const routeSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: [true, 'Route name is required'],
      trim: true,
    },
    distance: {
      type: Number,
      required: [true, 'Distance is required'],
      min: 0,
    },
    startPoint: {
      type: String,
      required: [true, 'Start point is required'],
      trim: true,
    },
    endPoint: {
      type: String,
      required: [true, 'End point is required'],
      trim: true,
    },
    stops: {
      type: [String],
      default: [],
    },
    startLocation: {
      type: locationSchema,
      default: undefined,
    },
    endLocation: {
      type: locationSchema,
      default: undefined,
    },
    stopLocations: {
      type: [stopLocationSchema],
      default: [],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    serviceType: {
      type: String,
      enum: ['express', 'ordinary', 'semi-luxury'],
      default: 'ordinary',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, collection: 'routes' }
)

const Route = mongoose.model('Route', routeSchema)
export default Route
