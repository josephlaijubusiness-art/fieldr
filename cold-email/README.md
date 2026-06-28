# Fieldr Cold Email CLI

A zero-dependency command-line tool for running cold outreach to Irish SMEs.
Comes pre-loaded with **34 Ashbourne (Co. Meath) businesses** across gyms, car
dealers, restaurants, solicitors, accountants and beauty salons.

No installing, no database, no setup. Just Node.js and your terminal.

---

## Getting started

1. Open a terminal **in this `cold-email` folder**.
2. Run any command below. On the very first run it creates `.data/prospects.json`
   and loads all 34 prospects automatically.

```bash
node cli.js report
```

That's it — you're running.

> **Tip:** every command is `node cli.js` followed by the command name. If you
> see "node is not recognised", close and reopen your terminal, or use the full
> path to node.

---

## Commands

| Command | What it does | Example |
|---|---|---|
| `list` | Show all prospects | `node cli.js list` |
| `list <type>` | Filter by business type | `node cli.js list gym` |
| `email "<name>"` | Generate a personalised email to copy/paste | `node cli.js email "Iron House"` |
| `sent "<name>"` | Mark a prospect as contacted | `node cli.js sent "Iron House"` |
| `reply "<name>" "<message>"` | Log a reply you received | `node cli.js reply "Iron House" "Send pricing"` |
| `followup "<name>" <days>` | Schedule a follow-up N days out | `node cli.js followup "Iron House" 7` |
| `report` | Show metrics + due follow-ups | `node cli.js report` |
| `help` | Show all commands | `node cli.js help` |

**Business types** for filtering: `gym`, `car`, `restaurant`, `solicitor`,
`accountant`, `beauty` (a few aliases like `salon`, `legal`, `motors` also work).

**Names** are matched loosely and case-insensitively — `"iron house"` finds
*Iron House Gym*. If a name matches more than one business, the tool lists them
so you can be more specific.

---

## A typical day

```bash
node cli.js list gym                 # see who you're targeting
node cli.js email "Iron House"       # generate the email, copy it into Gmail, send
node cli.js sent "Iron House"        # mark it sent
node cli.js followup "Iron House" 5  # remind yourself to follow up in 5 days
# ...a few days later...
node cli.js reply "Iron House" "Interested, can you call Tuesday?"
node cli.js report                   # check your reply rate and what's due
```

---

## Customising it

- **Your name, company & demo link** → edit `config.js`. The booking link is set
  to a placeholder (`https://cal.com/fieldr/15min`) — change it to your real one.
- **The email wording** → edit `templates.js`. There's one template per business
  type plus a short follow-up template, all friendly/casual with a
  "Book a 15-min demo" call to action.
- **The prospect list** → edit `seed.js`, then delete `.data/prospects.json` so
  the new list reloads on the next run.

---

## Important note on the prospect data

The 34 businesses are real Ashbourne business *categories* with **realistic
placeholder contact details** so the tool works immediately. **Before you email
anyone, verify each email address and phone number** against the business's own
website or Google Business listing. Sending to guessed/scraped addresses hurts
your deliverability and can breach anti-spam rules (GDPR / ePrivacy in Ireland).

This tool helps you *draft and track* outreach — it does **not** send email. You
copy each generated email into your own inbox and send it yourself, which keeps
you in control and on the right side of the rules.

---

## Files

```
cold-email/
├── cli.js          # the command-line tool (run this)
├── seed.js         # the 34 pre-loaded Ashbourne prospects
├── templates.js    # email templates per business type
├── config.js       # your name, company, demo link
├── package.json    # npm scripts (optional)
├── README.md       # this file
└── .data/
    └── prospects.json   # your live data (created on first run, git-ignored)
```
