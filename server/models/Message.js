import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    senderModel: {
      type: String,
      enum: ['User', 'Admin'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, collection: 'messages' }
)

messageSchema.index({ conversationId: 1, createdAt: 1 })

const Message = mongoose.model('Message', messageSchema)
export default Message
