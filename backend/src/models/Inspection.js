const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Time slot
    scheduledFor: { type: Date, required: true },
    addressVisibleUntil: { type: Date, required: true }, // Window after which address is hidden again

    // Anti-bypass: refundable inspection fee (₦2k–₦5k), deducted from rent if user proceeds
    inspectionFee: { type: Number, required: true },
    feePaymentRef: String, // Paystack reference
    feeStatus: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'forfeited', 'credited_to_rent'],
      default: 'pending',
    },

    // QR code for landlord to scan at meeting — proves real-world contact happened
    qrToken: { type: String, required: true, unique: true, index: true },
    qrScannedAt: Date,
    scannedByLandlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ['booked', 'completed', 'no_show_tenant', 'no_show_landlord', 'cancelled', 'expired'],
      default: 'booked',
      index: true,
    },

    // After inspection, tenant must rate before payment unlocks (post-inspection lock-in)
    tenantRated: { type: Boolean, default: false },
    paymentUnlocked: { type: Boolean, default: false },
    cancellationReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inspection', inspectionSchema);
