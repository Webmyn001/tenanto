const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // Person reviewed
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    inspection: { type: mongoose.Schema.Types.ObjectId, ref: 'Inspection' }, // For inspection-time reviews

    kind: { type: String, enum: ['post_inspection', 'tenancy'], required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: String,

    // Granular sub-scores (optional)
    accuracy: { type: Number, min: 1, max: 5 }, // Was the listing accurate?
    cleanliness: { type: Number, min: 1, max: 5 },
    landlordResponsiveness: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

reviewSchema.index({ author: 1, inspection: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema);
