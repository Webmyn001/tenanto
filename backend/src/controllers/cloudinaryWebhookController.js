const crypto = require('crypto');
const Property = require('../models/Property');
const ProcessedWebhook = require('../models/ProcessedWebhook');
const { logger } = require('../utils/logger');

/**
 * Verify Cloudinary's notification signature (sha1 of body + timestamp + secret).
 * https://cloudinary.com/documentation/notifications#verifying_signatures
 */
function verifyCloudinarySignature(body, signature, timestamp) {
  if (!process.env.CLOUDINARY_API_SECRET) return true; // dev / unset
  const payload = JSON.stringify(body) + timestamp + process.env.CLOUDINARY_API_SECRET;
  const expected = crypto.createHash('sha1').update(payload).digest('hex');
  return expected === signature;
}

/**
 * POST /webhooks/cloudinary
 * Cloudinary notifies us asynchronously when moderation completes.
 * Payload: { notification_type: 'moderation', public_id, moderation_kind, moderation_status, moderation_response, ... }
 */
async function cloudinaryWebhook(req, res) {
  const signature = req.headers['x-cld-signature'];
  const timestamp = req.headers['x-cld-timestamp'];
  if (!verifyCloudinarySignature(req.body, signature, timestamp)) {
    logger.warn({ ip: req.ip }, '[webhook] cloudinary bad signature');
    return res.status(400).json({ error: 'Bad signature' });
  }

  const event = req.body;
  // Idempotency
  const eventId = `cld_${event.public_id}_${event.notification_type}_${timestamp}`;
  try {
    await ProcessedWebhook.create({ provider: 'cloudinary', eventId, eventType: event.notification_type });
  } catch (e) {
    if (e.code === 11000) return res.json({ received: true, duplicate: true });
    throw e;
  }

  if (event.notification_type !== 'moderation') {
    return res.json({ received: true, ignored: true });
  }

  const status = event.moderation_status; // 'approved' | 'rejected'
  const property = await Property.findOne({ 'media.publicId': event.public_id });
  if (!property) return res.json({ received: true, no_property: true });

  let rejected = false;
  for (const m of property.media) {
    if (m.publicId === event.public_id) {
      m.moderationStatus = status;
      m.moderationKind = event.moderation_kind;
      m.moderationResponse = event.moderation_response;
      if (status === 'rejected') rejected = true;
    }
  }

  if (rejected && property.status === 'active') {
    // Force back into review — admin must decide
    property.status = 'pending_review';
    property.rejectionReason = `Auto-flagged by ${event.moderation_kind}: media failed content moderation`;
    logger.warn({ propertyId: property._id, publicId: event.public_id }, '[moderation] listing pulled');
  }
  await property.save();

  res.json({ received: true, propertyUpdated: property._id });
}

module.exports = { cloudinaryWebhook };
