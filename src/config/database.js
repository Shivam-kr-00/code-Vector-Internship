import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('CRITICAL: DATABASE_URL is not set in environment variables.');
  process.exit(1);
}

const useSSL = 
  process.env.NODE_ENV === 'production' || 
  process.env.DATABASE_URL.includes('neon.tech');

const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT_MS || '30000', 10),
  ssl: useSSL ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database client connected to the pool successfully.');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

export const query = (text, params) => pool.query(text, params);
export const close = () => pool.end();
