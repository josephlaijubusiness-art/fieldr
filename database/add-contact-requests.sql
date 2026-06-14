-- ============================================================
-- Stores demo/contact requests from the fieldr.ie landing page.
-- These are prospects (not yet clients), so they get their own table.
--
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business text,
  email text not null,
  message text,
  handled boolean not null default false,   -- tick off once you've followed up
  created_at timestamptz not null default now()
);

-- Same security model as the rest of Fieldr: RLS on, no public policies,
-- so only the backend (service-role key) can read or write these.
alter table contact_requests enable row level security;
