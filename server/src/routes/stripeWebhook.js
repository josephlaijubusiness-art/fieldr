import { stripe } from '../stripe.js';
import { supabase } from '../db.js';

// Stripe calls this endpoint to tell us about payments and subscription
// changes. It must verify Stripe's signature against the RAW request body,
// which is why index.js registers it before express.json().

// Translate Stripe's subscription statuses into our four client statuses.
const STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'paused',
  unpaid: 'paused',
  paused: 'paused',
  canceled: 'cancelled',
  incomplete: 'trial',
  incomplete_expired: 'cancelled',
};

// Update a client either by the client_id we stamped into Stripe metadata,
// or by the subscription id if metadata is missing.
async function updateClient({ clientId, subscriptionId }, fields) {
  let query = supabase.from('clients').update(fields);
  query = clientId ? query.eq('id', clientId) : query.eq('stripe_subscription_id', subscriptionId);
  const { error } = await query;
  if (error) console.error('Stripe webhook DB update failed:', error.message);
}

export async function stripeWebhook(req, res) {
  if (!stripe) return res.status(503).send('Stripe not configured');

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — cannot verify webhooks.');
    return res.status(503).send('Webhook secret not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw Buffer, thanks to express.raw in index.js
      req.headers['stripe-signature'],
      secret
    );
  } catch (err) {
    console.error('Stripe webhook signature check failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await updateClient(
          { clientId: session.metadata?.client_id },
          {
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            status: 'active',
          }
        );
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await updateClient(
          { clientId: sub.metadata?.client_id, subscriptionId: sub.id },
          {
            stripe_customer_id: sub.customer,
            stripe_subscription_id: sub.id,
            status: STATUS_MAP[sub.status] || 'paused',
          }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateClient(
          { clientId: sub.metadata?.client_id, subscriptionId: sub.id },
          { status: 'cancelled' }
        );
        break;
      }

      default:
        // Other events are fine to ignore.
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
