-- ============================================================
-- Fieldr database schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
-- ============================================================

-- ------------------------------------------------------------
-- CLIENTS
-- One row per business you sign up. Holds their branding,
-- their plan, and their Stripe billing references.
-- ------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,                          -- business name, e.g. "Murphy's Plumbing"
  domain text,                                 -- their website, e.g. "murphysplumbing.ie"
  contact_email text,                          -- main contact / portal login email
  brand_color text not null default '#2563EB', -- hex colour used by their widget
  bot_name text not null default 'Assistant',  -- name shown in the chat window
  welcome_message text not null default 'Hi! How can I help you today?',
  plan text not null default 'starter'
    check (plan in ('starter', 'growth', 'pro')),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'paused', 'cancelled')),
  stripe_customer_id text,                     -- set when they're added to Stripe
  stripe_subscription_id text,                 -- set when their subscription starts
  portal_user_id uuid,                         -- links to their Supabase Auth login (added later)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- KNOWLEDGE BASES
-- One per client. The plain-text info their bot answers from.
-- ------------------------------------------------------------
create table knowledge_bases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references clients(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CONVERSATIONS
-- One row per chat session a website visitor has with a bot.
-- The individual messages live in the messages table below.
-- ------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_id text not null,                    -- random ID the widget gives each visitor
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index conversations_client_idx on conversations (client_id);
create index conversations_session_idx on conversations (client_id, session_id);

-- ------------------------------------------------------------
-- MESSAGES
-- Every message in every conversation, with who sent it.
-- ------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('visitor', 'bot')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id);

-- ------------------------------------------------------------
-- LEADS
-- Captured when a visitor shares contact details with a bot.
-- ------------------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  name text,
  email text,
  phone text,
  trigger_message text,                        -- the visitor message that led to capture
  created_at timestamptz not null default now()
);

create index leads_client_idx on leads (client_id);

-- ------------------------------------------------------------
-- SECURITY: row level security (RLS)
-- We switch RLS on with NO public policies. That means the
-- public/anon Supabase key can read NOTHING. Only our backend,
-- using the secret service-role key, can touch the data.
-- This is what keeps each client's data fully separate:
-- every backend query filters by client_id, and nobody can
-- query the database directly from a browser.
-- ------------------------------------------------------------
alter table clients enable row level security;
alter table knowledge_bases enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table leads enable row level security;

-- ------------------------------------------------------------
-- Housekeeping: keep updated_at columns accurate automatically
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on clients
  for each row execute function set_updated_at();

create trigger knowledge_bases_updated_at
  before update on knowledge_bases
  for each row execute function set_updated_at();
