import './env.js';
import { Resend } from 'resend';

// Sends the "you got a lead" email via Resend. Optional: if RESEND_API_KEY
// isn't set, sending is skipped (lead capture still works). A send failure is
// logged but never thrown, so it can't break the chat.

const apiKey = process.env.RESEND_API_KEY;
// Until you verify fieldr.ie in Resend, you can only send from their test
// address (onboarding@resend.dev) to your own signup email. After verifying,
// set RESEND_FROM to something like: Fieldr <leads@fieldr.ie>
const FROM = process.env.RESEND_FROM || 'Fieldr <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;
if (!resend) {
  console.warn('Note: RESEND_API_KEY not set — lead email notifications are disabled.');
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
  );
}

function row(label, valueHtml) {
  if (!valueHtml) return '';
  return `<tr>
    <td style="padding:8px 0;color:#64748b;font-size:13px;width:90px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:15px;font-weight:600;">${valueHtml}</td>
  </tr>`;
}

export function renderLeadEmailHtml({ accountName, siteName, name, email, phone, triggerMessage }) {
  const emailHtml = email ? `<a href="mailto:${esc(email)}" style="color:#059669;text-decoration:none;">${esc(email)}</a>` : '';
  const phoneHtml = phone ? `<a href="tel:${esc(phone)}" style="color:#059669;text-decoration:none;">${esc(phone)}</a>` : '';

  return `<!doctype html>
<html>
<body style="margin:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background:#0f172a;padding:18px 28px;">
          <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-.02em;">Fieldr<span style="color:#34d399;">.</span></span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#059669;">New lead</div>
          <h1 style="margin:6px 0 4px;font-size:22px;color:#0f172a;">Your chatbot captured a lead</h1>
          <p style="margin:0;color:#64748b;font-size:14px;">From your <strong>${esc(siteName)}</strong> site.</p>
        </td></tr>
        <tr><td style="padding:12px 28px 4px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;">
            ${row('Name', esc(name) || '<span style="color:#94a3b8;font-weight:400;">Not given</span>')}
            ${row('Email', emailHtml || '<span style="color:#94a3b8;font-weight:400;">Not given</span>')}
            ${row('Phone', phoneHtml || '<span style="color:#94a3b8;font-weight:400;">Not given</span>')}
          </table>
        </td></tr>
        ${
          triggerMessage
            ? `<tr><td style="padding:8px 28px 4px;">
                 <div style="font-size:13px;color:#64748b;margin-bottom:6px;">What they said</div>
                 <div style="background:#f8fafc;border-left:3px solid #34d399;border-radius:6px;padding:12px 14px;color:#334155;font-size:14px;line-height:1.5;">${esc(triggerMessage)}</div>
               </td></tr>`
            : ''
        }
        <tr><td style="padding:18px 28px 8px;">
          ${
            email
              ? `<a href="mailto:${esc(email)}" style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 20px;border-radius:9px;">Reply to ${esc(name) || 'this lead'}</a>`
              : `<p style="margin:0;color:#64748b;font-size:14px;">Give them a call back to follow up.</p>`
          }
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
            Captured automatically by your Fieldr chat assistant for ${esc(accountName) || 'your business'}.<br>
            <a href="https://fieldr.ie" style="color:#94a3b8;">fieldr.ie</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLeadNotification({ to, accountName, siteName, name, email, phone, triggerMessage }) {
  if (!resend) return { skipped: true, reason: 'not configured' };
  if (!to) return { skipped: true, reason: 'client has no contact email' };

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `New lead from your ${siteName} chatbot`,
      html: renderLeadEmailHtml({ accountName, siteName, name, email, phone, triggerMessage }),
      // Let the client reply straight to the visitor.
      replyTo: email || undefined,
    });
    return { ok: true };
  } catch (err) {
    console.error('Lead email failed:', err?.message ?? err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}
