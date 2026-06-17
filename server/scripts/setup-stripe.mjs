// One-time helper: creates the three Fieldr subscription plans in your
// Stripe account and prints the price IDs to paste into server/.env.
//
// Run it once (from the server folder):   node scripts/setup-stripe.mjs
//
// Safe to run again — it makes new products each time, so only run it when
// you actually need fresh prices (e.g. first setup, or switching to live mode).

import '../src/env.js';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY is missing from server/.env. Add it first, then re-run.');
  process.exit(1);
}

const stripe = new Stripe(key);

const PLANS = [
  { env: 'STRIPE_PRICE_STARTER', name: 'Fieldr Starter', amount: 4900 },
  { env: 'STRIPE_PRICE_GROWTH', name: 'Fieldr Growth', amount: 9900 },
  { env: 'STRIPE_PRICE_PRO', name: 'Fieldr Pro', amount: 17900 },
];

const live = key.startsWith('sk_live');
console.log(`\nCreating plans in Stripe ${live ? 'LIVE' : 'TEST'} mode...\n`);

const lines = [];
for (const plan of PLANS) {
  const product = await stripe.products.create({ name: plan.name });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amount, // in cents: 4900 = €49.00
    currency: 'eur',
    recurring: { interval: 'month' },
  });
  console.log(`  ✓ ${plan.name}: €${(plan.amount / 100).toFixed(0)}/month -> ${price.id}`);
  lines.push(`${plan.env}=${price.id}`);
}

console.log('\nDone! Copy these three lines into server/.env:\n');
console.log(lines.join('\n'));
console.log('\nThen restart the server.\n');
