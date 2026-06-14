import './env.js';
import Stripe from 'stripe';

// One shared Stripe client. If the secret key isn't set yet, we leave it
// null so the rest of the server still runs — the billing endpoints return
// a clear "not configured" message instead of crashing on boot.
const key = process.env.STRIPE_SECRET_KEY;
export const stripe = key ? new Stripe(key) : null;

if (!stripe) {
  console.warn('Note: STRIPE_SECRET_KEY not set — billing endpoints are disabled until you add it to server/.env.');
}

// Which Stripe price each plan maps to. Fill these in .env after running
// the one-time setup script (scripts/setup-stripe.mjs).
export const PLAN_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro: process.env.STRIPE_PRICE_PRO,
};
