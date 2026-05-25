const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Conversation, Message } = require('../models/Message');
const { filterMessage } = require('../utils/contactFilter');

function attachChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user || user.suspended) return next(new Error('Invalid'));
      socket.user = user;
      next();
    } catch (e) { next(e); }
  });

  io.on('connection', (socket) => {
    socket.on('join', async (conversationId) => {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;
      if (!convo.participants.some((p) => p.toString() === socket.user._id.toString())) return;
      socket.join(conversationId);
    });

    socket.on('message', async ({ conversationId, body }) => {
      const convo = await Conversation.findById(conversationId);
      if (!convo) return;
      if (!convo.participants.some((p) => p.toString() === socket.user._id.toString())) return;

      const filtered = filterMessage(body || '');
      const message = await Message.create({
        conversation: convo._id,
        sender: socket.user._id,
        body: filtered.clean,
        flagged: filtered.flagged,
        flagReasons: filtered.reasons,
        blocked: filtered.blocked,
      });

      const msg = await Message.findById(message._id).populate('sender', 'fullName role');

      convo.lastMessageAt = new Date();
      convo.lastMessage = { body: filtered.clean.slice(0, 120), sender: socket.user._id, createdAt: new Date() };
      if (filtered.blocked) {
        convo.bypassAttempts += 1;
        await User.updateOne({ _id: socket.user._id }, { $inc: { bypassWarnings: 1 } });
      }
      await convo.save();

      io.to(conversationId).emit('message', msg);
      if (filtered.blocked) socket.emit('blocked', { reasons: filtered.reasons });
    });

    socket.on('typing', ({ conversationId }) => {
      socket.to(conversationId).emit('typing', { userId: socket.user._id });
    });

    socket.on('stop-typing', ({ conversationId }) => {
      socket.to(conversationId).emit('stop-typing', { userId: socket.user._id });
    });
  });
}

module.exports = { attachChatSocket };
