require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Validate required environment variables before initializing
if (!process.env.DATABASE_URL) {
  console.error('[Database] ❌ ERROR: DATABASE_URL is not set!');
  console.error('[Database] Please configure environment variables in Vercel dashboard');
  // Create a dummy client that will throw helpful errors on queries
  module.exports = {
    $queryRaw: async () => {
      throw new Error('DATABASE_URL is not configured. Please set environment variables in Vercel.');
    },
    $connect: async () => {
      throw new Error('DATABASE_URL is not configured. Please set environment variables in Vercel.');
    },
    usuario: null,
    producto: null,
    venta: null,
  };
  return;
}

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'test') {
  console.log(`[Database] ✓ Connected to PostgreSQL (Supabase: ${!!process.env.DATABASE_URL})`);
}

module.exports = prisma;
