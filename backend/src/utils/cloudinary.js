const cloudinary = require('cloudinary').v2;

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Moderation provider for listing media.
 *
 * Cloudinary supports several add-ons:
 *   aws_rek                  — AWS Rekognition (nudity, violence, weapons)
 *   webpurify                — WebPurify (NSFW only)
 *   google_video_moderation  — for video files
 *   metascan                 — anti-virus
 *
 * Set CLOUDINARY_MODERATION to 'aws_rek' (recommended) or 'webpurify'.
 * Returns asynchronously — the result lands on a webhook (CLOUDINARY_NOTIFY_URL)
 * or you can poll via getModerationStatus().
 */
function moderationParam(resourceType) {
  const m = process.env.CLOUDINARY_MODERATION;
  if (!m) return undefined;
  if (resourceType === 'video' && m === 'aws_rek') return 'aws_rek_video';
  if (resourceType === 'video' && m === 'google_video_moderation') return 'google_video_moderation';
  return m;
}

function uploadBuffer(buffer, { folder = 'tenanto', resource_type = 'auto', moderate = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      const b64 = buffer.toString('base64');
      return resolve({ secure_url: `data:application/octet-stream;base64,${b64.slice(0, 32)}...mocked`, public_id: 'mock_' + Date.now() });
    }
    const opts = { folder, resource_type };
    if (moderate) {
      const mp = moderationParam(resource_type === 'auto' ? 'image' : resource_type);
      if (mp) opts.moderation = mp;
      if (process.env.CLOUDINARY_NOTIFY_URL) opts.notification_url = process.env.CLOUDINARY_NOTIFY_URL;
    }
    const stream = cloudinary.uploader.upload_stream(opts, (err, result) => (err ? reject(err) : resolve(result)));
    stream.end(buffer);
  });
}

async function destroy(publicId) {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
}

async function getModerationStatus(publicId, resourceType = 'image') {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !publicId) return null;
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: resourceType, moderation: true });
    // result.moderation is an array of { kind, status: 'pending'|'approved'|'rejected', response }
    return result.moderation || null;
  } catch { return null; }
}

module.exports = { uploadBuffer, destroy, getModerationStatus };
