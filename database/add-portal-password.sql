-- ============================================================
-- Adds a place to store each client's portal login password.
-- The password itself is never stored — only a secure one-way
-- "hash" of it, so even we can't read it back.
--
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================

alter table clients
  add column if not exists portal_password_hash text;
