# Fieldr

AI chatbots for Irish SMEs, sold as a monthly subscription. One admin dashboard
(you), one portal per client, one embeddable chat widget per client website.

## How the project is organised

| Folder            | What it is                                                       | Lives at              |
|-------------------|-----------------------------------------------------------------|-----------------------|
| `server/`         | The backend API. Talks to Claude, Supabase and Stripe.          | fieldr.ie             |
| `server/public/`  | The landing page (`index.html`) + chat widget (`widget.js`), served by the backend. | fieldr.ie |
| `dashboard/`      | Your admin dashboard. React app.                                | app.fieldr.ie         |
| `portal/`         | The client login portal. React app.                             | portal.fieldr.ie      |
| `database/`       | SQL files — run once each in Supabase to create the tables.      | Supabase              |

See **[DEPLOY.md](DEPLOY.md)** for the full step-by-step Railway deployment guide.

## Tech stack

- **Frontend:** React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** PostgreSQL via Supabase
- **AI:** Anthropic API (claude-haiku-4-5 for the customer-facing chatbots)
- **Payments:** Stripe subscriptions
- **Hosting:** Railway

## Plans

| Plan    | Price      | Includes                                              |
|---------|------------|-------------------------------------------------------|
| Starter | €149/month | 1 bot, up to 500 chats/month                          |
| Growth  | €249/month | 1 bot, unlimited chats, lead capture                  |
| Pro     | €399/month | 3 bots, unlimited chats, lead capture, priority support |

## Running everything locally

Two terminals:

```
# Terminal 1 — the backend API
cd server
npm install        (first time only)
copy .env.example .env   (then fill in your keys)
npm run dev        -> http://localhost:3001/health

# Terminal 2 — the admin dashboard
cd dashboard
npm install        (first time only)
npm run dev        -> http://localhost:5173

# Terminal 3 — the client portal
cd portal
npm install        (first time only)
npm run dev        -> http://localhost:5174
```

## Build progress

- [x] Project structure
- [x] Database schema (`database/schema.sql`)
- [x] Backend skeleton with health check
- [x] Backend: connected to Supabase (`/health/db`)
- [x] Backend: client management API (`/api/clients`)
- [x] Backend: chat endpoint with Claude + knowledge base (`/api/chat`)
- [x] Backend: lead capture (bot files leads automatically via tool use)
- [x] Backend: Stripe subscriptions + webhooks (`/api/billing`, `/api/stripe/webhook`)
- [x] Backend: admin authentication (`/api/admin/login`; guards on all admin APIs)
- [x] Admin login gate on the dashboard
- [x] Chat widget (`server/public/widget.js`, served at `/widget/CLIENT_ID`, preview at `/demo/CLIENT_ID`)
- [x] Admin dashboard: skeleton + client management (`dashboard/`, run with `npm run dev`)
- [x] Admin dashboard: stats (MRR, chats, leads) + conversation history
- [x] Client portal (`portal/`, run with `npm run dev` on :5174; email+password login)
- [x] Landing page (`server/public/index.html` — served at the backend root)
- [x] Deploy prep: production builds, env-driven API URLs, self-contained backend ([DEPLOY.md](DEPLOY.md))
- [x] Website crawler: auto-build a site's knowledge base from its website (`/api/sites/:id/crawl`)
- [x] Multi-site: clients (accounts) can have multiple sites (Pro: 3, others: 1) — run `database/add-multi-site.sql`
- [x] Lead email notifications via Resend (emails the client's contact email on each captured lead)
- [x] Widget notification chime (Web Audio; plays on bot reply only when the chat window is open)
- [x] Prospects page: sales pipeline + AI cold-email generator (`/api/prospects`) — run `database/add-prospects.sql`
- [ ] Deploy to Railway + connect domains (follow DEPLOY.md)
- [ ] Deploy to Railway + connect fieldr.ie
