const multer = require('multer');

// We use memory storage and stream straight to Cloudinary in the controller.
// Images max 3MB, videos max 10MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image/video uploads allowed'));
  },
});

module.exports = upload;
