import { Router } from 'express';
import { supabase } from '../db.js';
import { requireAdminAuth } from '../auth.js';

// Receives demo/contact requests from the fieldr.ie landing page.
// POST /api/contact  body: { name, email, business?, message? }

const router = Router();
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post('/', async (req, res) => {
  const name = (req.body?.name ?? '').trim();
  const email = (req.body?.email ?? '').trim();
  const business = (req.body?.business ?? '').trim();
  const message = (req.body?.message ?? '').trim();

  if (!name || !email) {
    return res.status(400).json({ error: 'Please give your name and email.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (name.length > 200 || email.length > 200 || business.length > 200 || message.length > 4000) {
    return res.status(400).json({ error: 'That message is a bit too long.' });
  }

  const { error } = await supabase.from('contact_requests').insert({
    name,
    email,
    business: business || null,
    message: message || null,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
});

// --- Admin: list all demo/contact requests, newest first ---
// GET /api/contact  (admin only)
router.get('/', requireAdminAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('contact_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Admin: mark a request contacted / new again ---
// PATCH /api/contact/:id   body: { handled: true|false }  (admin only)
router.patch('/:id', requireAdminAuth, async (req, res) => {
  if (!UUID_REGEX.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid request id' });
  }
  const { handled } = req.body ?? {};
  if (typeof handled !== 'boolean') {
    return res.status(400).json({ error: 'handled must be true or false' });
  }

  const { data, error } = await supabase
    .from('contact_requests')
    .update({ handled })
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Request not found' });
  res.json(data);
});

export default router;
