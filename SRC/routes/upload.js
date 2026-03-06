const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { validateFile } = require('../utils/validators');
const { uploadToBlob } = require('../services/storageService');
const { generateHash } = require('../services/hashService');
const { sendConfirmationEmail } = require('../services/emailService');
const appInsights = require('applicationinsights');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', authenticateToken, upload.single('wallpaper'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Validation
    const isValid = await validateFile(file);
    if (!isValid.valid) return res.status(400).json({ error: isValid.message });

    // Hashing
    const sha256Hash = generateHash(file.buffer);

    // Upload
    await uploadToBlob(file.buffer);

    // Optional email
    if (req.body.emailConfirm === "true" && req.body.email) {
      await sendConfirmationEmail(req.body.email, sha256Hash);
    }

    // Audit Logging
    appInsights.defaultClient.trackEvent({
      name: "WallpaperUpload",
      properties: {
        userObjectId: req.user.oid,
        hash: sha256Hash,
        resolution: `${isValid.width}x${isValid.height}`
      }
    });

    res.json({ success: true, hash: sha256Hash });
  } catch (error) {
    console.error("Upload Error:", error);
    appInsights.defaultClient.trackException({ exception: error });
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
