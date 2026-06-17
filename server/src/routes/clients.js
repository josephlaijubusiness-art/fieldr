import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../db.js';
import {
  pickSiteFields,
  validateSite,
  maxSitesForPlan,
} from '../siteFields.js';

// Client (account) management API. A client is an account; the sites that hang
// off it (branding, knowledge base, embed code) are managed via the sites
// router. All routes here are admin-only (guarded where mounted in index.js).

const router = Router();

const PLANS = ['starter', 'growth', 'pro'];
const STATUSES = ['trial', 'active', 'paused', 'cancelled'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Account-level editable fields. Branding moved to sites; Stripe IDs and the
// portal password are managed by their own features.
const EDITABLE_FIELDS = ['name', 'contact_email', 'plan', 'status'];

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
  return null;
}

// Create a site row plus its (empty) knowledge base. Returns the new site.
async function createSite(clientId, fields) {
  const { data: site, error } = await supabase
    .from('sites')
    .insert({ client_id: clientId, ...fields })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: kbError } = await supabase
    .from('knowledge_bases')
    .insert({ site_id: site.id, content: '' });
  if (kbError) throw new Error(kbError.message);

  return site;
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
// POST /api/clients — add a new client (account).
// Body: { name (required), contact_email, plan, status }
// Automatically creates a first "Main site" with its empty knowledge base.
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

  try {
    await createSite(client.id, { name: client.name || 'Main site' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  res.status(201).json(client);
});

// ---------------------------------------------------------
// GET /api/clients/:id — one client account
// ---------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Client not found' });
  res.json(data);
});

// ---------------------------------------------------------
// PATCH (or PUT) /api/clients/:id — update account fields
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
// DELETE /api/clients/:id — remove a client account.
// Cascades: all their sites, knowledge bases, conversations, messages,
// and leads are deleted too. Permanent!
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
// GET /api/clients/:id/sites — list this client's sites
// ---------------------------------------------------------
router.get('/:id/sites', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', req.params.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ---------------------------------------------------------
// POST /api/clients/:id/sites — add a site (enforces the plan limit)
// ---------------------------------------------------------
router.post('/:id/sites', async (req, res) => {
  const fields = pickSiteFields(req.body ?? {});
  const problem = validateSite(fields, { requireName: true });
  if (problem) return res.status(400).json({ error: problem });

  // Check the account's plan and how many sites it already has.
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('plan')
    .eq('id', req.params.id)
    .maybeSingle();
  if (clientError) return res.status(500).json({ error: clientError.message });
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const { count, error: countError } = await supabase
    .from('sites')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', req.params.id);
  if (countError) return res.status(500).json({ error: countError.message });

  const max = maxSitesForPlan(client.plan);
  if ((count ?? 0) >= max) {
    return res.status(403).json({
      error:
        max === 1
          ? `The ${client.plan} plan includes 1 site. Upgrade to Pro for up to 3.`
          : `The ${client.plan} plan allows up to ${max} sites.`,
    });
  }

  try {
    const site = await createSite(req.params.id, fields);
    res.status(201).json(site);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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
