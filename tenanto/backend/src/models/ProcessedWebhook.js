const mongoose = require('mongoose');

/**
 * Records every webhook event we've successfully processed, indexed on the
 * provider's event ID. Unique constraint blocks duplicates. We also TTL the
 * collection so old records garbage-collect.
 */
const processedWebhookSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true, index: true }, // 'paystack', 'flutterwave', etc.
    eventId: { type: String, required: true, unique: true },
    eventType: String,
    receivedAt: { type: Date, default: Date.now, expires: 60 * 24 * 3600 }, // 60-day TTL
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProcessedWebhook', processedWebhookSchema);
