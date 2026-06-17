import { supabase } from './db.js';

const SITE_FIELDS =
  'id, client_id, name, brand_color, bot_name, welcome_message, clients(name, status)';

// Look up a site for the widget/chat, accepting EITHER a real site id OR a
// legacy client id (so embed codes created before multi-site still work — they
// resolve to that client's first site). Returns the site row (with the parent
// account's name + status) or null.
export async function resolveSite(id) {
  const bySite = await supabase
    .from('sites')
    .select(SITE_FIELDS)
    .eq('id', id)
    .maybeSingle();
  if (bySite.data) return bySite.data;

  const byClient = await supabase
    .from('sites')
    .select(SITE_FIELDS)
    .eq('client_id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return byClient.data || null;
}
