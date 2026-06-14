import './env.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Secret used to sign client-portal login tokens. In production this MUST be
// set in .env (JWT_SECRET). For local dev, if it's missing we generate a
// random one at startup — that just means everyone has to log in again after
// a restart, which is harmless.
const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('Note: JWT_SECRET not set — using a temporary one (portal logins reset on restart). Set JWT_SECRET in .env before deploying.');
}

const TOKEN_TTL = '7d'; // clients stay logged in for a week

export function signPortalToken(clientId) {
  return jwt.sign({ client_id: clientId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// --- Admin (you) ---
export function signAdminToken(email) {
  return jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Express middleware: requires a valid admin token. Put this in front of any
// admin-only route so only you (logged in) can reach it.
export function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorised' });
    }
    req.adminEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

// Express middleware: requires a valid portal token and sets req.clientId.
// Every portal data endpoint uses req.clientId — never a client id from the
// request itself — so a logged-in client can only ever reach their own data.
export function requirePortalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not logged in' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.clientId = payload.client_id;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}
