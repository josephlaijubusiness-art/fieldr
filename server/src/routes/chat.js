import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../db.js';
import { resolveSite } from '../resolveSite.js';
import { sendLeadNotification } from '../email.js';

// The chat endpoint. This is what each site's widget talks to.
// POST /api/chat  body: { site_id, session_id, message }
// (Also accepts a legacy { client_id } from old embed codes.)

const router = Router();
const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from .env

const MODEL = 'claude-haiku-4-5';
const MAX_REPLY_TOKENS = 1024; // chat replies are deliberately short
const MAX_HISTORY = 20; // how many past messages the bot remembers per chat
const MAX_MESSAGE_LENGTH = 4000;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The one tool the bot has: filing a lead when a visitor wants follow-up.
const CAPTURE_LEAD_TOOL = {
  name: 'capture_lead',
  description:
    'Save the visitor\'s contact details so the business can follow up with them. ' +
    'Call this as soon as the visitor has shared an email address or phone number — ' +
    'for example when they ask to be contacted, want a quote or callback, or you ' +
    'could not answer their question and they agreed to leave their details. ' +
    'Do not call it before you actually have an email or phone number.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: "The visitor's name, if given" },
      email: { type: 'string', description: "The visitor's email address" },
      phone: { type: 'string', description: "The visitor's phone number" },
    },
    required: [],
  },
};

function buildSystemPrompt(botName, businessName, knowledge) {
  return `You are ${botName}, the friendly chat assistant on the website of ${businessName}.

Rules:
- Answer questions using ONLY the business information below. Never invent prices, opening hours, services, or policies that are not in it.
- If the information needed is not there, say you're not sure and offer to take the visitor's name and email or phone number so the team can follow up.
- Keep replies short and helpful: 1-4 sentences, plain everyday language, no markdown formatting.
- Stay on topic. If asked about anything unrelated to this business, politely steer back.
- When a visitor wants to be contacted and has given an email or phone number, use the capture_lead tool, then confirm warmly that the team will be in touch.

Business information:
"""
${knowledge || '(No business information has been added yet. Apologise that you cannot answer detailed questions right now, and offer to take their contact details so the team can follow up.)'}
"""`;
}

// Save a lead and tell the bot how it went, so it can confirm to the visitor.
// On success, emails the client a notification in the background (best effort —
// a failed/disabled email never affects lead capture or the chat).
async function saveLead(site, conversationId, input, triggerMessage) {
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';

  if (!email && !phone) {
    return {
      ok: false,
      result: 'No email or phone number was provided. Ask the visitor for one before saving.',
    };
  }

  const { error } = await supabase.from('leads').insert({
    site_id: site.id,
    client_id: site.client_id,
    conversation_id: conversationId,
    name: name || null,
    email: email || null,
    phone: phone || null,
    trigger_message: triggerMessage,
  });

  if (error) {
    console.error('Failed to save lead:', error.message);
    return {
      ok: false,
      result: 'Saving failed due to a technical problem. Apologise and suggest they try again shortly.',
    };
  }

  // Notify the client by email — fire-and-forget so the chat reply isn't delayed.
  sendLeadNotification({
    to: site.clients?.contact_email,
    accountName: site.clients?.name,
    siteName: site.name,
    name,
    email,
    phone,
    triggerMessage,
  }).catch(() => {});

  return { ok: true, result: 'Contact details saved. The team will follow up.' };
}

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  // The widget sends site_id; old embed codes send client_id. Either works.
  const id = body.site_id || body.client_id;
  const { session_id, message } = body;

  // --- 1. Check the request makes sense ---
  if (!UUID_REGEX.test(id ?? '')) {
    return res.status(400).json({ error: 'Invalid site id' });
  }
  if (typeof session_id !== 'string' || !session_id.trim() || session_id.length > 100) {
    return res.status(400).json({ error: 'Invalid session_id' });
  }
  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'message must be 1-4000 characters of text' });
  }
  const visitorMessage = message.trim();

  // --- 2. Resolve the site (and its account), then load its knowledge base ---
  const site = await resolveSite(id);
  if (!site) return res.status(404).json({ error: 'Unknown site' });

  const accountStatus = site.clients?.status;
  if (accountStatus === 'paused' || accountStatus === 'cancelled') {
    return res.status(403).json({ error: 'This chat is currently unavailable.' });
  }

  const { data: kb, error: kbError } = await supabase
    .from('knowledge_bases')
    .select('content')
    .eq('site_id', site.id)
    .maybeSingle();
  if (kbError) return res.status(500).json({ error: kbError.message });
  const knowledge = kb?.content ?? '';

  // --- 3. Find this visitor's conversation, or start a new one ---
  let { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('site_id', site.id)
    .eq('session_id', session_id)
    .maybeSingle();

  if (convError) return res.status(500).json({ error: convError.message });

  if (!conversation) {
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert({ site_id: site.id, client_id: site.client_id, session_id })
      .select('id')
      .single();
    if (createError) return res.status(500).json({ error: createError.message });
    conversation = created;
  }

  // --- 4. Save the visitor's message ---
  const { error: msgError } = await supabase
    .from('messages')
    .insert({ conversation_id: conversation.id, role: 'visitor', content: visitorMessage });
  if (msgError) return res.status(500).json({ error: msgError.message });

  // --- 5. Load recent history (includes the message we just saved) ---
  const { data: recent, error: histError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY);
  if (histError) return res.status(500).json({ error: histError.message });

  const history = recent.reverse().map((m) => ({
    role: m.role === 'visitor' ? 'user' : 'assistant',
    content: m.content,
  }));
  // The API requires the first message to be from the user; if trimming the
  // history left a bot message first, drop it.
  while (history.length && history[0].role !== 'user') history.shift();

  // --- 6. Ask Claude for a reply ---
  // The system prompt (instructions + knowledge base) is identical for every
  // message to this site's bot, so we mark it cacheable: repeat requests
  // within a few minutes cost ~90% less for that portion.
  const businessName = site.clients?.name || 'us';
  const system = [
    {
      type: 'text',
      text: buildSystemPrompt(site.bot_name, businessName, knowledge),
      cache_control: { type: 'ephemeral' },
    },
  ];

  try {
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_REPLY_TOKENS,
      system,
      tools: [CAPTURE_LEAD_TOOL],
      messages: history,
    });

    // If the bot decided to save a lead, do it, then let it compose
    // its confirmation message with the result in hand.
    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const outcome = await saveLead(site, conversation.id, block.input, visitorMessage);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: outcome.result,
          is_error: !outcome.ok,
        });
      }

      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_REPLY_TOKENS,
        system,
        tools: [CAPTURE_LEAD_TOOL],
        messages: [
          ...history,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ],
      });
    }

    const reply = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    const safeReply =
      reply || "Sorry, I couldn't come up with a reply just now. Please try again.";

    // --- 7. Save the bot's reply and bump the conversation timestamp ---
    await supabase
      .from('messages')
      .insert({ conversation_id: conversation.id, role: 'bot', content: safeReply });
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation.id);

    res.json({ reply: safeReply, conversation_id: conversation.id });
  } catch (err) {
    console.error('Claude API error:', err?.message ?? err);
    res.status(502).json({
      error: "The assistant couldn't reply just now. Please try again in a moment.",
    });
  }
});

export default router;
