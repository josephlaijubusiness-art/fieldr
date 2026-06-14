import './env.js';
import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './db.js';
import clientsRouter from './routes/clients.js';
import chatRouter from './routes/chat.js';
import widgetRouter from './routes/widget.js';
import statsRouter from './routes/stats.js';
import conversationsRouter from './routes/conversations.js';
import billingRouter from './routes/billing.js';
import { stripeWebhook } from './routes/stripeWebhook.js';
import portalRouter from './routes/portal.js';
import contactRouter from './routes/contact.js';
import adminRouter from './routes/admin.js';
import { requireAdminAuth } from './auth.js';

const app = express();

// Allow the widget (running on any client's website) and our own
// dashboard to call this API from the browser.
app.use(cors());

// The Stripe webhook must see the RAW request body to verify Stripe's
// signature, so it's registered here BEFORE express.json() parses bodies.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());

// Health check: a simple way to confirm the server is alive.
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fieldr-api',
    time: new Date().toISOString(),
  });
});

// Admin login (public — this is how you get a token)
app.use('/api/admin', adminRouter);

// --- Admin-only APIs. requireAdminAuth blocks anyone without a valid login. ---
// Client management: add, list, update, delete clients + knowledge bases
app.use('/api/clients', requireAdminAuth, clientsRouter);

// Dashboard stats (MRR, chats, leads) and chat-history transcripts
app.use('/api/stats', requireAdminAuth, statsRouter);
app.use('/api/conversations', requireAdminAuth, conversationsRouter);

// Stripe billing actions (checkout + portal links)
app.use('/api/billing', requireAdminAuth, billingRouter);

// --- Public APIs (no admin login). ---
// Visitor chat: the endpoint every client's widget talks to
app.use('/api/chat', chatRouter);

// Client portal: clients log in to see their own stats, chats, leads, KB
app.use('/api/portal', portalRouter);

// Landing-page demo/contact form submissions
app.use('/api/contact', contactRouter);

// Serve the fieldr.ie landing page at the root. It lives in server/public so
// the backend is self-contained when deployed on its own.
const LANDING_PAGE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', 'public', 'index.html'
);
app.get('/', async (req, res) => {
  try {
    res.type('html').send(await readFile(LANDING_PAGE, 'utf8'));
  } catch {
    res.json({ service: 'fieldr-api', status: 'ok' });
  }
});

// The embeddable widget: script, public config, and demo preview page
app.use(widgetRouter);

// Database health check: tries a tiny query against the clients
// table. If the URL or key in .env is wrong, this tells you.
app.get('/health/db', async (req, res) => {
  const { count, error } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
  res.json({ status: 'ok', database: 'connected', clients: count });
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Fieldr API running at http://localhost:${port}`);
});
