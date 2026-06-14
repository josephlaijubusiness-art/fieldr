import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db.js';

// Client management API.
// NOTE: no login protection yet — fine while everything runs only on
// your own machine. Admin authentication gets added before we deploy.

const router = Router();

const PLANS = ['starter', 'growth', 'pro'];
const STATUSES = ['trial', 'active', 'paused', 'cancelled'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only these fields may be set through the API. Stripe IDs and the
// portal login link are managed by their own features later, so a
// typo in a request can never overwrite them.
const EDITABLE_FIELDS = [
  'name',
  'domain',
  'contact_email',
  'brand_color',
  'bot_name',
  'welcome_message',
  'plan',
  'status',
];

function pickEditableFields(body) {
  const out = {};
  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

function validate(fields, { requireName = false } = {}) {
  if (requireName && (!fields.name || !fields.name.trim())) {
    return 'name is required';
  }
  if (fields.name !== undefined && !String(fields.name).trim()) {
    return 'name cannot be empty';
  }
  if (fields.plan !== undefined && !PLANS.includes(fields.plan)) {
    return `plan must be one of: ${PLANS.join(', ')}`;
  }
  if (fields.status !== undefined && !STATUSES.includes(fields.status)) {
    return `status must be one of: ${STATUSES.join(', ')}`;
  }
  if (
    fields.brand_color !== undefined &&
    !/^#[0-9a-f]{6}$/i.test(fields.brand_color)
  ) {
    return 'brand_color must be a hex colour like #2563EB';
  }
  return null;
}

// Reject IDs that aren't valid UUIDs early, with a clear message.
router.param('id', (req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid client id' });
  }
  next();
});

// ---------------------------------------------------------
// GET /api/clients — list all clients, newest first
// ---------------------------------------------------------
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------
// POST /api/clients — add a new client
// Body: { name (required), domain, contact_email, brand_color,
//         bot_name, welcome_message, plan, status }
// Also creates their empty knowledge base automatically.
// ---------------------------------------------------------
router.post('/', async (req, res) => {
  const fields = pickEditableFields(req.body ?? {});
  const problem = validate(fields, { requireName: true });
  if (problem) return res.status(400).json({ error: problem });

  const { data: client, error } = await supabase
    .from('clients')
    .insert(fields)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Every client gets a knowledge base row from day one,
  // so the chat endpoint never has to wonder if one exists.
  const { error: kbError } = await supabase
    .from('knowledge_bases')
    .insert({ client_id: client.id, content: '' });

  if (kbError) return res.status(500).json({ error: kbError.message });

  res.status(201).json(client);
});

// ---------------------------------------------------------
// GET /api/clients/:id — one client, including their knowledge base
// ---------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*, knowledge_bases(content, updated_at)')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json(data);
});

// ---------------------------------------------------------
// PATCH (or PUT) /api/clients/:id — update any editable fields
// ---------------------------------------------------------
async function updateClient(req, res) {
  const fields = pickEditableFields(req.body ?? {});
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No editable fields in request' });
  }
  const problem = validate(fields);
  if (problem) return res.status(400).json({ error: problem });

  const { data, error } = await supabase
    .from('clients')
    .update(fields)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json(data);
}
router.patch('/:id', updateClient);
router.put('/:id', updateClient);

// ---------------------------------------------------------
// DELETE /api/clients/:id — remove a client.
// The database cascades: their knowledge base, conversations,
// messages and leads are deleted too. Permanent!
// ---------------------------------------------------------
router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .delete()
    .eq('id', req.params.id)
    .select('id')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json({ deleted: true });
});

// ---------------------------------------------------------
// GET /api/clients/:id/knowledge-base — read their bot's knowledge
// ---------------------------------------------------------
router.get('/:id/knowledge-base', async (req, res) => {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('content, updated_at')
    .eq('client_id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json(data);
});

// ---------------------------------------------------------
// PUT /api/clients/:id/knowledge-base — replace their bot's knowledge
// Body: { content: "everything the bot should know, as plain text" }
// ---------------------------------------------------------
router.put('/:id/knowledge-base', async (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be text' });
  }

  const { data, error } = await supabase
    .from('knowledge_bases')
    .upsert({ client_id: req.params.id, content }, { onConflict: 'client_id' })
    .select('content, updated_at')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------
// GET /api/clients/:id/conversations — list this client's chats,
// most recently active first. Each is flagged if it produced a lead.
// (The full transcript of one chat is at /api/conversations/:id/messages.)
// ---------------------------------------------------------
router.get('/:id/conversations', async (req, res) => {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, session_id, started_at, last_message_at')
    .eq('client_id', req.params.id)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });

  // Mark which conversations led to a captured lead.
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('conversation_id')
    .eq('client_id', req.params.id);
  if (leadError) return res.status(500).json({ error: leadError.message });

  const leadConvIds = new Set(leads.map((l) => l.conversation_id));
  res.json(
    conversations.map((c) => ({ ...c, has_lead: leadConvIds.has(c.id) }))
  );
});

// ---------------------------------------------------------
// PUT /api/clients/:id/portal-password — set/reset the client's portal login
// password. Stored only as a secure hash. The client logs in with their
// contact_email + this password.
// ---------------------------------------------------------
router.put('/:id/portal-password', async (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('clients')
    .update({ portal_password_hash: hash })
    .eq('id', req.params.id)
    .select('id, contact_email')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json({ ok: true, contact_email: data.contact_email });
});

export default router;
