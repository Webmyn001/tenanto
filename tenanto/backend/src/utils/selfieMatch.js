/**
 * Selfie-vs-ID match. Returns confidence 0..100. ≥80 is the typical pass threshold.
 *
 * Providers:
 *   SELFIE_MATCH_PROVIDER=smileid  → Smile Identity Document Verification + SmartSelfie
 *   SELFIE_MATCH_PROVIDER=rekognition → AWS Rekognition CompareFaces
 *   SELFIE_MATCH_PROVIDER=mock (or MOCK_THIRD_PARTY=true) → deterministic
 */
const axios = require('axios');

async function smileid(selfieUrl, idUrl) {
  // Smile Identity DOC_VER + SmartSelfie. Real implementation would upload
  // images first, then call /v1/document_verification. This is a sketch.
  const { data } = await axios.post(
    'https://api.smileidentity.com/v1/biometric_kyc',
    {
      partner_id: process.env.SMILEID_PARTNER_ID,
      job_type: 'biometric_kyc',
      images: [
        { image_type_id: 0, image: selfieUrl },
        { image_type_id: 1, image: idUrl },
      ],
    },
    { timeout: 15_000 }
  );
  const score = Math.round((data?.ConfidenceValue ?? data?.confidence ?? 0) * 100);
  return { ok: score >= 80, score, raw: data };
}

async function rekognition(selfieUrl, idUrl) {
  // For AWS, use the SDK directly (CompareFaces). We sketch the shape here.
  let RekognitionClient, CompareFacesCommand;
  try { ({ RekognitionClient, CompareFacesCommand } = require('@aws-sdk/client-rekognition')); }
  catch { return { ok: false, score: 0, reason: '@aws-sdk/client-rekognition not installed' }; }
  const client = new RekognitionClient({ region: process.env.AWS_REGION || 'us-east-1' });
  const fetchBuf = async (url) => Buffer.from((await axios.get(url, { responseType: 'arraybuffer' })).data);
  const [src, tgt] = await Promise.all([fetchBuf(selfieUrl), fetchBuf(idUrl)]);
  const cmd = new CompareFacesCommand({
    SourceImage: { Bytes: src },
    TargetImage: { Bytes: tgt },
    SimilarityThreshold: 70,
  });
  const out = await client.send(cmd);
  const top = out.FaceMatches?.[0]?.Similarity || 0;
  return { ok: top >= 80, score: Math.round(top), raw: out };
}

function mockMatch(selfieUrl, idUrl) {
  // Deterministic: same URL → 100, otherwise 75 (passes the 70 threshold).
  if (!selfieUrl || !idUrl) return { ok: false, score: 0, reason: 'missing inputs' };
  return { ok: true, score: selfieUrl === idUrl ? 100 : 75, raw: { mock: true } };
}

async function matchSelfieToID({ selfieUrl, idUrl }) {
  if (!selfieUrl || !idUrl) return { ok: false, score: 0, reason: 'selfieUrl and idUrl required' };
  const provider = process.env.MOCK_THIRD_PARTY === 'true'
    ? 'mock'
    : (process.env.SELFIE_MATCH_PROVIDER || 'mock');
  try {
    if (provider === 'smileid') return await smileid(selfieUrl, idUrl);
    if (provider === 'rekognition') return await rekognition(selfieUrl, idUrl);
    return mockMatch(selfieUrl, idUrl);
  } catch (e) {
    return { ok: false, score: 0, reason: e.response?.data?.message || e.message };
  }
}

module.exports = { matchSelfieToID };
