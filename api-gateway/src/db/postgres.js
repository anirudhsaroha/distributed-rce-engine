const { Pool } = require('pg');

let pool;

async function initPostgres() {
  if (pool) return pool;
  pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
    user: process.env.POSTGRES_USER || 'rce_user',
    password: process.env.POSTGRES_PASSWORD || 'rce_password',
    database: process.env.POSTGRES_DB || 'rce_engine',
  });

  // simple check
  await pool.query('SELECT 1');
  console.log('Connected to Postgres');
  return pool;
}

module.exports = { initPostgres, getPool: () => pool };
