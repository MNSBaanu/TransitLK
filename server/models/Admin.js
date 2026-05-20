import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Depot',
    },
  },
  { timestamps: true, collection: 'admins' }
)

const Admin = mongoose.model('Admin', adminSchema)
export default Admin
