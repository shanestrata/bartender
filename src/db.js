const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('[db] schema ready');
}

async function seedAdmin() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) return;
  const email = process.env.ADMIN_EMAIL;
  const pass  = process.env.ADMIN_PASSWORD;
  if (!email || !pass) {
    console.warn('[db] No users yet. Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the first account.');
    return;
  }
  const hash = await bcrypt.hash(pass, 10);
  await pool.query(
    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)',
    [email.toLowerCase().trim(), process.env.ADMIN_NAME || 'Admin', hash]
  );
  console.log('[db] Seeded first user:', email);
}

module.exports = { pool, migrate, seedAdmin };
