const { uploadBuffer } = require('../utils/cloudinary');

async function uploadOne(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const isVideo = req.file.mimetype.startsWith('video/');
  const result = await uploadBuffer(req.file.buffer, {
    folder: `tenanto/${req.user._id}`,
    resource_type: isVideo ? 'video' : 'image',
    moderate: false, // single uploads are typically docs/selfies; don't moderate
  });
  res.json({
    url: result.secure_url,
    publicId: result.public_id,
    type: isVideo ? 'video' : 'image',
  });
}

async function uploadMany(req, res) {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files' });
  // Multi-upload is used for listing media → run through Cloudinary moderation
  const moderate = process.env.CLOUDINARY_MODERATION ? true : false;
  const out = [];
  for (const f of req.files) {
    const isVideo = f.mimetype.startsWith('video/');
    const result = await uploadBuffer(f.buffer, {
      folder: `tenanto/${req.user._id}`,
      resource_type: isVideo ? 'video' : 'image',
      moderate,
    });
    out.push({
      url: result.secure_url,
      publicId: result.public_id,
      type: isVideo ? 'video' : 'image',
      moderationStatus: moderate ? 'pending' : 'skipped',
    });
  }
  res.json({ files: out });
}

module.exports = { uploadOne, uploadMany };
