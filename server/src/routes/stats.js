import { Router } from 'express';
import { supabase } from '../db.js';

// Dashboard stats: totals across all clients + a per-client breakdown.
// GET /api/stats/overview

const router = Router();

// What each plan brings in per month, in euro. Keep in sync with pricing.
const PLAN_PRICES = { starter: 149, growth: 249, pro: 399 };

// Count rows for one client without transferring them (head:true returns
// just the number). This is accurate no matter how big the tables get and
// needs no extra database setup. If the client list grows very large we can
// later swap this for a single grouped SQL query.
async function countFor(table, clientId) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

router.get('/overview', async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, plan, status, brand_color, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    const perClient = await Promise.all(
      clients.map(async (c) => ({
        ...c,
        conversations: await countFor('conversations', c.id),
        leads: await countFor('leads', c.id),
      }))
    );

    // MRR (Monthly Recurring Revenue) counts only paying clients — i.e.
    // those marked "active". Trials and paused/cancelled don't count.
    const mrr = clients
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + (PLAN_PRICES[c.plan] ?? 0), 0);

    const totals = {
      clients: clients.length,
      active: clients.filter((c) => c.status === 'active').length,
      conversations: perClient.reduce((s, c) => s + c.conversations, 0),
      leads: perClient.reduce((s, c) => s + c.leads, 0),
    };

    res.json({ mrr, totals, clients: perClient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
