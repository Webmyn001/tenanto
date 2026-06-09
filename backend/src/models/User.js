const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encrypt, decrypt, hashForLookup } = require('../utils/encryption');

const ROLES = ['student', 'corper', 'landlord', 'admin'];

const verificationDocSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true }, // 'student_id' | 'nysc_id' | 'utility_bill' | 'ownership_doc' | 'selfie'
    url: { type: String, required: true },
    publicId: String, // Cloudinary public_id for deletion
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },

    // --- Verification status ---
    // pending: waiting on user to submit; submitted: docs in; approved/rejected: admin reviewed
    verificationStatus: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    verificationNotes: String, // admin reason on rejection
    documents: [verificationDocSchema],
    selfieUrl: String,

    // --- Student-specific ---
    student: {
      schoolName: String,
      schoolEmail: String,
      schoolEmailVerified: { type: Boolean, default: false },
      department: String,
      matricNumber: String,
      nin: String,
      ninHash: { type: String, index: true },
      ninVerified: { type: Boolean, default: false },
    },

    // --- Corper-specific ---
    corper: {
      nin: String, // encrypted at rest (iv:ciphertext)
      ninHash: { type: String, index: true }, // hmac-sha256 for lookups
      ninVerified: { type: Boolean, default: false },
      stateCode: String,
      stateOfService: String,
    },

    // --- Landlord-specific ---
    landlord: {
      nin: String,
      ninHash: { type: String, index: true },
      ninVerified: { type: Boolean, default: false },
      bvn: String,
      bvnHash: { type: String, index: true },
      bvnVerified: { type: Boolean, default: false },
      adminApproved: { type: Boolean, default: false },
      // Bank details for escrow payouts
      bankCode: String,
      bankName: String,
      accountNumber: String,
      accountName: String,
      paystackRecipientCode: String,
    },

    // Selfie ↔ ID match (set during verification submission)
    selfieMatchScore: Number,    // 0-100
    selfieMatchedAt: Date,
    // Liveness — separate signal from match. Pass = real present human.
    selfieVideoUrl: String,
    livenessScore: Number,       // 0-100
    livenessPassed: Boolean,
    livenessCheckedAt: Date,
    livenessProviderRef: String, // session id / token from provider, for re-verification

    // --- Trust / reputation ---
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    badges: [{ type: String }], // 'verified_landlord' | 'student_friendly' | 'nysc_approved'

    // --- Wallet / cashback (earned via successful tenancies; spendable on fees) ---
    wallet: {
      balance: { type: Number, default: 0, min: 0 },
      transactions: [{
        type: { type: String, enum: ['credit', 'debit'], required: true },
        amount: { type: Number, required: true },
        reason: String,
        ref: String,
        balanceAfter: Number,
        at: { type: Date, default: Date.now },
      }],
    },

    // --- Terms / landlord-rules acceptance ---
    termsAcceptedAt: Date,
    termsVersion: String,
    landlordRulesAcceptedAt: Date,
    landlordRulesVersion: String,

    // --- Subscription (premium revenue stream) ---
    subscription: {
      tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
      status: { type: String, enum: ['active', 'cancelled', 'past_due', 'none'], default: 'none' },
      currentPeriodEnd: Date,
      paystackPlanCode: String,
      paystackSubscriptionCode: String,
      paystackCustomerCode: String,
    },

    // --- Enforcement ---
    suspended: { type: Boolean, default: false },
    suspensionReason: String,
    bypassWarnings: { type: Number, default: 0 },

    // --- Reset Password ---
    resetPasswordCode: String,
    resetPasswordExpires: Date,

    // --- Email Verification ---
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationCode: String,
    emailVerificationExpires: Date,
  },
  { timestamps: true }
);

// Hash password on save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Encrypt NIN and BVN at rest.
userSchema.pre('save', function (next) {
  for (const ns of ['student', 'corper', 'landlord']) {
    const sub = this[ns];
    if (!sub) continue;
    if (sub.nin && this.isModified(`${ns}.nin`) && !/:/.test(sub.nin)) {
      sub.ninHash = hashForLookup(sub.nin);
      sub.nin = encrypt(sub.nin);
    }
    if (sub.bvn && this.isModified(`${ns}.bvn`) && !/:/.test(sub.bvn)) {
      sub.bvnHash = hashForLookup(sub.bvn);
      sub.bvn = encrypt(sub.bvn);
    }
  }
  next();
});

userSchema.methods.getDecryptedNIN = function () {
  const sub = this.student?.nin ? this.student : this.corper?.nin ? this.corper : this.landlord?.nin ? this.landlord : null;
  return sub ? decrypt(sub.nin) : null;
};

userSchema.methods.getDecryptedBVN = function () {
  return this.landlord?.bvn ? decrypt(this.landlord.bvn) : null;
};

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Helpful virtual to check if account can transact
userSchema.virtual('canTransact').get(function () {
  if (this.suspended) return false;
  if (this.role === 'admin') return true;
  if (this.role === 'landlord') {
    return this.verificationStatus === 'approved' && this.landlord.adminApproved;
  }
  return this.verificationStatus === 'approved';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
