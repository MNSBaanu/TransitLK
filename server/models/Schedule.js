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
    /** Shared id for trips created in one timetable save */
    timetableId: {
      type: String,
      trim: true,
      index: true,
    },
    timetablePeriod: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
    },
    /** Week start (Mon) or 1st of month — canonical anchor for the timetable batch */
    timetableAnchor: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'scheduled',
        'on-duty',
        'on-time',
        'delayed',
        'completed',
        'cancelled',
      ],
      default: 'draft',
    },
    submittedAt: { type: Date },
    receivedAt: { type: Date },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    adjustmentReason: {
      type: String,
      enum: ['normal', 'emergency', 'maintenance', 'absence', 'obstruction'],
      default: 'normal',
    },
    adjustmentNotes: {
      type: String,
      trim: true,
      default: '',
    },
    /** Set when a driver reports a trip issue (delayed status from driver app). */
    driverIssueReportedAt: {
      type: Date,
      default: null,
    },
    /** Driver's issue description — kept separate from scheduler adjustment notes. */
    driverIssueNotes: {
      type: String,
      trim: true,
      default: '',
    },
    /** Driver opt-in live GPS sharing while trip is active (on-duty / on-time / delayed). */
    liveLocationSharing: {
      type: Boolean,
      default: false,
    },
    liveLocation: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
      heading: { type: Number },
      speed: { type: Number },
      updatedAt: { type: Date },
    },
    adjustmentHistory: [
      {
        at: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: {
          type: String,
          enum: ['normal', 'emergency', 'maintenance', 'absence', 'obstruction'],
        },
        notes: { type: String, trim: true },
        changes: [
          {
            field: { type: String, trim: true },
            from: { type: String },
            to: { type: String },
          },
        ],
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, collection: 'schedules' }
)

scheduleSchema.index({ tripDate: 1, busId: 1 })
scheduleSchema.index({ tripDate: 1, driverId: 1 })
scheduleSchema.index({ timetablePeriod: 1, timetableAnchor: 1 })

const Schedule = mongoose.model('Schedule', scheduleSchema)
export default Schedule
