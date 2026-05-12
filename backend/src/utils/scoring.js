/**
 * Listing scorer — produces three scores in [0..100]:
 *   - priceFairness: how close to area median ± std dev (100 = on median; 0 = >2σ off)
 *   - mediaQuality: completeness of media + descriptive content
 *   - authenticity: composite anti-fake signal — too-cheap-for-area, dup images,
 *                   short description, recently-created landlord, etc.
 *
 * Each score is decomposed in `signals` so the admin UI can show *why* a listing was flagged.
 * Real ML can later swap in by replacing the body of each function — interface is stable.
 */

const Property = require('../models/Property');
const User = require('../models/User');

// --- helpers ---
function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = avg(arr);
  return Math.sqrt(avg(arr.map((x) => (x - m) ** 2)));
}

async function priceFairnessScore(property) {
  const peers = await Property.find({
    _id: { $ne: property._id },
    propertyType: property.propertyType,
    $or: [
      property.nearSchools?.length ? { nearSchools: { $in: property.nearSchools } } : null,
      property.servingStates?.length ? { servingStates: { $in: property.servingStates } } : null,
      { area: property.area },
    ].filter(Boolean),
    status: 'active',
  }).select('annualRent').limit(200);

  if (peers.length < 3) {
    // Not enough data to judge — neutral score, low confidence
    return { score: 70, signals: { reason: 'Not enough comparable listings yet', sampleSize: peers.length } };
  }

  const rents = peers.map((p) => p.annualRent);
  const median = rents.sort((a, b) => a - b)[Math.floor(rents.length / 2)];
  const sd = stddev(rents) || 1;
  const z = Math.abs(property.annualRent - median) / sd;

  // 0σ → 100, 1σ → 80, 2σ → 50, 3σ+ → 0
  const score = clamp(100 - z * 25);

  return {
    score: Math.round(score),
    signals: {
      areaMedian: median,
      yourRent: property.annualRent,
      zScore: Number(z.toFixed(2)),
      sampleSize: peers.length,
      verdict:
        score >= 80 ? 'fair' :
        score >= 60 ? 'somewhat off-market' :
        property.annualRent < median ? 'suspiciously cheap' : 'overpriced for area',
    },
  };
}

function mediaQualityScore(property) {
  const images = (property.media || []).filter((m) => m.type === 'image').length;
  const videos = (property.media || []).filter((m) => m.type === 'video').length;
  const descLen = (property.description || '').length;
  const titleLen = (property.title || '').length;

  let score = 0;
  // Images: 8 required → up to 30 pts; cap at 15 images for diminishing returns
  score += clamp((Math.min(images, 15) / 15) * 30, 0, 30);
  // Videos: 5 required → up to 25 pts; cap at 10
  score += clamp((Math.min(videos, 10) / 10) * 25, 0, 25);
  // Description: ≥250 chars → 25 pts
  score += clamp((Math.min(descLen, 600) / 600) * 25, 0, 25);
  // Title quality
  score += titleLen >= 20 && titleLen <= 80 ? 10 : 5;
  // Field completeness (bedrooms, bathrooms, distance, near schools/states)
  const filled = [
    property.bedrooms, property.bathrooms, property.distanceToAnchorKm,
    property.nearSchools?.length || property.servingStates?.length,
  ].filter(Boolean).length;
  score += filled * 2.5;

  return {
    score: Math.round(clamp(score)),
    signals: { images, videos, descLen, titleLen, fieldCompleteness: filled },
  };
}

async function authenticityScore(property) {
  const reasons = [];
  let score = 100;

  // Signal 1: too-cheap-for-area → pull from price fairness
  const pf = await priceFairnessScore(property);
  if (pf.signals.verdict === 'suspiciously cheap') { score -= 30; reasons.push('Price >2σ below area median'); }
  else if (pf.signals.verdict === 'overpriced for area') { score -= 5; reasons.push('Price above area norm'); }

  // Signal 2: duplicate image URLs across other listings (basic dedup, real version uses pHash)
  const imageUrls = (property.media || []).filter((m) => m.type === 'image').map((m) => m.url);
  if (imageUrls.length) {
    const dups = await Property.countDocuments({
      _id: { $ne: property._id },
      'media.url': { $in: imageUrls },
    });
    if (dups > 0) { score -= 25; reasons.push(`${dups} other listing(s) reuse images from this one`); }
  }

  // Signal 3: short or low-effort description
  if ((property.description || '').length < 100) { score -= 15; reasons.push('Description under 100 chars'); }

  // Signal 4: landlord account age + verification
  const landlord = await User.findById(property.landlord).select('createdAt verificationStatus bypassWarnings');
  if (landlord) {
    const ageDays = (Date.now() - landlord.createdAt.getTime()) / (1000 * 86400);
    if (ageDays < 7) { score -= 10; reasons.push('Landlord account younger than 7 days'); }
    if (landlord.verificationStatus !== 'approved') { score -= 20; reasons.push('Landlord not yet verified'); }
    if (landlord.bypassWarnings > 0) { score -= 5 * landlord.bypassWarnings; reasons.push(`Landlord has ${landlord.bypassWarnings} bypass warnings`); }
  }

  // Signal 5: media-quality bonus (well-prepared listings are less likely to be fake)
  const mq = mediaQualityScore(property);
  if (mq.score >= 80) score += 5;

  return {
    score: Math.round(clamp(score)),
    signals: { reasons, priceVerdict: pf.signals.verdict, mediaScore: mq.score },
    flagForReview: score < 50,
  };
}

/**
 * Compute & persist all three scores on a property. Call this on publish.
 */
async function scoreAndPersist(propertyId) {
  const property = await Property.findById(propertyId);
  if (!property) return null;

  const [pf, mq, au] = await Promise.all([
    priceFairnessScore(property),
    Promise.resolve(mediaQualityScore(property)),
    authenticityScore(property),
  ]);

  property.aiScores = {
    priceFairness: pf.score,
    mediaQuality: mq.score,
    authenticity: au.score,
  };
  await property.save();

  return { priceFairness: pf, mediaQuality: mq, authenticity: au, flagForReview: au.flagForReview };
}

module.exports = { priceFairnessScore, mediaQualityScore, authenticityScore, scoreAndPersist };
