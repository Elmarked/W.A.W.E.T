const sharp = require('sharp');

const validResolutions = [
  [1920,1080],
  [2560,1440],
  [3840,2160],
  [1366,768],
  [1600,900]
];

async function validateFile(file) {
  if (file.mimetype !== 'image/png') return { valid: false, message: "Invalid file type — PNG required" };

  const metadata = await sharp(file.buffer).metadata();
  const isValidResolution = validResolutions.some(r => r[0] === metadata.width && r[1] === metadata.height);

  if (!isValidResolution) return { valid: false, message: "Invalid resolution" };

  return { valid: true, width: metadata.width, height: metadata.height };
}

module.exports = { validateFile };
