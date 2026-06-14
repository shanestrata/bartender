const express   = require('express');
const bcrypt    = require('bcryptjs');
const AnthropicPkg = require('@anthropic-ai/sdk');
const Anthropic = AnthropicPkg.default ?? AnthropicPkg;
const { pool } = require('./db');
const { sign, setCookie, clearCookie, requireAuth } = require('./auth');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    'SELECT id, name, method, glass, base_serves, garnishes, notes, variants, ingredients, created_at, (image IS NOT NULL) AS has_image FROM recipes ORDER BY created_at DESC'
  );
  res.json(rows.map(dbToClient));
});

router.post('/recipes', requireAuth, async (req, res) => {
  const r = req.body;
  const imageData = r.image ? Buffer.from(r.image.split(',')[1], 'base64') : null;
  const imageMime = r.image ? (r.image.split(';')[0].split(':')[1] || 'image/jpeg') : null;
  const { rows } = await pool.query(
    `INSERT INTO recipes (name, method, glass, base_serves, garnishes, notes, variants, ingredients, created_by, image, image_mime)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, name, method, glass, base_serves, garnishes, notes, variants, ingredients, created_at, (image IS NOT NULL) AS has_image`,
    [r.name, r.method, r.glass || null, r.baseServes || 1,
     JSON.stringify(r.garnishes || []), r.notes || null, r.variants || null,
     JSON.stringify(r.ingredients || []), req.user.id, imageData, imageMime]
  );
  res.status(201).json(dbToClient(rows[0]));
});

router.put('/recipes/:id', requireAuth, async (req, res) => {
  const r = req.body;
  let query, params;
  if (r.image !== undefined) {
    const imageData = r.image ? Buffer.from(r.image.split(',')[1], 'base64') : null;
    const imageMime = r.image ? (r.image.split(';')[0].split(':')[1] || 'image/jpeg') : null;
    query = `UPDATE recipes SET name=$1, method=$2, glass=$3, base_serves=$4,
             garnishes=$5, notes=$6, variants=$7, ingredients=$8, image=$9, image_mime=$10, updated_at=now()
             WHERE id=$11 RETURNING id, name, method, glass, base_serves, garnishes, notes, variants, ingredients, created_at, (image IS NOT NULL) AS has_image`;
    params = [r.name, r.method, r.glass || null, r.baseServes || 1,
              JSON.stringify(r.garnishes || []), r.notes || null, r.variants || null,
              JSON.stringify(r.ingredients || []), imageData, imageMime, req.params.id];
  } else {
    query = `UPDATE recipes SET name=$1, method=$2, glass=$3, base_serves=$4,
             garnishes=$5, notes=$6, variants=$7, ingredients=$8, updated_at=now()
             WHERE id=$9 RETURNING id, name, method, glass, base_serves, garnishes, notes, variants, ingredients, created_at, (image IS NOT NULL) AS has_image`;
    params = [r.name, r.method, r.glass || null, r.baseServes || 1,
              JSON.stringify(r.garnishes || []), r.notes || null, r.variants || null,
              JSON.stringify(r.ingredients || []), req.params.id];
  }
  const { rows } = await pool.query(query, params);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(dbToClient(rows[0]));
});

router.delete('/recipes/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── AI recipe parser ──────────────────────────────────────────────────────────

router.post('/recipes/parse', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No recipe text provided' });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Parse this cocktail recipe into JSON. Return ONLY valid JSON, no markdown, no explanation.

Schema:
{
  "name": string,
  "method": one of "stirred"|"shaken"|"built"|"blended"|"thrown",
  "glass": one of "Rocks"|"Coupe"|"Martini"|"Highball"|"Collins"|"Nick & Nora"|"Flute"|"Wine"|"Tiki"|"Mule Mug"|"Neat" (pick closest),
  "baseServes": number (default 1),
  "garnishes": string[],
  "notes": string (technique/preparation instructions),
  "ingredients": [{ "id": number, "name": string, "amt": string, "ingUnit": "oz"|"ml"|"dashes" }]
}

For egg whites, whole eggs, or items measured by count, use "oz" with approximate volume (egg white = "1").
Convert any measurements to oz where possible.

Recipe:
${text}`
      }],
    });

    // Strip markdown code fences if present
    const raw = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (e) {
    console.error('[parse] error:', e.message);
    res.status(422).json({ error: e.message });
  }
});

// Serve recipe image — public so the <img> tag can load it without cookie complexity
router.get('/recipes/:id/image', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT image, image_mime FROM recipes WHERE id=$1', [req.params.id]
  );
  const r = rows[0];
  if (!r?.image) return res.status(404).end();
  res.set('Content-Type', r.image_mime || 'image/jpeg');
  res.set('Cache-Control', 'private, max-age=86400');
  res.send(r.image);
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
    variants:    r.variants,
    ingredients: r.ingredients,
    createdAt:   r.created_at,
    hasImage:    r.has_image,
  };
}

module.exports = router;
