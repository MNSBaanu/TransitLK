import mongoose from 'mongoose'

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'participants.userModel', required: true },
        userModel: { type: String, enum: ['User', 'Admin'], required: true },
        name: { type: String, required: true },
        email: { type: String, default: '' },
      },
    ],
    depotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Depot',
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    lastMessage: {
      content: String,
      senderName: String,
      senderId: mongoose.Schema.Types.ObjectId,
      createdAt: Date,
    },
  },
  { timestamps: true, collection: 'conversations' }
)

conversationSchema.index({ 'participants.userId': 1 })
conversationSchema.index({ depotId: 1, createdAt: -1 })
conversationSchema.index({ 'lastMessage.createdAt': -1 })

const Conversation = mongoose.model('Conversation', conversationSchema)
export default Conversation
