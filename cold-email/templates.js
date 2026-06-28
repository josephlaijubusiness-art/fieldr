// templates.js — friendly, casual cold-email templates per business type.
//
// Every template gets these variables filled in:
//   {{contact}}  - first name of the contact person
//   {{business}} - the business name
//   {{type}}     - human-readable business type
//   {{sender}}   - your name / sign-off (set in config.js)
//   {{company}}  - your company name (Fieldr)
//   {{calendar}} - your demo booking link
//
// CTA across all templates: "Book a 15-min demo".

const SIGNOFF = `Cheers,
{{sender}}
{{company}} — {{calendar}}`;

// Per-type "hook" — the one line that makes the email feel written for them.
const TEMPLATES = {
  gym: {
    subject: "Quick idea for {{business}} 👋",
    body: `Hi {{contact}},

I was looking at {{business}} online and noticed something a lot of Ashbourne gyms run into: people land on your site (or your Instagram) at 9pm wanting to ask about membership or a free trial, and there's no one around to answer until the morning. By then half of them have moved on.

We built {{company}} to fix exactly that — it's a little AI assistant that lives on your website and answers those questions instantly, 24/7. Things like "how much is a monthly membership?", "do you do classes on Saturdays?", "can I book a trial?" — and it captures their name and number so you can follow up.

Most gyms we talk to are losing 5–10 enquiries a week just to slow replies.

Worth a quick look? Book a 15-min demo and I'll show you exactly how it'd work for {{business}}: {{calendar}}`,
  },

  car_dealer: {
    subject: "Catching after-hours car enquiries at {{business}}",
    body: `Hi {{contact}},

Quick one — when someone's browsing cars on the {{business}} site at 10pm and wants to know "is this still available?" or "can I book a test drive?", what happens to that enquiry?

For most dealers, it sits in an inbox until the next day. We built {{company}} so it doesn't have to — it's an AI assistant on your website that answers buyer questions instantly and grabs their details so your sales team can ring them while they're still interested.

It knows your stock, your finance options, your opening hours — whatever you train it on.

Want to see it on your own listings? Book a 15-min demo here: {{calendar}}`,
  },

  restaurant: {
    subject: "Bookings & questions for {{business}}, handled 24/7",
    body: `Hi {{contact}},

Loved the look of {{business}}. Here's a small thing that adds up: people checking your site for "are you open Sunday?", "do you cater for coeliac?", or "can I book a table for 8?" — and if no one replies quickly, they just book somewhere else.

{{company}} is an AI assistant for your website that answers all of those instantly and takes booking requests, even when the kitchen's slammed or you're closed. It frees your staff from the phone during service.

Takes about 10 minutes to set up. Fancy a look? Book a 15-min demo: {{calendar}}`,
  },

  solicitor: {
    subject: "Turning website visitors into enquiries for {{business}}",
    body: `Hi {{contact}},

A lot of people who need a solicitor start by quietly checking a few websites late at night — and they rarely pick up the phone first. If {{business}}'s site can't answer "do you handle conveyancing?" or "how do I book a consultation?" right then, that enquiry often goes to whoever responds first.

{{company}} is a professional AI assistant for your website that answers common questions, explains your service areas, and captures the person's details for a proper follow-up — all in your firm's tone, nothing it shouldn't say.

Happy to show you how it'd handle real enquiries for {{business}}. Book a 15-min demo: {{calendar}}`,
  },

  accountant: {
    subject: "Fewer 'quick questions', more booked clients for {{business}}",
    body: `Hi {{contact}},

This time of year especially, I'd guess {{business}} gets a steady trickle of "do you do sole-trader returns?" and "what do you charge for a limited company?" landing on your website and in your inbox.

{{company}} is an AI assistant that handles those instantly on your site — answering the FAQs, qualifying the person, and capturing their details so you only spend time on the enquiries worth your while. It's like having someone on the front desk who never clocks off.

Worth 15 minutes to see it with your own services? Book a demo here: {{calendar}}`,
  },

  beauty_salon: {
    subject: "Never miss a booking enquiry at {{business}} 💅",
    body: `Hi {{contact}},

Quick idea for {{business}} — most of your booking questions probably come in the evenings on Instagram and your website: "do you have anything Saturday?", "how much for a full set?", "do you do bridal?". If they don't get an answer fast, they scroll to the next salon.

{{company}} is an AI assistant for your website that answers those instantly and captures the client's name and number so you can lock in the booking. No more enquiries lost while you're with a client.

Super quick to set up. Want to see it? Book a 15-min demo: {{calendar}}`,
  },
};

// Follow-up template — short and friendly, used for the `followup` reminder.
const FOLLOWUP = {
  subject: "Re: {{business}} 👋",
  body: `Hi {{contact}},

Just floating this back to the top of your inbox in case it got buried — totally understand things get busy.

The offer still stands: a quick 15-min demo and I'll show you exactly how {{company}} would work for {{business}}, no pressure either way.

Grab a slot whenever suits: {{calendar}}`,
};

function render(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{{${key}}}`
  );
}

function buildEmail(prospect, config, kind = "intro") {
  const tpl = kind === "followup" ? FOLLOWUP : TEMPLATES[prospect.type];
  if (!tpl) {
    throw new Error(`No template for business type "${prospect.type}"`);
  }
  const vars = {
    contact: prospect.contact || "there",
    business: prospect.name,
    type: prospect.type,
    sender: config.sender,
    company: config.company,
    calendar: config.calendar,
  };
  const fullBody = `${tpl.body}\n\n${render(SIGNOFF, vars)}`;
  return {
    to: prospect.email,
    subject: render(tpl.subject, vars),
    body: render(fullBody, vars),
  };
}

module.exports = { buildEmail, TEMPLATES };
