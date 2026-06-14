import './env.js';
import { createClient } from '@supabase/supabase-js';

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
});
