import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import Icon from '../components/Icon'
import { ModuleHeader } from '../components/layout/ModuleLayout'

function formatRelativeTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB')
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function Messages() {
  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherParticipants, setOtherParticipants] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/conversations')
      setConversations(data || [])
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!activeConvId) return
    const loadMessages = async () => {
      try {
        const { data } = await api.get(`/messages/conversations/${activeConvId}`)
        setMessages(data.messages || [])
        setOtherParticipants(data.otherParticipants || [])
        await api.put(`/messages/conversations/${activeConvId}/read`)
        setConversations((prev) =>
          prev.map((c) =>
            c._id === activeConvId ? { ...c, unreadCount: 0 } : c
          )
        )
      } catch {}
    }
    loadMessages()
  }, [activeConvId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!inputText.trim() || !activeConvId || sending) return
    setSending(true)
    try {
      const { data } = await api.post('/messages', {
        conversationId: activeConvId,
        content: inputText.trim(),
      })
      setMessages((prev) => [...prev, data])
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConvId
            ? {
                ...c,
                lastMessage: {
                  content: inputText.trim(),
                  senderName: 'You',
                  createdAt: data.createdAt,
                },
              }
            : c
        )
      )
      setInputText('')
    } catch {} finally {
      setSending(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/messages/users')
      setAvailableUsers(data || [])
    } catch {}
  }

  const handleStartNewChat = async () => {
    if (!selectedUser || !newMessage.trim()) return
    try {
      const { data } = await api.post('/messages/conversations', {
        recipientId: selectedUser._id,
        recipientModel: selectedUser.model,
        recipientName: selectedUser.name,
        recipientEmail: selectedUser.email,
        content: newMessage.trim(),
      })
      setConversations((prev) => [
        {
          _id: data.conversation._id,
          participants: data.conversation.participants,
          subject: data.conversation.subject,
          lastMessage: data.conversation.lastMessage,
          createdAt: data.conversation.createdAt,
          unreadCount: 0,
        },
        ...prev,
      ])
      setActiveConvId(data.conversation._id)
      setShowNewChat(false)
      setSelectedUser(null)
      setNewMessage('')
      setSearchTerm('')
    } catch {}
  }

  const openNewChat = () => {
    loadUsers()
    setShowNewChat(true)
    setActiveConvId(null)
  }

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeConv = conversations.find((c) => c._id === activeConvId)
  const otherParticipant = otherParticipants[0] || activeConv?.participants?.find((p) => String(p.userId) !== 'me')

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-0 overflow-hidden rounded-2xl border border-white/30 bg-white/20 backdrop-blur-sm sm:h-[calc(100vh-10rem)]">
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex w-full flex-col border-r border-white/30 md:w-80 lg:w-96 ${activeConvId ? 'hidden md:flex' : ''}`}>
          <div className="flex items-center justify-between border-b border-white/30 px-4 py-3">
            <h3 className="text-sm font-bold text-fleet-ink">Messages</h3>
            <button
              type="button"
              onClick={openNewChat}
              className="flex items-center gap-1.5 rounded-full bg-depot-navy px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-depot-blue-light"
            >
              <Icon name="add" size={16} />
              New
            </button>
          </div>

          {conversations.length === 0 && !loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <Icon name="chat_bubble" size={36} className="text-fleet-ink-muted/30" />
              <p className="text-sm text-fleet-ink-muted">No conversations yet</p>
              <button
                type="button"
                onClick={openNewChat}
                className="btn-primary mt-2 py-1.5 text-xs"
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-white/20 overflow-y-auto">
              {conversations.map((conv) => {
                const other = conv.participants?.find((p) => String(p.userId) !== 'me')
                const isActive = conv._id === activeConvId
                return (
                  <li key={conv._id}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveConvId(conv._id)
                        setMessages([])
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/20 ${
                        isActive ? 'bg-depot-navy/10' : ''
                      }`}
                    >
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        conv.unreadCount > 0 ? 'bg-depot-navy text-white' : 'bg-white/60 text-fleet-ink-muted'
                      }`}>
                        {initials(other?.name || 'User')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-fleet-ink">
                            {other?.name || 'User'}
                          </span>
                          <span className="shrink-0 text-[10px] text-fleet-ink-muted">
                            {formatRelativeTime(conv.lastMessage?.createdAt || conv.createdAt)}
                          </span>
                        </div>
                        {conv.subject && (
                          <span className="block truncate text-xs font-medium text-fleet-ink">{conv.subject}</span>
                        )}
                        <span className="block truncate text-xs text-fleet-ink-muted">
                          {conv.lastMessage?.content || 'No messages'}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-depot-blue-light px-1 text-[10px] font-bold text-white">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={`flex flex-1 flex-col ${!activeConvId && !showNewChat ? 'hidden md:flex' : ''}`}>
          {showNewChat ? (
            <div className="flex flex-1 flex-col p-6">
              <button
                type="button"
                onClick={() => {
                  setShowNewChat(false)
                  setSelectedUser(null)
                  setNewMessage('')
                  setSearchTerm('')
                }}
                className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-depot-navy hover:text-depot-blue-light md:hidden"
              >
                <Icon name="arrow_back" size={16} />
                Back
              </button>
              <h3 className="mb-4 text-base font-bold text-fleet-ink">New Conversation</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by name, email, or role..."
                className="search-field mb-4"
              />
              {selectedUser && (
                <div className="mb-4 flex items-center gap-3 rounded-xl bg-depot-navy/10 px-4 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-depot-navy text-xs font-bold text-white">
                    {initials(selectedUser.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fleet-ink">{selectedUser.name}</p>
                    <p className="text-xs text-fleet-ink-muted">{selectedUser.role} · {selectedUser.depotName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-full p-1 text-fleet-ink-muted hover:bg-white/30"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>
              )}
              {!selectedUser && (
                <ul className="flex-1 space-y-1 overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <li key={u._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/20"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-depot-navy/20 text-xs font-bold text-depot-navy">
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-fleet-ink">{u.name}</p>
                          <p className="text-xs text-fleet-ink-muted">{u.role} · {u.depotName}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                  {filteredUsers.length === 0 && (
                    <p className="py-6 text-center text-sm text-fleet-ink-muted">No users found</p>
                  )}
                </ul>
              )}
              {selectedUser && (
                <div className="mt-4 border-t border-white/30 pt-4">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                    className="input-field mb-3 w-full resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleStartNewChat()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleStartNewChat}
                    disabled={!newMessage.trim()}
                    className="btn-primary w-full justify-center py-2 text-sm disabled:opacity-50"
                  >
                    <Icon name="send" size={16} />
                    Send
                  </button>
                </div>
              )}
            </div>
          ) : activeConvId ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/30 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActiveConvId(null)}
                  className="flex items-center gap-1 text-xs font-semibold text-depot-navy hover:text-depot-blue-light md:hidden"
                >
                  <Icon name="arrow_back" size={16} />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-depot-navy text-xs font-bold text-white">
                  {initials(otherParticipant?.name || '')}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-fleet-ink">{otherParticipant?.name || 'User'}</p>
                  {otherParticipant?.email && (
                    <p className="text-xs text-fleet-ink-muted">{otherParticipant.email}</p>
                  )}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-fleet-ink-muted">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = String(msg.senderId) === 'me' || msg.senderName === 'You'
                    return (
                      <div key={msg._id || msg.createdAt} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isMine
                              ? 'rounded-tr-sm bg-depot-navy text-white'
                              : 'rounded-tl-sm bg-white/70 text-fleet-ink'
                          }`}
                        >
                          <p className="leading-relaxed">{msg.content}</p>
                          <p className={`mt-1 text-right text-[10px] ${isMine ? 'text-white/70' : 'text-fleet-ink-muted'}`}>
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-white/30 p-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="input-field min-w-0 flex-1 py-2.5"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className="btn-primary flex items-center justify-center px-4 disabled:opacity-50"
                  >
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 items-center justify-center md:flex">
              <div className="text-center">
                <Icon name="chat_bubble" size={56} className="text-fleet-ink-muted/20" />
                <p className="mt-3 text-base font-medium text-fleet-ink-muted">Select a conversation</p>
                <p className="mt-1 text-sm text-fleet-ink-muted/70">
                  Choose a conversation from the left or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Messages
