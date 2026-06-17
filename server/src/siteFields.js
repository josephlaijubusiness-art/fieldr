// Shared rules for site records, used by both the clients and sites routers.

export const SITE_EDITABLE_FIELDS = [
  'name',
  'domain',
  'brand_color',
  'bot_name',
  'welcome_message',
];

export function pickSiteFields(body = {}) {
  const out = {};
  for (const field of SITE_EDITABLE_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

export function validateSite(fields, { requireName = false } = {}) {
  if (requireName && (!fields.name || !String(fields.name).trim())) {
    return 'Site name is required';
  }
  if (fields.name !== undefined && !String(fields.name).trim()) {
    return 'Site name cannot be empty';
  }
  if (
    fields.brand_color !== undefined &&
    !/^#[0-9a-f]{6}$/i.test(fields.brand_color)
  ) {
    return 'brand_color must be a hex colour like #2563EB';
  }
  return null;
}

// Starter and Growth: 1 site. Pro: up to 3.
export function maxSitesForPlan(plan) {
  return plan === 'pro' ? 3 : 1;
}
