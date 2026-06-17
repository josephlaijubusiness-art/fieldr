import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db.js';
import { signPortalToken, requirePortalAuth } from '../auth.js';

// The client-facing portal API. Everything except /login requires a valid
// login token. Site-scoped routes additionally verify the site belongs to the
// logged-in account — so a client can only ever see their own sites' data.

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Login (public) ---------------------------------------------------
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

  const hash = client?.portal_password_hash || '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await bcrypt.compare(password, hash);

  if (!client || !client.portal_password_hash || !ok) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  res.json({ token: signPortalToken(client.id) });
});

// --- Everything below requires login ----------------------------------
router.use(requirePortalAuth);

// Confirm a site belongs to the logged-in account; returns it or null.
async function ownedSite(clientId, siteId) {
  if (!UUID_REGEX.test(siteId || '')) return null;
  const { data } = await supabase
    .from('sites')
    .select('id, client_id, name')
    .eq('id', siteId)
    .maybeSingle();
  if (!data || data.client_id !== clientId) return null;
  return data;
}

// Middleware for /sites/:siteId/* — checks ownership, then continues.
async function requireOwnedSite(req, res, next) {
  const site = await ownedSite(req.clientId, req.params.siteId);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  req.site = site;
  next();
}

// Who am I — basic account info for the portal header.
router.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, plan, status, contact_email')
    .eq('id', req.clientId)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Account not found' });
  res.json(data);
});

// My sites (for the site switcher).
router.get('/sites', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('id, name, domain, brand_color')
    .eq('client_id', req.clientId)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Site-scoped (ownership enforced) ---------------------------------

router.get('/sites/:siteId/stats', requireOwnedSite, async (req, res) => {
  const [{ count: conversations, error: e1 }, { count: leads, error: e2 }] =
    await Promise.all([
      supabase.from('conversations').select('*', { count: 'exact', head: true }).eq('site_id', req.site.id),
      supabase.from('leads').select('*', { count: 'exact', head: true }).eq('site_id', req.site.id),
    ]);
  if (e1 || e2) return res.status(500).json({ error: (e1 || e2).message });
  res.json({ conversations: conversations ?? 0, leads: leads ?? 0 });
});

router.get('/sites/:siteId/conversations', requireOwnedSite, async (req, res) => {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, session_id, started_at, last_message_at')
    .eq('site_id', req.site.id)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });

  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('conversation_id')
    .eq('site_id', req.site.id);
  if (leadError) return res.status(500).json({ error: leadError.message });

  const leadConvIds = new Set(leads.map((l) => l.conversation_id));
  res.json(conversations.map((c) => ({ ...c, has_lead: leadConvIds.has(c.id) })));
});

router.get('/sites/:siteId/conversations/:conversationId/messages', requireOwnedSite, async (req, res) => {
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('id, site_id')
    .eq('id', req.params.conversationId)
    .maybeSingle();
  if (convError) return res.status(500).json({ error: convError.message });
  if (!conv || conv.site_id !== req.site.id) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages });
});

router.get('/sites/:siteId/leads', requireOwnedSite, async (req, res) => {
  const { data, error } = await supabase
    .from('leads')
    .select('name, email, phone, trigger_message, created_at')
    .eq('site_id', req.site.id)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/sites/:siteId/knowledge-base', requireOwnedSite, async (req, res) => {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('content, updated_at')
    .eq('site_id', req.site.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? { content: '', updated_at: null });
});

router.put('/sites/:siteId/knowledge-base', requireOwnedSite, async (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be text' });
  }
  const { data, error } = await supabase
    .from('knowledge_bases')
    .upsert({ site_id: req.site.id, content }, { onConflict: 'site_id' })
    .select('content, updated_at')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
