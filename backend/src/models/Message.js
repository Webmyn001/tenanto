const mongoose = require('mongoose');

const lastMessageSchema = new mongoose.Schema({
  body: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date,
}, { _id: false });

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessage: lastMessageSchema,
    bypassAttempts: { type: Number, default: 0 }, // Counts blocked contact-share attempts
  },
  { timestamps: true }
);
conversationSchema.index({ participants: 1 });

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Original (pre-filter) text is NEVER stored — we keep the cleaned version + flags only
    body: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    flagReasons: [{ type: String }], // 'phone' | 'email' | 'external_link' | 'suspicious_phrase'
    blocked: { type: Boolean, default: false }, // If true, body was replaced with notice

    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = {
  Conversation: mongoose.model('Conversation', conversationSchema),
  Message: mongoose.model('Message', messageSchema),
};
