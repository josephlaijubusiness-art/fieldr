import { Router } from 'express';
import { supabase } from '../db.js';
import { composeColdEmail } from '../coldEmail.js';

// Sales pipeline (admin-only, guarded where mounted).
//   GET   /api/prospects            -> list all prospects
//   PATCH /api/prospects/:id        -> update status / follow-up / notes
//   POST  /api/prospects/:id/email  -> AI-generate a cold email for this business

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = ['new', 'contacted', 'replied'];

router.param('id', (req, res, next, id) => {
  if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid prospect id' });
  next();
});

// List, oldest first (stable order matching how they were loaded).
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update status / follow-up date / notes.
router.patch('/:id', async (req, res) => {
  const { data: prospect, error: findError } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (findError) return res.status(500).json({ error: findError.message });
  if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

  const body = req.body ?? {};
  const updates = {};

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
    }
    updates.status = body.status;
    // First time it's marked contacted, stamp the date.
    if (body.status === 'contacted' && !prospect.contacted_at) {
      updates.contacted_at = new Date().toISOString();
    }
    // A reply means no pending follow-up is needed.
    if (body.status === 'replied') updates.followup_date = null;
  }

  if (body.followup_date !== undefined && updates.followup_date === undefined) {
    updates.followup_date = body.followup_date || null;
  }
  if (body.notes !== undefined) {
    updates.notes = typeof body.notes === 'string' ? body.notes : null;
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  const { data, error } = await supabase
    .from('prospects')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Generate a personalised cold email for this prospect.
router.post('/:id/email', async (req, res) => {
  const { data: prospect, error } = await supabase
    .from('prospects')
    .select('name, type, contact, website, email')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

  try {
    const { subject, body } = await composeColdEmail(prospect);
    res.json({ to: prospect.email, subject, body });
  } catch (err) {
    console.error('Cold email generation failed:', err?.message ?? err);
    res.status(502).json({ error: "Couldn't generate the email just now. Please try again." });
  }
});

export default router;
