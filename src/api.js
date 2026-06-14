const express = require('express');
const bcrypt  = require('bcryptjs');
const { pool } = require('./db');
const { sign, setCookie, clearCookie, requireAuth } = require('./auth');

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post('/auth/register', async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase().trim(), (name || '').trim(), hash]
    );
    const user = rows[0];
    setCookie(res, sign(user));
    res.json({ user });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'An account with that email already exists' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const { rows } = await pool.query(
    'SELECT id, email, name, password_hash FROM users WHERE email = $1',
    [email.toLowerCase().trim()]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }
  setCookie(res, sign(user));
  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/auth/logout', (req, res) => {
  clearCookie(res);
  res.json({ ok: true });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ── Recipes ───────────────────────────────────────────────────────────────────

router.get('/recipes', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM recipes ORDER BY created_at DESC'
  );
  res.json(rows.map(dbToClient));
});

router.post('/recipes', requireAuth, async (req, res) => {
  const r = req.body;
  const { rows } = await pool.query(
    `INSERT INTO recipes (name, method, glass, base_serves, garnishes, notes, ingredients, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [r.name, r.method, r.glass || null, r.baseServes || 1,
     JSON.stringify(r.garnishes || []), r.notes || null,
     JSON.stringify(r.ingredients || []), req.user.id]
  );
  res.status(201).json(dbToClient(rows[0]));
});

router.put('/recipes/:id', requireAuth, async (req, res) => {
  const r = req.body;
  const { rows } = await pool.query(
    `UPDATE recipes SET name=$1, method=$2, glass=$3, base_serves=$4,
     garnishes=$5, notes=$6, ingredients=$7, updated_at=now()
     WHERE id=$8 RETURNING *`,
    [r.name, r.method, r.glass || null, r.baseServes || 1,
     JSON.stringify(r.garnishes || []), r.notes || null,
     JSON.stringify(r.ingredients || []), req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(dbToClient(rows[0]));
});

router.delete('/recipes/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

function dbToClient(r) {
  return {
    id:          r.id,
    name:        r.name,
    method:      r.method,
    glass:       r.glass,
    baseServes:  r.base_serves,
    garnishes:   r.garnishes,
    notes:       r.notes,
    ingredients: r.ingredients,
    createdAt:   r.created_at,
  };
}

module.exports = router;
