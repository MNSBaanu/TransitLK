import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
    },
    type: {
      type: String,
      enum: [
        'maintenance_due',
        'overdue_maintenance',
        'schedule_conflict',
        'delayed_trip',
        'driver_issue',
        'trip_approved',
        'bus_status_change',
        'license_expiry_warning',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    link: {
      type: String,
      default: '/dashboard',
    },
    read: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, collection: 'notifications' }
)

// Index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
notificationSchema.index({ driverId: 1, read: 1, createdAt: -1 })
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

notificationSchema.pre('validate', function validateRecipient(next) {
  if (!this.userId && !this.driverId) {
    next(new Error('Notification requires userId or driverId'))
  } else {
    next()
  }
})

const Notification = mongoose.model('Notification', notificationSchema)
export default Notification
