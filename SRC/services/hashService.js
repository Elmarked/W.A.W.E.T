const crypto = require('crypto');

function generateHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { generateHash };
