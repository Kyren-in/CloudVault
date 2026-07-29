import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

// Set up connection pool with SSL bypass for Supabase certificate chains
const pool = new pg.Pool({ 
  connectionString,
  max: 10, // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false // Bypasses self-signed certificate validation issues locally
  }
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
