console.log('[Vercel API] Function initialization started');
console.log('[Vercel API] NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('[Vercel API] DATABASE_URL defined:', !!process.env.DATABASE_URL);
console.log('[Vercel API] JWT_SECRET defined:', !!process.env.JWT_SECRET);
console.log('[Vercel API] VERCEL:', process.env.VERCEL);

try {
  const app = require('../backend/server.js');
  console.log('[Vercel API] Server loaded successfully');
  module.exports = app;
} catch (error) {
  console.error('[Vercel API] Failed to load server:', error.message);
  console.error('[Vercel API] Stack:', error.stack);
  
  // Return error response
  const express = require('express');
  const app = express();
  app.use((req, res) => {
    res.status(500).json({
      error: 'Failed to initialize server',
      message: error.message,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        VERCEL: process.env.VERCEL
      }
    });
  });
  module.exports = app;
}
