import { Router } from 'express';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveSite } from '../resolveSite.js';

// Everything the embeddable widget needs from the server:
//   GET /widget/:siteId            -> the widget JavaScript (the embed code points here)
//   GET /api/widget/:siteId/config -> public look-and-feel (colour, bot name, welcome)
//   GET /demo/:siteId              -> a fake business page to preview any site's bot
// The :siteId may be a new site id OR a legacy client id (resolved either way).

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const WIDGET_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'public', 'widget.js'
);

router.get('/widget/:siteId', async (req, res) => {
  const { siteId } = req.params;
  if (!UUID_REGEX.test(siteId)) {
    return res.status(400).type('text/plain').send('// Invalid Fieldr site id');
  }
  const source = await readFile(WIDGET_PATH, 'utf8');
  res
    .type('application/javascript')
    .set('Cache-Control', 'public, max-age=300')
    .send(source.replaceAll('__SITE_ID__', siteId));
});

// Public config — deliberately returns ONLY what the widget needs to draw
// itself. No Stripe IDs, no knowledge base, no contact details.
router.get('/api/widget/:siteId/config', async (req, res) => {
  const { siteId } = req.params;
  if (!UUID_REGEX.test(siteId)) {
    return res.status(400).json({ error: 'Invalid site id' });
  }

  const site = await resolveSite(siteId);
  if (!site) return res.status(404).json({ error: 'Unknown site' });
  const status = site.clients?.status;
  if (status === 'paused' || status === 'cancelled') {
    return res.status(403).json({ error: 'Chat unavailable' });
  }

  res.set('Cache-Control', 'public, max-age=60').json({
    bot_name: site.bot_name,
    brand_color: site.brand_color,
    welcome_message: site.welcome_message,
  });
});

// A pretend business website so you can preview any site's bot live.
router.get('/demo/:siteId', (req, res) => {
  const { siteId } = req.params;
  if (!UUID_REGEX.test(siteId)) {
    return res.status(400).type('text/plain').send('Invalid site id');
  }
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fieldr widget demo</title>
<style>
  body{font-family:Georgia,serif;margin:0;color:#2b2b2b;background:#fdfbf7}
  header{background:#1f2d3d;color:#fff;padding:48px 24px;text-align:center}
  header h1{margin:0 0 8px;font-size:34px}
  main{max-width:680px;margin:40px auto;padding:0 24px;line-height:1.7;font-size:17px}
  .note{background:#fff5d6;border:1px solid #e8d489;border-radius:8px;padding:14px 18px;font-family:sans-serif;font-size:14px}
</style>
</head>
<body>
<header><h1>An Example Business Ltd.</h1><p>This is a pretend client website.</p></header>
<main>
<p class="note">This page previews the Fieldr chat widget exactly as it would appear on a client's
real website. The bubble in the bottom-right corner is live — click it and talk to the bot.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras commodo, nibh in faucibus
porttitor, justo magna lacinia velit, ut suscipit nibh dui in mi. Integer posuere erat a ante.</p>
<p>Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae;
Donec velit neque, auctor sit amet aliquam vel, ullamcorper sit amet ligula.</p>
</main>
<script src="/widget/${siteId}"></script>
</body>
</html>`);
});

export default router;
