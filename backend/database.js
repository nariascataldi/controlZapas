require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

// Validate required environment variables before initializing
if (!process.env.DATABASE_URL) {
  console.error('[Database] ❌ ERROR: DATABASE_URL is not set!');
  console.error('[Database] Please configure environment variables in Vercel dashboard');
  // Create a dummy client that will throw helpful errors on queries
  const dummyClient = {
    $queryRaw: async () => {
      throw new Error('DATABASE_URL is not configured. Please set environment variables in Vercel.');
    },
    $connect: async () => {
      throw new Error('DATABASE_URL is not configured. Please set environment variables in Vercel.');
    },
    $disconnect: async () => {},
    usuario: null,
    producto: null,
    venta: null,
    cliente: null,
    variante: null,
    ventaDetalle: null,
    productoImagen: null,
  };
  module.exports = dummyClient;
  return;
}

let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
  
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[Database] ✓ PrismaClient initialized (Supabase: ${!!process.env.DATABASE_URL})`);
  }
} catch (error) {
  console.error('[Database] ❌ Failed to initialize PrismaClient:', error.message);
  // Return dummy client on failure
  prisma = {
    $queryRaw: async () => {
      throw new Error(`Database connection failed: ${error.message}`);
    },
    $connect: async () => {
      throw new Error(`Database connection failed: ${error.message}`);
    },
    $disconnect: async () => {},
    usuario: null,
    producto: null,
    venta: null,
    cliente: null,
    variante: null,
    ventaDetalle: null,
    productoImagen: null,
  };
}

module.exports = prisma;
