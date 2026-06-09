import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

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
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    contactNo: {
      type: String,
      trim: true,
    },
    workingHours: {
      type: String,
      trim: true,
    },
    licenseExpiry: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['available', 'on-duty', 'on-leave', 'off-duty'],
      default: 'available',
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Depot',
    },
  },
  { timestamps: true, collection: 'drivers' }
)

driverSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

driverSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false
  return bcrypt.compare(enteredPassword, this.password)
}

const Driver = mongoose.model('Driver', driverSchema)
export default Driver
