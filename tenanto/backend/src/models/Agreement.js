const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema(
  {
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    body: { type: String, required: true }, // Auto-generated markdown / HTML
    tenantSignedAt: Date,
    landlordSignedAt: Date,
    tenantSignatureHash: String, // sha256(signedAt + tenantId + paymentId) — simple e-sig proof
    landlordSignatureHash: String,
    pdfUrl: String, // Stored copy
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agreement', agreementSchema);
