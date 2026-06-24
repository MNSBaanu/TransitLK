import Conversation from '../models/Conversation.js'
import Message from '../models/Message.js'
import User from '../models/User.js'
import Admin from '../models/Admin.js'

// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.userId': req.user.id,
    })
      .sort({ 'lastMessage.createdAt': -1, createdAt: -1 })
      .limit(50)

    const unreadCounts = await Message.aggregate([
      { $match: { conversationId: { $in: conversations.map((c) => c._id) } } },
      { $match: { 'readBy.userId': { $ne: req.user.id } } },
      { $group: { _id: '$conversationId', count: { $sum: 1 } } },
    ])

    const unreadMap = {}
    for (const u of unreadCounts) {
      unreadMap[String(u._id)] = u.count
    }

    const result = conversations.map((c) => ({
      _id: c._id,
      participants: c.participants,
      subject: c.subject,
      lastMessage: c.lastMessage,
      createdAt: c.createdAt,
      unreadCount: unreadMap[String(c._id)] || 0,
    }))

    res.json(result)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get messages in a conversation
// @route   GET /api/messages/conversations/:id
export const getConversationMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const isParticipant = conversation.participants.some(
      (p) => String(p.userId) === String(req.user.id)
    )
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not a participant of this conversation' })
    }

    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100)

    const conversationObj = conversation.toObject()
    const otherParticipants = conversationObj.participants.filter(
      (p) => String(p.userId) !== String(req.user.id)
    )

    res.json({
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        subject: conversation.subject,
        createdAt: conversation.createdAt,
      },
      otherParticipants,
      messages,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Create a new conversation
// @route   POST /api/messages/conversations
export const createConversation = async (req, res) => {
  try {
    const { recipientId, recipientModel, subject, content } = req.body

    if (!recipientId || !content?.trim()) {
      return res.status(400).json({ message: 'Recipient and message content are required' })
    }

    const senderModel = req.user.accountType === 'admin' ? 'Admin' : 'User'

    const existing = await Conversation.findOne({
      $and: [
        { 'participants.userId': { $all: [req.user.id, recipientId] } },
        { 'participants': { $size: 2 } },
      ],
    })

    let conversation
    if (existing) {
      conversation = existing
    } else {
      const recipientName = req.body.recipientName || 'User'
      const recipientEmail = req.body.recipientEmail || ''

      conversation = await Conversation.create({
        participants: [
          { userId: req.user.id, userModel: senderModel, name: req.user.name || 'You', email: req.user.email || '' },
          { userId: recipientId, userModel: recipientModel || 'User', name: recipientName, email: recipientEmail },
        ],
        subject: subject || '',
      })
    }

    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user.id,
      senderModel,
      senderName: req.user.name || 'You',
      content: content.trim(),
    })

    conversation.lastMessage = {
      content: content.trim(),
      senderName: req.user.name || 'You',
      senderId: req.user.id,
      createdAt: message.createdAt,
    }
    await conversation.save()

    res.status(201).json({
      conversation,
      message,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Send a message in an existing conversation
// @route   POST /api/messages
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body

    if (!conversationId || !content?.trim()) {
      return res.status(400).json({ message: 'Conversation ID and message content are required' })
    }

    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    const isParticipant = conversation.participants.some(
      (p) => String(p.userId) === String(req.user.id)
    )
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not a participant' })
    }

    const senderModel = req.user.accountType === 'admin' ? 'Admin' : 'User'

    const message = await Message.create({
      conversationId,
      senderId: req.user.id,
      senderModel,
      senderName: req.user.name || 'You',
      content: content.trim(),
    })

    conversation.lastMessage = {
      content: content.trim(),
      senderName: req.user.name || 'You',
      senderId: req.user.id,
      createdAt: message.createdAt,
    }
    await conversation.save()

    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Mark conversation as read
// @route   PUT /api/messages/conversations/:id/read
export const markConversationRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' })
    }

    await Message.updateMany(
      { conversationId: req.params.id, 'readBy.userId': { $ne: req.user.id } },
      { $push: { readBy: { userId: req.user.id, readAt: new Date() } } }
    )

    res.json({ message: 'Conversation marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get available users for new conversation
// @route   GET /api/messages/users
export const getAvailableUsers = async (req, res) => {
  try {
    const users = await User.find(
      { isActive: true, _id: { $ne: req.user.id } },
      'name email role depotId'
    ).populate('depotId', 'depotName depotCode').lean()

    const admins = await Admin.find(
      { _id: { $ne: req.user.id } },
      'name email role depotId'
    ).populate('depotId', 'depotName depotCode').lean()

    const mappedUsers = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      model: 'User',
      depotName: u.depotId?.depotName || u.depotId?.depotCode || '',
    }))

    const mappedAdmins = admins.map((a) => ({
      _id: a._id,
      name: a.name,
      email: a.email,
      role: a.role,
      model: 'Admin',
      depotName: a.depotId?.depotName || a.depotId?.depotCode || '',
    }))

    res.json([...mappedAdmins, ...mappedUsers])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
