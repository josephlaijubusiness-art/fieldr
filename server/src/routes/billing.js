import { Router } from 'express';
import { supabase } from '../db.js';
import { stripe, PLAN_PRICE_IDS } from '../stripe.js';

// Billing actions the admin dashboard triggers.
//   POST /api/billing/:clientId/checkout -> a Stripe link to start a subscription
//   POST /api/billing/:clientId/portal   -> a Stripe link to manage an existing one

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Where Stripe sends the user back to after checkout / the portal.
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

function ensureStripe(res) {
  if (!stripe) {
    res.status(503).json({
      error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to server/.env.',
    });
    return false;
  }
  return true;
}

async function loadClient(res, clientId) {
  if (!UUID_REGEX.test(clientId)) {
    res.status(400).json({ error: 'Invalid client id' });
    return null;
  }
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!data) {
    res.status(404).json({ error: 'Client not found' });
    return null;
  }
  return data;
}

// Start a subscription: returns a hosted Stripe Checkout link.
router.post('/:clientId/checkout', async (req, res) => {
  if (!ensureStripe(res)) return;
  const client = await loadClient(res, req.params.clientId);
  if (!client) return;

  const priceId = PLAN_PRICE_IDS[client.plan];
  if (!priceId) {
    return res.status(400).json({
      error: `No Stripe price set for the "${client.plan}" plan. Run the setup script and add the price IDs to server/.env.`,
    });
  }

  try {
    // Reuse a Stripe customer if this client already has one.
    let customerId = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: client.name,
        email: client.contact_email || undefined,
        metadata: { client_id: client.id },
      });
      customerId = customer.id;
      await supabase
        .from('clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', client.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${DASHBOARD_URL}/clients/${client.id}?billing=success`,
      cancel_url: `${DASHBOARD_URL}/clients/${client.id}?billing=cancelled`,
      // client_id travels with the payment so the webhook knows who paid.
      metadata: { client_id: client.id },
      subscription_data: { metadata: { client_id: client.id } },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Manage an existing subscription: returns a Stripe Billing Portal link.
router.post('/:clientId/portal', async (req, res) => {
  if (!ensureStripe(res)) return;
  const client = await loadClient(res, req.params.clientId);
  if (!client) return;

  if (!client.stripe_customer_id) {
    return res.status(400).json({ error: 'This client has no billing set up yet.' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripe_customer_id,
      return_url: `${DASHBOARD_URL}/clients/${client.id}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
