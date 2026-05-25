const mongoose = require('mongoose');

const roommateProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    // Search dimensions
    school: { type: String, index: true },        // mirrors student.schoolName
    state: { type: String, index: true },         // for corpers
    department: String,
    yearOfStudy: Number,                          // 1..6
    budgetMin: Number,
    budgetMax: Number,

    // Lifestyle prefs (free-text but normalised on the client)
    sleepSchedule: { type: String, enum: ['early_bird', 'night_owl', 'flexible'], default: 'flexible' },
    smoker: { type: Boolean, default: false },
    cleanliness: { type: String, enum: ['relaxed', 'tidy', 'spotless'], default: 'tidy' },
    socialLevel: { type: String, enum: ['quiet', 'balanced', 'social'], default: 'balanced' },
    gender: { type: String, enum: ['male', 'female', 'any'], default: 'any' },


    lookingFor: { type: Number, default: 1, min: 1, max: 4 }, // # of roommates wanted

    // Hide profile from matching but keep data
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RoommateProfile', roommateProfileSchema);
