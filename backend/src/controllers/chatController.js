const { Conversation, Message } = require('../models/Message');
const Property = require('../models/Property');
const User = require('../models/User');
const { filterMessage } = require('../utils/contactFilter');

const BYPASS_WARNING_THRESHOLD = 3;

async function startConversation(req, res) {
  const { propertyId } = req.body;
  const property = await Property.findById(propertyId);
  if (!property) return res.status(404).json({ error: 'Property not found' });

  const participants = [req.user._id, property.landlord].sort();
  let convo = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
    property: property._id,
  });
  if (!convo) {
    convo = await Conversation.create({ participants, property: property._id });
  }
  res.json(convo);
}

async function listConversations(req, res) {
  const items = await Conversation.find({ participants: req.user._id })
    .populate('property', 'title area media')
    .populate('participants', 'fullName role')
    .sort({ lastMessageAt: -1 });

  const withUnread = await Promise.all(items.map(async (c) => {
    const unread = await Message.countDocuments({
      conversation: c._id,
      sender: { $ne: req.user._id },
      readBy: { $ne: req.user._id },
    });
    return { ...c.toObject(), unread };
  }));

  res.json({ items: withUnread });
}

async function listMessages(req, res) {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (!convo.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  const items = await Message.find({ conversation: convo._id })
    .populate('sender', 'fullName role')
    .sort({ createdAt: 1 });
  res.json({ items });
}

async function markAsRead(req, res) {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (!convo.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  await Message.updateMany(
    { conversation: convo._id, sender: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
    { $push: { readBy: req.user._id } }
  );
  res.json({ ok: true });
}

async function sendMessage(req, res) {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (!convo.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  const raw = req.body.body || '';
  const filtered = filterMessage(raw);

  const message = await Message.create({
    conversation: convo._id,
    sender: req.user._id,
    body: filtered.clean,
    flagged: filtered.flagged,
    flagReasons: filtered.reasons,
    blocked: filtered.blocked,
  });

  const msg = await Message.findById(message._id).populate('sender', 'fullName role');

  convo.lastMessageAt = new Date();
  convo.lastMessage = { body: filtered.clean.slice(0, 120), sender: req.user._id, createdAt: new Date() };
  await convo.save();

  if (filtered.blocked) {
    convo.bypassAttempts += 1;
    await User.updateOne({ _id: req.user._id }, { $inc: { bypassWarnings: 1 } });
    if (convo.bypassAttempts >= BYPASS_WARNING_THRESHOLD) {
      await User.updateOne(
        { _id: req.user._id },
        { suspended: true, suspensionReason: 'Repeated attempts to share contact info / bypass platform' }
      );
    }
    await convo.save();
  }

  res.status(201).json({ message: msg, blocked: filtered.blocked, reasons: filtered.reasons });
}

async function reportBypass(req, res) {
  const { conversationId, note } = req.body;
  const convo = await Conversation.findById(conversationId);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  if (!convo.participants.some((p) => p.toString() === req.user._id.toString())) {
    return res.status(403).json({ error: 'Not a participant' });
  }
  convo.bypassAttempts += 1;
  await convo.save();
  res.json({ ok: true, note: note || null });
}

module.exports = {
  startConversation,
  listConversations,
  listMessages,
  markAsRead,
  sendMessage,
  reportBypass,
};
