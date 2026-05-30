const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: String,
    type: { type: String, enum: ['image', 'video'], required: true },
    // Cloudinary moderation result (see utils/cloudinary.js)
    moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'skipped'], default: 'skipped' },
    moderationKind: String, // 'aws_rek' | 'webpurify' | 'google_video_moderation'
    moderationResponse: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const propertySchema = new mongoose.Schema(
  {
    landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    // Two-tier location: area is public, fullAddress is gated by AddressProtection middleware
    area: { type: String, required: true, trim: true, index: true }, // e.g. "Samonda, Ibadan"
    fullAddress: { type: String, required: true, select: false }, // Never returned without gate
    coordinates: {
      lat: Number,
      lng: Number,
    },

    // Targeting — at least one of these must be set so it shows up in a hub
    nearSchools: [{ type: String, index: true }], // e.g. ["University of Ibadan"]
    servingStates: [{ type: String, index: true }], // for corpers, e.g. ["Oyo"]

    propertyType: {
      type: String,
      enum: ['self-contain', 'one-bedroom', 'two-bedroom', 'three-bedroom', 'shared-room', 'hostel'],
      required: true,
    },
    furnishing: { type: String, enum: ['unfurnished', 'semi-furnished', 'furnished'], required: true },
    bedrooms: { type: Number, default: 1 },
    bathrooms: { type: Number, default: 1 },

    // --- Pricing (₦, annual unless noted) ---
    annualRent: { type: Number, required: true, min: 0 },
    installmentEnabled: { type: Boolean, default: false },
    installmentPlan: {
      months: Number, // e.g. 6
      monthlyAmount: Number,
    },
    serviceCharge: { type: Number, default: 0 },
    cautionFee: { type: Number, default: 0 },

    // Distance + transport
    distanceToAnchorKm: Number, // distance to nearest school/PPA
    transportEstimate: Number,  // ₦/day estimate

    media: { type: [mediaSchema], default: [] },

    status: {
      type: String,
      enum: ['draft', 'pending_review', 'active', 'rented', 'rejected', 'archived'],
      default: 'draft',
      index: true,
    },
    rejectionReason: String,
    featured: { type: Boolean, default: false },
    featuredUntil: Date,

    // --- Inspection economics ---
    inspectionFee: { type: Number, default: 3000, min: 0 }, // ₦2k–₦5k

    // --- AI signals (populated asynchronously) ---
    aiScores: {
      authenticity: Number,    // 0-100
      priceFairness: Number,   // 0-100
      mediaQuality: Number,    // 0-100
    },

    // Counters for sort/discovery
    viewCount: { type: Number, default: 0 },
    inspectionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Validate media count — but only when going active
propertySchema.pre('save', function (next) {
  if (this.status === 'active' || this.status === 'pending_review') {
    const images = this.media.filter((m) => m.type === 'image').length;
    const videos = this.media.filter((m) => m.type === 'video').length;
    if (images < 1) return next(new Error('At least 1 image required to publish'));
    if (images > 4) return next(new Error('Maximum 4 images allowed'));
    if (videos > 1) return next(new Error('Maximum 1 video allowed'));
  }
  next();
});

propertySchema.index({ area: 'text', title: 'text', description: 'text' });

module.exports = mongoose.model('Property', propertySchema);
