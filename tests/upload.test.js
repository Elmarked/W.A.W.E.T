const request = require('supertest');
const express = require('express');
const multer = require('multer');
const uploadRoutes = require('../src/routes/upload');
const { authenticateToken } = require('../src/middleware/auth');

const app = express();
app.use(express.json());

// Use a dummy auth middleware for testing
app.use('/upload', (req, res, next) => {
  req.user = { oid: 'test-user-123' }; // Mock user object
  next();
}, uploadRoutes);

describe('Upload Endpoint', () => {

  it('should return 400 if no file uploaded', async () => {
    const res = await request(app)
      .post('/upload')
      .send({ emailConfirm: 'false' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("No file uploaded");
  });

  it('should return 400 if file is not PNG', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('wallpaper', Buffer.from('dummy content'), { filename: 'image.jpg', contentType: 'image/jpeg' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid file type — PNG required");
  });

  it('should fail for invalid resolution PNG', async () => {
    const sharp = require('sharp');
    const invalidPng = await sharp({
      create: {
        width: 1234,
        height: 1234,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();

    const res = await request(app)
      .post('/upload')
      .attach('wallpaper', invalidPng, { filename: 'wallpaper.png', contentType: 'image/png' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid resolution");
  });

  // Note: For a full valid upload test, you would need a PNG with allowed resolution and Azure Storage access
});
