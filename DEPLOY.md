# Deploying Fieldr to Railway

Fieldr is **three deployable apps** from this one repo, plus the landing page
(served by the backend):

| Service in Railway | Folder (Root Directory) | Custom domain        | What it is                          |
|--------------------|-------------------------|----------------------|-------------------------------------|
| `fieldr-backend`   | `server`                | **fieldr.ie**        | API + landing page + widget         |
| `fieldr-dashboard` | `dashboard`             | **app.fieldr.ie**    | Your admin dashboard                |
| `fieldr-portal`    | `portal`                | **portal.fieldr.ie** | Client login portal                 |

The dashboard and portal are static sites that talk to the backend at
`https://fieldr.ie`. The backend serves the marketing site at `https://fieldr.ie`
and the API at `https://fieldr.ie/api/...`.

---

## Step 1 — Put the code on GitHub

Railway deploys from a GitHub repo. In PowerShell, from the project folder:

```
cd Desktop\fieldr
git add .
git commit -m "Fieldr ready for deploy"
```

Then create an empty repo on github.com (e.g. `fieldr`), and connect + push:

```
git remote add origin https://github.com/<your-username>/fieldr.git
git branch -M main
git push -u origin main
```

> Your `.env` files are **not** uploaded (they're git-ignored). You'll re-enter
> those secrets in Railway in Step 3 — that's expected and correct.

---

## Step 2 — Create the Railway project and three services

1. Go to [railway.app](https://railway.app) → sign in with GitHub → **New Project**.
2. Choose **Deploy from GitHub repo** → pick your `fieldr` repo. Railway creates
   one service. Open it → **Settings** → set **Root Directory** to `server`.
   Rename the service to `fieldr-backend` (Settings → name).
3. Back in the project, click **+ New** → **GitHub Repo** → same repo again.
   Set its **Root Directory** to `dashboard`. Name it `fieldr-dashboard`.
4. Repeat once more for **Root Directory** `portal`, named `fieldr-portal`.

You now have three services in one project. Each builds and runs on its own.

---

## Step 3 — Set the environment variables

In each service: **Variables** tab → add the values below. (Copy the secret
values from your local `server\.env`.)

### `fieldr-backend`

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | from console.anthropic.com |
| `SUPABASE_URL` | from Supabase → Settings → API |
| `SUPABASE_KEY` | the **service_role** secret key |
| `JWT_SECRET` | a long random string (reuse your local one, or generate a new one) |
| `ADMIN_EMAIL` | your admin login email |
| `ADMIN_PASSWORD` | your admin login password |
| `STRIPE_SECRET_KEY` | **live** key `sk_live_...` (see Step 5) |
| `STRIPE_WEBHOOK_SECRET` | **live** webhook secret `whsec_...` (see Step 5) |
| `STRIPE_PRICE_STARTER` | live price id (see Step 5) |
| `STRIPE_PRICE_GROWTH` | live price id (see Step 5) |
| `STRIPE_PRICE_PRO` | live price id (see Step 5) |
| `DASHBOARD_URL` | `https://app.fieldr.ie` |

> Don't set `PORT` — Railway sets it automatically.

### `fieldr-dashboard`

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://fieldr.ie` |
| `VITE_PORTAL_URL` | `https://portal.fieldr.ie` |

### `fieldr-portal`

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://fieldr.ie` |

> **Important:** the dashboard/portal `VITE_*` values are baked in **at build
> time**. If you change them later, hit **Deploy** again to rebuild.

---

## Step 4 — Domains

For each service: **Settings → Networking → Custom Domain**.

1. `fieldr-backend` → add **fieldr.ie** (and optionally `www.fieldr.ie`).
2. `fieldr-dashboard` → add **app.fieldr.ie**.
3. `fieldr-portal` → add **portal.fieldr.ie**.

Railway shows you the DNS record to create for each. Add them at your domain
registrar (where you bought fieldr.ie):

- **Subdomains** (`app.`, `portal.`, `www.`) → add a **CNAME** record pointing to
  the value Railway shows.
- **The apex `fieldr.ie`** can't use a plain CNAME (a DNS rule). Easiest fix:
  move your DNS to **Cloudflare** (free) and add a CNAME — Cloudflare flattens it
  automatically. Or use whatever ALIAS/ANAME record Railway recommends for your
  registrar.

DNS can take a few minutes to a few hours. Railway issues HTTPS certificates
automatically once the records resolve.

> Tip: to start testing immediately, each service also has a free
> `*.up.railway.app` URL under Networking. You can verify everything works on
> those first, then add the custom domains.

---

## Step 5 — Switch Stripe to live mode

1. In Stripe, toggle **Test mode OFF** (top right) → you're now in live mode.
2. **Developers → API keys** → copy the live **Secret key** (`sk_live_...`) into
   `fieldr-backend`'s `STRIPE_SECRET_KEY`.
3. Create the live plans: on your computer, temporarily put the live key in
   `server\.env`, then run `node scripts/setup-stripe.mjs`. Paste the three
   `STRIPE_PRICE_*` lines it prints into `fieldr-backend`'s variables. (Then put
   your test key back in your local `.env`.)
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://fieldr.ie/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - After creating it, copy the **Signing secret** (`whsec_...`) into
     `fieldr-backend`'s `STRIPE_WEBHOOK_SECRET`.
5. Redeploy `fieldr-backend` so it picks up the new variables.

---

## Step 6 — Final checks

- Visit **https://fieldr.ie** → the landing page loads; submit the demo form →
  it should say "Thanks!" (and appear in your dashboard's Contact requests).
- Visit **https://app.fieldr.ie** → log in with your admin email/password.
- Add a real client, set their knowledge base, open their **Embed code** tab —
  it should show `https://fieldr.ie/widget/...`.
- Open that client's **Demo page** and chat with the bot.
- Set a portal password for the client, then log in at
  **https://portal.fieldr.ie**.
- Do a real (live) checkout from a client's Billing tab to confirm the webhook
  flips them to Active. (You can refund yourself in Stripe afterwards.)

That's it — Fieldr is live. 🎉
