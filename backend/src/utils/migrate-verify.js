require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');

async function migrate() {
  await connectDB();
  console.log('Migrating existing users to isEmailVerified: true...');
  
  const result = await User.updateMany(
    { isEmailVerified: { $exists: false } },
    { $set: { isEmailVerified: true } }
  );

  console.log(`Done! Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  await mongoose.disconnect();
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
