import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db.js';
import { signPortalToken, requirePortalAuth } from '../auth.js';

// The client-facing portal API. Everything except /login requires a valid
// login token, and every endpoint reads req.clientId (set from that token) —
// so a client can only ever see their own data.

const router = Router();

// --- Login (public) ---------------------------------------------------
// POST /api/portal/login  body: { email, password }
router.post('/login', async (req, res) => {
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const password = req.body?.password ?? '';
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, contact_email, portal_password_hash')
    .ilike('contact_email', email)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });

  // Always run a comparison (even when no client/hash) so the response time
  // doesn't reveal whether an email exists.
  const hash = client?.portal_password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await bcrypt.compare(password, hash);

  if (!client || !client.portal_password_hash || !ok) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  res.json({ token: signPortalToken(client.id) });
});

// --- Everything below requires login ----------------------------------
router.use(requirePortalAuth);

// Who am I — basic info for the portal header.
router.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, plan, status, brand_color, bot_name, contact_email')
    .eq('id', req.clientId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Account not found' });
  res.json(data);
});

// My stats: how many chats and leads.
router.get('/stats', async (req, res) => {
  const [{ count: conversations, error: e1 }, { count: leads, error: e2 }] =
    await Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('client_id', req.clientId),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('client_id', req.clientId),
    ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
  res.json({ conversations: conversations ?? 0, leads: leads ?? 0 });
});

// My conversations (most recently active first), flagged if they made a lead.
router.get('/conversations', async (req, res) => {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, session_id, started_at, last_message_at')
    .eq('client_id', req.clientId)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });

  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('conversation_id')
    .eq('client_id', req.clientId);
  if (leadError) return res.status(500).json({ error: leadError.message });

  const leadConvIds = new Set(leads.map((l) => l.conversation_id));
  res.json(conversations.map((c) => ({ ...c, has_lead: leadConvIds.has(c.id) })));
});

// The transcript of one of MY conversations (ownership is checked).
router.get('/conversations/:id/messages', async (req, res) => {
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, client_id')
    .eq('id', req.params.id)
    .maybeSingle();
  if (convError) return res.status(500).json({ error: convError.message });
  if (!conv || conv.client_id !== req.clientId) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages });
});

// My captured leads.
router.get('/leads', async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('name, email, phone, trigger_message, created_at')
    .eq('client_id', req.clientId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Read my knowledge base.
router.get('/knowledge-base', async (req, res) => {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('content, updated_at')
    .eq('client_id', req.clientId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? { content: '', updated_at: null });
});

// Update my knowledge base.
router.put('/knowledge-base', async (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be text' });
  }
  const { data, error } = await supabase
    .from('knowledge_bases')
    .upsert({ client_id: req.clientId, content }, { onConflict: 'client_id' })
    .select('content, updated_at')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
