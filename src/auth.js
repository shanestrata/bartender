const jwt = require('jsonwebtoken');

const SECRET = process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const COOKIE = 'grove_session';
const MAX_AGE = 30 * 24 * 3600 * 1000;

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    SECRET,
    { expiresIn: '30d' }
  );
}

function setCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  });
}

function clearCookie(res) {
  res.clearCookie(COOKIE);
}

function requireAuth(req, res, next) {
  const t = req.cookies[COOKIE];
  if (!t) return res.status(401).json({ error: 'Sign in required' });
  try {
    req.user = jwt.verify(t, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired — sign in again' });
  }
}

module.exports = { sign, setCookie, clearCookie, requireAuth };
