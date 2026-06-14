import { Router } from 'express';
import { supabase } from '../db.js';

// Reading chat history.
// GET /api/conversations/:id/messages  -> the full transcript of one chat
// (The list of a client's conversations lives in routes/clients.js, since
//  it's scoped to a client id.)

const router = Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  if (!UUID_REGEX.test(id)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, session_id, started_at, last_message_at')
    .eq('id', id)
    .maybeSingle();
  if (convError) return res.status(500).json({ error: convError.message });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });
  if (msgError) return res.status(500).json({ error: msgError.message });

  res.json({ conversation, messages });
});

export default router;
