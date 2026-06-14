import './env.js';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

// One shared connection to Supabase for the whole backend.
// Uses the secret service-role key, so it can read and write
// everything — which is why this key must NEVER leave the server.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'WARNING: SUPABASE_URL or SUPABASE_KEY is missing from server/.env — database calls will fail.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '', {
  auth: { persistSession: false },
  // Node.js below 22 has no built-in WebSocket, so Supabase's realtime client
  // throws on startup ("Node.js 20 detected without native WebSocket support").
  // We don't use realtime, but the client still constructs it — so we hand it
  // the 'ws' package as its transport to keep it happy on Railway (Node 20).
  realtime: { transport: WebSocket },
});
