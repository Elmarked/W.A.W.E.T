const request = require('supertest');
const express = require('express');
const { authenticateToken } = require('../src/middleware/auth');

const app = express();

// Dummy route to test auth
app.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Authorized', user: req.user });
});

describe('Auth Middleware', () => {

  it('should return 401 if no authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("Missing authorization header");
  });

  it('should return 403 if token is invalid', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalidtoken');
    
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  // Note: For a real valid token test, you would need a valid JWT from your Azure tenant
});
