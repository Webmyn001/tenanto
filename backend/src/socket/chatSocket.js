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
      const msg = await Message.create({
        conversation: convo._id,
        sender: socket.user._id,
        body: filtered.clean,
        flagged: filtered.flagged,
        flagReasons: filtered.reasons,
        blocked: filtered.blocked,
      });

      if (filtered.blocked) {
        convo.bypassAttempts += 1;
        await User.updateOne({ _id: socket.user._id }, { $inc: { bypassWarnings: 1 } });
      }
      convo.lastMessageAt = new Date();
      await convo.save();

      io.to(conversationId).emit('message', msg);
      if (filtered.blocked) socket.emit('blocked', { reasons: filtered.reasons });
    });
  });
}

module.exports = { attachChatSocket };
