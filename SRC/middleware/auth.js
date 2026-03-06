const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

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
  if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, {
    audience: process.env.CLIENT_ID,
    issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`
  }, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = decoded;
    next();
  });
}

module.exports = { authenticateToken };
