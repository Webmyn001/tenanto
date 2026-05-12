const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: String,
    action: { type: String, required: true, index: true }, // e.g. 'admin.verification.approve'
    target: {
      kind: String,    // 'User' | 'Property' | 'Payment' | 'Inspection' | 'Agreement'
      id: { type: mongoose.Schema.Types.ObjectId, index: true },
    },
    payload: mongoose.Schema.Types.Mixed, // the request body / decision details (sanitised)
    ip: String,
    userAgent: String,
    outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
    errorMessage: String,
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
