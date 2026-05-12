const Payment = require('../models/Payment');
const User = require('../models/User');
const { transferToLandlord } = require('../utils/paystack');
const { logger } = require('../utils/logger');

const AUTO_RELEASE_DAYS = Number(process.env.ESCROW_AUTO_RELEASE_DAYS || 7);

module.exports = {
  name: 'escrowAutoRelease',
  schedule: '0 * * * *', // hourly
  async run() {
    const cutoff = new Date(Date.now() - AUTO_RELEASE_DAYS * 24 * 3600_000);

    // Find payments where:
    //  - tenant confirmed move-in more than AUTO_RELEASE_DAYS ago
    //  - escrow not yet released or refunded
    //  - not disputed
    const due = await Payment.find({
      moveInConfirmedAt: { $lte: cutoff, $exists: true, $ne: null },
      escrowStatus: 'fully_funded',
    });

    let released = 0;
    for (const p of due) {
      try {
        const landlord = await User.findById(p.landlord);
        const net = p.rentAmount - p.platformFeeLandlord + p.serviceCharge + p.cautionFee;
        await transferToLandlord({
          recipientCode: landlord?.paystackRecipientCode || 'mock_recipient',
          amountKobo: net * 100,
          reason: `Auto-release after ${AUTO_RELEASE_DAYS}d window — payment ${p._id}`,
        });
        p.releasedAt = new Date();
        p.escrowStatus = 'released';
        await p.save();
        released++;
      } catch (e) {
        logger.error({ paymentId: p._id, err: e.message }, '[jobs] auto-release failed');
      }
    }
    return { released, candidates: due.length };
  },
};
