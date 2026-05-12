/**
 * Liveness detection. Asks "is this a real present human?" — defends against
 * photo-of-photo, screen replay, deepfake, and 3D mask attacks.
 *
 * Distinct from utils/selfieMatch.js, which only asks "does this face match
 * the ID photo?". A spoofed selfie can match an ID; that's why we need both.
 *
 * Providers (set LIVENESS_PROVIDER):
 *   smileid      → Smile Identity SmartSelfie (passive, single-shot)
 *   rekognition  → AWS Rekognition Face Liveness (active session, requires browser SDK)
 *   iproov       → iProov Genuine Presence (active, browser SDK)
 *   mock         → deterministic, returns 90 unless URL contains 'spoof'
 */
const axios = require('axios');

async function smileid({ selfieVideoUrl, selfieUrl }) {
  // Smile Identity: SmartSelfie includes liveness scoring out of the box.
  const { data } = await axios.post(
    'https://api.smileidentity.com/v1/smart_selfie',
    {
      partner_id: process.env.SMILEID_PARTNER_ID,
      job_type: 'smart_selfie_authentication',
      images: [{ image_type_id: selfieVideoUrl ? 6 : 0, image: selfieVideoUrl || selfieUrl }],
    },
    { timeout: 20_000 }
  );
  // SmartSelfie returns liveness in `Actions.Liveness_Check` and `ConfidenceValue`
  const passed = data?.Actions?.Liveness_Check === 'Passed';
  const score = Math.round((data?.ConfidenceValue ?? 0) * 100);
  return {
    ok: passed && score >= 80,
    score,
    raw: data,
    reason: passed ? null : 'Smile Identity rejected as non-live',
  };
}

async function rekognition({ sessionId }) {
  // For AWS, the actual capture happens in the browser via Amplify's
  // FaceLivenessDetector. We only verify the resulting session here.
  if (!sessionId) return { ok: false, score: 0, reason: 'sessionId required for Rekognition liveness' };
  let RekognitionClient, GetFaceLivenessSessionResultsCommand;
  try { ({ RekognitionClient, GetFaceLivenessSessionResultsCommand } = require('@aws-sdk/client-rekognition')); }
  catch { return { ok: false, score: 0, reason: '@aws-sdk/client-rekognition not installed' }; }
  const client = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const out = await client.send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
  const score = Math.round((out.Confidence || 0));
  return { ok: out.Status === 'SUCCEEDED' && score >= 80, score, raw: out };
}

async function iproov({ token }) {
  // iProov: validate the GPA (Genuine Presence Assurance) token
  if (!token) return { ok: false, score: 0, reason: 'iProov token required' };
  const { data } = await axios.post(
    'https://eu.rp.secure.iproov.me/api/v2/claim/verify/validate',
    { api_key: process.env.IPROOV_API_KEY, secret: process.env.IPROOV_SECRET, token },
    { timeout: 15_000 }
  );
  const passed = data?.passed === true;
  const score = passed ? 95 : 0;
  return { ok: passed, score, raw: data, reason: passed ? null : data?.reason };
}

function mockLiveness({ selfieVideoUrl, selfieUrl }) {
  const u = selfieVideoUrl || selfieUrl || '';
  if (!u) return { ok: false, score: 0, reason: 'no media' };
  if (u.includes('spoof')) return { ok: false, score: 12, reason: 'mock detected spoof keyword' };
  return { ok: true, score: 90, raw: { mock: true } };
}

async function checkLiveness(input = {}) {
  const provider = process.env.MOCK_THIRD_PARTY === 'true'
    ? 'mock'
    : (process.env.LIVENESS_PROVIDER || 'mock');
  try {
    if (provider === 'smileid') return await smileid(input);
    if (provider === 'rekognition') return await rekognition(input);
    if (provider === 'iproov') return await iproov(input);
    return mockLiveness(input);
  } catch (e) {
    return { ok: false, score: 0, reason: e.response?.data?.message || e.message };
  }
}

module.exports = { checkLiveness };
