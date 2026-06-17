-- ============================================================
-- Multi-site support.
--
-- A "client" becomes an ACCOUNT (billing, plan, login). A new "sites" table
-- holds what used to live on the client: name, domain, branding, and (via the
-- tables below) the knowledge base, conversations and leads.
--
-- Every existing client gets one "Main site" carrying their current branding +
-- knowledge base, and their existing conversations/leads are re-pointed to it.
--
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste -> Run.
-- It runs as a single transaction, so it either fully succeeds or changes
-- nothing. Restart/redeploy the backend afterwards.
-- ============================================================

begin;

-- 1. The sites table -------------------------------------------------------
create table sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null default 'Main site',
  domain text,
  brand_color text not null default '#2563EB',
  bot_name text not null default 'Assistant',
  welcome_message text not null default 'Hi! How can I help you today?',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_client_idx on sites (client_id);
alter table sites enable row level security;
create trigger sites_updated_at
  before update on sites
  for each row execute function set_updated_at();

-- 2. Give every existing client one default site (copy their branding) -----
insert into sites (client_id, name, domain, brand_color, bot_name, welcome_message)
select id,
       coalesce(nullif(btrim(name), ''), 'Main site'),
       domain, brand_color, bot_name, welcome_message
from clients;

-- 3. Knowledge base: now one per SITE --------------------------------------
alter table knowledge_bases add column site_id uuid references sites(id) on delete cascade;
update knowledge_bases kb
  set site_id = s.id
  from sites s
  where s.client_id = kb.client_id;
alter table knowledge_bases drop column client_id;   -- drops old unique + fk
alter table knowledge_bases alter column site_id set not null;
alter table knowledge_bases add constraint knowledge_bases_site_id_key unique (site_id);

-- 4. Conversations: belong to a site (client_id kept for easy account rollups)
alter table conversations add column site_id uuid references sites(id) on delete cascade;
update conversations c
  set site_id = s.id
  from sites s
  where s.client_id = c.client_id;
alter table conversations alter column site_id set not null;
create index conversations_site_session_idx on conversations (site_id, session_id);

-- 5. Leads: belong to a site (client_id kept for easy account rollups) ------
alter table leads add column site_id uuid references sites(id) on delete cascade;
update leads l
  set site_id = s.id
  from sites s
  where s.client_id = l.client_id;
alter table leads alter column site_id set not null;
create index leads_site_idx on leads (site_id);

-- 6. The branding now lives on sites, so remove it from clients ------------
alter table clients drop column brand_color;
alter table clients drop column bot_name;
alter table clients drop column welcome_message;
alter table clients drop column domain;

commit;
