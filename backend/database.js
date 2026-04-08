require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'test') {
  console.log(`[Database] Connected to PostgreSQL (Supabase: ${!!process.env.DATABASE_URL})`);
}

module.exports = prisma;
