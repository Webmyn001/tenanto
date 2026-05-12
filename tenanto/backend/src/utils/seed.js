/* Run with: node src/utils/seed.js */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Property = require('../models/Property');

async function main() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Property.deleteMany({}),
  ]);

  const admin = await User.create({
    fullName: 'Platform Admin',
    email: 'admin@tenanto.local',
    password: 'admin1234',
    role: 'admin',
    verificationStatus: 'approved',
  });

  const landlord = await User.create({
    fullName: 'Mrs. Adebayo',
    email: 'landlord@tenanto.local',
    password: 'landlord1234',
    role: 'landlord',
    verificationStatus: 'approved',
    landlord: { nin: '12345678900', ninVerified: true, adminApproved: true },
    badges: ['verified_landlord'],
    trustScore: 80,
  });

  await User.create({
    fullName: 'Tunde Student',
    email: 'student@tenanto.local',
    password: 'student1234',
    role: 'student',
    verificationStatus: 'approved',
    student: {
      schoolName: 'University of Ibadan',
      schoolEmail: 'tunde@stu.ui.edu.ng',
      schoolEmailVerified: true,
      department: 'Computer Science',
      matricNumber: 'CSC/2021/001',
    },
    badges: ['student_friendly'],
  });

  await User.create({
    fullName: 'Chioma Corper',
    email: 'corper@tenanto.local',
    password: 'corper1234',
    role: 'corper',
    verificationStatus: 'approved',
    corper: {
      nin: '11111111110', // ends in 0 → mock-verified
      ninVerified: true,
      stateCode: 'OY/24A/1234',
      stateOfService: 'Oyo',
    },
    badges: ['nysc_approved'],
  });

  // Demo listing — uses placeholder media URLs. Counts pass the min thresholds.
  const placeholderImg = 'https://placehold.co/800x600/png';
  const placeholderVid = 'https://placehold.co/800x600.mp4';
  await Property.create({
    landlord: landlord._id,
    title: 'Cozy self-contain near UI back gate',
    description: '24/7 power, secure compound, walking distance to University of Ibadan back gate.',
    area: 'Agbowo, Ibadan',
    fullAddress: '12 Demo Crescent, Agbowo, Ibadan, Oyo State',
    coordinates: { lat: 7.4422, lng: 3.9027 },
    nearSchools: ['University of Ibadan'],
    servingStates: ['Oyo'],
    propertyType: 'self-contain',
    furnishing: 'semi-furnished',
    bedrooms: 1,
    bathrooms: 1,
    annualRent: 450_000,
    installmentEnabled: true,
    installmentPlan: { months: 6, monthlyAmount: 75_000 },
    serviceCharge: 30_000,
    cautionFee: 50_000,
    distanceToAnchorKm: 0.6,
    transportEstimate: 500,
    inspectionFee: 3_000,
    media: [
      ...Array.from({ length: 8 }, (_, i) => ({ url: `${placeholderImg}?text=img${i+1}`, type: 'image' })),
      ...Array.from({ length: 5 }, (_, i) => ({ url: `${placeholderVid}?v=${i+1}`, type: 'video' })),
    ],
    status: 'active',
    aiScores: { authenticity: 88, priceFairness: 75, mediaQuality: 80 },
  });

  console.log('Seeded. Logins:');
  console.log('  admin@tenanto.local      / admin1234');
  console.log('  landlord@tenanto.local   / landlord1234');
  console.log('  student@tenanto.local    / student1234');
  console.log('  corper@tenanto.local     / corper1234');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
