import { Router } from 'express';
import crypto from 'crypto';
import { signAdminToken, requireAdminAuth } from '../auth.js';

// Admin (you) login. Credentials live in server/.env as ADMIN_EMAIL and
// ADMIN_PASSWORD — never in the database. There is exactly one admin.

const router = Router();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Compare two strings without leaking how much matched (timing-safe).
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// POST /api/admin/login  body: { email, password }
router.post('/login', (req, res) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return res.status(503).json({
      error: 'Admin login is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env.',
    });
  }

  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  const emailOk = safeEqual(email, ADMIN_EMAIL);
  const passOk = password.length > 0 && safeEqual(password, ADMIN_PASSWORD);

  if (!emailOk || !passOk) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  res.json({ token: signAdminToken(ADMIN_EMAIL) });
});

// GET /api/admin/me — used by the dashboard to confirm a saved token is valid.
router.get('/me', requireAdminAuth, (req, res) => {
  res.json({ email: req.adminEmail });
});

export default router;
