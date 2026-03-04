/*
===============================================================
ENTERPRISE WALLPAPER UPLOAD SERVICE
===============================================================

High-Level Flow:

1. HTTPS enforcement
2. Security middleware (Helmet + Rate Limiting)
3. JWT validation (Microsoft Entra ID)
4. File validation (PNG + size)
5. Resolution validation (sharp metadata)
6. SHA-256 hashing (raw binary)
7. Upload via Managed Identity (RBAC)
8. Optional email confirmation
9. Audit logging (Azure Monitor)
10. Structured error handling

Security Properties:
- Integrity
- Authentication
- Authorization
- Confidentiality
- Auditability
- Non-repudiation (via hash logging)
*/

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const sharp = require('sharp');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { BlobServiceClient } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const appInsights = require('applicationinsights');
const nodemailer = require('nodemailer');

const app = express();

/*
===============================================================
SECTION 1 — SECURITY MIDDLEWARE
===============================================================
*/

app.use(helmet());
/*
Helmet:
- Sets HTTP security headers
- Prevents XSS
- Prevents clickjacking
- Prevents MIME sniffing
*/

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
/*
Rate Limiting:
- Protects against brute force
- Protects against DoS attempts
*/

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
/*
HTTPS Enforcement:
- Prevents plaintext transmission
- Protects JWT tokens in transit
*/

appInsights.setup(process.env.APPINSIGHTS_CONNECTION_STRING).start();
/*
Application Insights:
- Structured logging
- Audit events
- Security monitoring
*/

/*
===============================================================
SECTION 2 — FILE UPLOAD HANDLING
===============================================================
*/

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});
/*
multer.memoryStorage():
- File stored in memory (not disk)
- Reduces persistence risk
- 10MB limit prevents abuse
*/

/*
===============================================================
SECTION 3 — AZURE RBAC STORAGE ACCESS
===============================================================
*/

const credential = new DefaultAzureCredential();
/*
DefaultAzureCredential:
- Uses Managed Identity
- No connection strings
- No secrets in code
*/

const blobServiceClient = new BlobServiceClient(
  `https://${process.env.STORAGE_ACCOUNT}.blob.core.windows.net`,
  credential
);

const containerClient = blobServiceClient.getContainerClient(
  process.env.CONTAINER_NAME
);

/*
===============================================================
SECTION 4 — JWT VALIDATION
===============================================================
*/

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, {
    audience: process.env.CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`
  }, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

/*
===============================================================
SECTION 5 — UPLOAD ENDPOINT
===============================================================
*/

app.post('/upload', authenticateToken, upload.single('wallpaper'), async (req, res) => {

  try {

    /*
    ------------------------------------------------------------
    STEP 1 — BASIC FILE VALIDATION
    ------------------------------------------------------------
    */

    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (file.mimetype !== 'image/png') {
      return res.status(400).json({ error: "Invalid file type — PNG required" });
    }

    /*
    Variables:
    - file.buffer: raw binary bytes of uploaded image
    - file.mimetype: client-declared MIME type
    */

    /*
    ------------------------------------------------------------
    STEP 2 — RESOLUTION VALIDATION
    ------------------------------------------------------------
    */

    const metadata = await sharp(file.buffer).metadata();

    const validResolutions = [
      [1920,1080],
      [2560,1440],
      [3840,2160],
      [1366,768],
      [1600,900]
    ];

    const isValidResolution = validResolutions.some(r =>
      r[0] === metadata.width && r[1] === metadata.height
    );

    if (!isValidResolution) {
      return res.status(400).json({ error: "Invalid resolution" });
    }

    /*
    metadata.width / metadata.height:
    - Extracted from binary file using sharp
    - Prevents spoofed resolution values
    */

    /*
    ------------------------------------------------------------
    STEP 3 — SHA-256 HASH GENERATION
    ------------------------------------------------------------
    */

    /*
    Variable Definitions:

    crypto.createHash('sha256')
      - Initializes SHA-256 hash engine

    .update(file.buffer)
      - Feeds RAW BINARY BYTES into hashing algorithm
      - No encoding transformation
      - No metadata alteration

    .digest('hex')
      - Converts 32-byte digest into 64-character hex string
    */

    const sha256Hash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    /*
    Integrity Notes:

    - Deterministic: Same input → same hash
    - Avalanche effect: 1-bit change → totally different hash
    - Collision resistance: ~2^128 effort
    - Preimage resistance: ~2^256 effort

    Enterprise Use:
    - Audit trail
    - Tamper detection
    - Compliance evidence
    - Forensic validation
    */

    /*
    ------------------------------------------------------------
    STEP 4 — UPLOAD TO AZURE BLOB
    ------------------------------------------------------------
    */

    const blockBlobClient =
      containerClient.getBlockBlobClient("wallpaper.png");

    await blockBlobClient.uploadData(file.buffer, {
      overwrite: true
    });

    /*
    overwrite: true
    - Replaces existing blob
    - Prevents duplicate storage
    - Ensures canonical wallpaper
    */

    /*
    ------------------------------------------------------------
    STEP 5 — OPTIONAL EMAIL CONFIRMATION
    ------------------------------------------------------------
    */

    if (req.body.emailConfirm === "true" && req.body.email) {

      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: req.body.email,
        subject: "Wallpaper Upload Confirmation",
        text: `SHA-256 Hash: ${sha256Hash}`
      });
    }

    /*
    ------------------------------------------------------------
    STEP 6 — AUDIT LOGGING
    ------------------------------------------------------------
    */

    appInsights.defaultClient.trackEvent({
      name: "WallpaperUpload",
      properties: {
        userObjectId: req.user.oid,
        hash: sha256Hash,
        resolution: `${metadata.width}x${metadata.height}`
      }
    });

    res.json({ success: true, hash: sha256Hash });

  } catch (error) {

    /*
    ------------------------------------------------------------
    ERROR HANDLING STRATEGY
    ------------------------------------------------------------

    Possible errors:
    - sharp metadata parsing failure
    - Azure RBAC permission denial
    - Network timeout
    - Storage unreachable (Private Endpoint misconfig)
    - Email failure
    - Token validation race condition

    Response Strategy:
    - Log full error internally
    - Return sanitized error to client
    - Prevent stack trace leakage
    */

    console.error("Upload Error:", error);

    appInsights.defaultClient.trackException({ exception: error });

    res.status(500).json({ error: "Internal server error" });
  }

});

app.listen(process.env.PORT || 3000);
