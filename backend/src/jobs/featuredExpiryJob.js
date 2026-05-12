const Property = require('../models/Property');

module.exports = {
  name: 'featuredExpiry',
  schedule: '*/30 * * * *', // every 30 minutes
  async run() {
    const result = await Property.updateMany(
      { featured: true, featuredUntil: { $lte: new Date() } },
      { $set: { featured: false } }
    );
    return { expired: result.modifiedCount || 0 };
  },
};
