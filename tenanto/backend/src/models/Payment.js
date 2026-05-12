const mongoose = require('mongoose');

// Each contributor in a group/split payment
const contributorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paystackRef: String,
    paidAt: Date,
  },
  { _id: false }
);

// Each scheduled installment, if applicable
const installmentSchema = new mongoose.Schema(
  {
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    paystackRef: String,
    paidAt: Date,
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Lead tenant
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inspection: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection' },

    // Money breakdown
    rentAmount: { type: Number, required: true },
    serviceCharge: { type: Number, default: 0 },
    cautionFee: { type: Number, default: 0 },
    inspectionCredit: { type: Number, default: 0 },
    walletApplied: { type: Number, default: 0 }, // Wallet credit consumed at payment init
    platformFeeLandlord: { type: Number, default: 0 }, // 10% of rent
    platformFeeTenant: { type: Number, default: 0 },   // 5% of rent
    totalDue: { type: Number, required: true },

    paymentMode: { type: String, enum: ['full', 'installment', 'group'], required: true },
    installments: { type: [installmentSchema], default: [] },
    contributors: { type: [contributorSchema], default: [] },

    // Escrow state machine
    escrowStatus: {
      type: String,
      enum: [
        'awaiting_funding',  // Created, no money yet
        'partially_funded',  // Some contributors/installments paid
        'fully_funded',      // All money in escrow
        'released',          // Released to landlord (after move-in confirmation)
        'refunded',          // Refunded to tenant (dispute resolved in tenant's favour)
        'disputed',          // Locked while admin reviews
      ],
      default: 'awaiting_funding',
      index: true,
    },
    escrowFundedAt: Date,
    moveInConfirmedAt: Date, // Tenant confirms — triggers release
    releasedAt: Date,
    refundedAt: Date,
    disputeReason: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
