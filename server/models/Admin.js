import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { ROLES } from '../utils/roles.js'

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: [ROLES.SUPERADMINISTRATOR, ROLES.ADMINISTRATOR],
      default: ROLES.ADMINISTRATOR,
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Depot',
    },
    /** Legacy link to users collection (optional) */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, collection: 'admins' }
)

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password)
}

const Admin = mongoose.model('Admin', adminSchema)
export default Admin
