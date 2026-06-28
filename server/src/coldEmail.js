import './env.js';
import Anthropic from '@anthropic-ai/sdk';

// Generates a personalised cold email for a prospect using Claude — replaces
// the old static per-type templates with copy written for each business.

const anthropic = new Anthropic();
const MODEL = 'claude-haiku-4-5';

const COMPANY = 'Fieldr';
const SENDER = process.env.COLD_EMAIL_SENDER || 'Joseph';
const CALENDAR = process.env.COLD_EMAIL_CALENDAR || 'https://cal.com/fieldr/15min';

const TYPE_LABELS = {
  gym: 'gym',
  car_dealer: 'car dealership',
  restaurant: 'restaurant',
  solicitor: 'solicitor firm',
  accountant: 'accountancy practice',
  beauty_salon: 'beauty salon',
};

// Forcing a tool call guarantees clean { subject, body } back — no parsing.
const COMPOSE_TOOL = {
  name: 'compose_email',
  description: 'Return the finished cold email.',
  input_schema: {
    type: 'object',
    properties: {
      subject: { type: 'string', description: 'The email subject line' },
      body: { type: 'string', description: 'The full email body, including the sign-off' },
    },
    required: ['subject', 'body'],
  },
};

export async function composeColdEmail(prospect) {
  const typeLabel = TYPE_LABELS[prospect.type] || 'local business';

  const system = `You are an expert B2B copywriter for ${COMPANY}, which sells an AI chat assistant that lives on a business's website, answers customer questions 24/7, and captures leads. You write to Irish SMEs.

Write a short, warm, genuinely helpful cold email — not salesy, not generic, no buzzwords. Irish tone, plain everyday language. 110–160 words. Open with something specific to how a ${typeLabel} loses enquiries (e.g. after-hours questions going unanswered), then introduce ${COMPANY} as the fix in one or two sentences. One clear call to action: book a 15-minute demo at ${CALENDAR}. Use the recipient's first name. Sign off as ${SENDER} from ${COMPANY}. Do NOT invent specific facts about their particular business — keep personalisation about their industry, not made-up details.`;

  const user = `Business: ${prospect.name}
Type: ${typeLabel}
Contact first name: ${prospect.contact || 'there'}
Website: ${prospect.website || 'n/a'}

Write the email and return it via the compose_email tool.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 800,
    system,
    tools: [COMPOSE_TOOL],
    tool_choice: { type: 'tool', name: 'compose_email' },
    messages: [{ role: 'user', content: user }],
  });

  const block = response.content.find((b) => b.type === 'tool_use');
  if (!block) throw new Error('Could not generate the email — please try again.');

  return {
    subject: String(block.input.subject || '').trim(),
    body: String(block.input.body || '').trim(),
  };
}
