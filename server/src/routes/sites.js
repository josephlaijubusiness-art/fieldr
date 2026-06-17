import { Router } from 'express';
import { supabase } from '../db.js';
import { crawlSite, normalizeStartUrl } from '../crawler.js';
import { pickSiteFields, validateSite } from '../siteFields.js';

// Per-site management (admin-only). A site has its own branding, knowledge
// base, embed code, and conversations.
//   GET    /api/sites/:id                  -> site + its knowledge base
//   PATCH  /api/sites/:id                  -> update branding/name/domain
//   DELETE /api/sites/:id                  -> delete the site (cascades)
//   GET/PUT /api/sites/:id/knowledge-base  -> read / replace KB text
//   POST   /api/sites/:id/crawl            -> crawl website into the KB
//   GET    /api/sites/:id/conversations    -> this site's chats

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.param('id', (req, res, next, id) => {
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }
  next();
});

// GET one site, with its knowledge base content.
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .select('*, knowledge_bases(content, updated_at)')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Site not found' });
  res.json(data);
});

// Update branding / name / domain.
async function updateSite(req, res) {
  const fields = pickSiteFields(req.body ?? {});
  if (Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'No editable fields in request' });
  }
  const problem = validateSite(fields);
  if (problem) return res.status(400).json({ error: problem });

  const { data, error } = await supabase
    .from('sites')
    .update(fields)
    .eq('id', req.params.id)
    .select()
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Site not found' });
  res.json(data);
}
router.patch('/:id', updateSite);
router.put('/:id', updateSite);

// Delete a site (cascades its KB, conversations, messages, leads).
router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('sites')
    .delete()
    .eq('id', req.params.id)
    .select('id')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Site not found' });
  res.json({ deleted: true });
});

// Read the knowledge base.
router.get('/:id/knowledge-base', async (req, res) => {
  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('content, updated_at')
    .eq('site_id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? { content: '', updated_at: null });
});

// Replace the knowledge base.
router.put('/:id/knowledge-base', async (req, res) => {
  const { content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be text' });
  }
  const { data, error } = await supabase
    .from('knowledge_bases')
    .upsert({ site_id: req.params.id, content }, { onConflict: 'site_id' })
    .select('content, updated_at')
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Crawl a website into this site's knowledge base (also serves as refresh).
router.post('/:id/crawl', async (req, res) => {
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, domain')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!site) return res.status(404).json({ error: 'Site not found' });

  let startUrl;
  try {
    startUrl = normalizeStartUrl(req.body?.url || site.domain || '');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  let result;
  try {
    result = await crawlSite(startUrl);
  } catch (e) {
    return res.status(502).json({ error: 'Crawl failed: ' + e.message });
  }
  if (result.pagesCrawled === 0) {
    return res.status(422).json({
      error:
        "Couldn't read any pages from that website. Check the address is correct and publicly reachable.",
    });
  }

  const { error: saveError } = await supabase
    .from('knowledge_bases')
    .upsert({ site_id: site.id, content: result.content }, { onConflict: 'site_id' });
  if (saveError) return res.status(500).json({ error: saveError.message });

  res.json({
    content: result.content,
    pagesCrawled: result.pagesCrawled,
    characters: result.characters,
    truncated: result.truncated,
  });
});

// List this site's conversations, most recently active first, lead-flagged.
router.get('/:id/conversations', async (req, res) => {
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, session_id, started_at, last_message_at')
    .eq('site_id', req.params.id)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return res.status(500).json({ error: error.message });

  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('conversation_id')
    .eq('site_id', req.params.id);
  if (leadError) return res.status(500).json({ error: leadError.message });

  const leadConvIds = new Set(leads.map((l) => l.conversation_id));
  res.json(conversations.map((c) => ({ ...c, has_lead: leadConvIds.has(c.id) })));
});

export default router;
