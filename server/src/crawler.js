import * as cheerio from 'cheerio';

// A small, polite website crawler. Given a start URL it follows links on the
// SAME domain only, pulls the readable text from each page, and returns it all
// joined together — ready to drop into a client's knowledge base.

const MAX_PAGES = 25; // never crawl more than this many pages
const CONCURRENCY = 5; // pages fetched at once
const PAGE_TIMEOUT_MS = 10000; // give up on a slow page after 10s
const TOTAL_BUDGET_MS = 35000; // stop the whole crawl after 35s, return what we have
const MAX_KB_CHARS = 50000; // cap the knowledge base size
const USER_AGENT = 'FieldrBot/1.0 (+https://fieldr.ie)';

// File types that aren't web pages — don't try to crawl them.
const SKIP_EXT =
  /\.(pdf|docx?|xlsx?|pptx?|zip|rar|gz|7z|jpe?g|png|gif|webp|svg|ico|bmp|mp4|mp3|wav|avi|mov|woff2?|ttf|eot|css|js|mjs|json|xml|rss|csv)$/i;

// Reject anything that isn't a normal public website (blocks internal/private
// addresses — important because this runs on a public server).
function assertPublicHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost')) return false;
  if (!h.includes('.')) return false; // bare internal hostnames
  if (/^(127\.|10\.|192\.168\.|0\.0\.0\.0|169\.254\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h === '::1' || h === 'metadata.google.internal') return false;
  return true;
}

// Turn whatever the user typed into a valid, allowed start URL.
export function normalizeStartUrl(input) {
  let raw = (input || '').trim();
  if (!raw) throw new Error('Please enter a website address.');
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('That doesn\'t look like a valid website address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https websites can be crawled.');
  }
  if (!assertPublicHost(url.hostname)) {
    throw new Error('That address can\'t be crawled (it looks internal or private).');
  }
  url.hash = '';
  return url;
}

async function fetchHtml(link) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(link, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
    });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null; // timeout, network error, etc. — just skip this page
  } finally {
    clearTimeout(timer);
  }
}

function readableText($) {
  // Drop everything that isn't human-readable content. (Links were already
  // collected before this runs, so removing nav doesn't hurt discovery.)
  $('script, style, noscript, svg, iframe, link, meta, nav').remove();
  const title = ($('title').first().text() || '').trim();
  const text = $('body')
    .text()
    .replace(/[ \t\r]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
  return { title, text };
}

export async function crawlSite(startUrl, opts = {}) {
  const maxPages = opts.maxPages ?? MAX_PAGES;
  const origin = startUrl; // a URL object
  const start = startUrl.href;

  const queue = [start];
  const seen = new Set([start]);
  const pages = [];
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  while (queue.length && pages.length < maxPages && Date.now() < deadline) {
    const batch = queue.splice(0, CONCURRENCY);
    const fetched = await Promise.all(
      batch.map(async (link) => ({ link, html: await fetchHtml(link) }))
    );

    for (const { link, html } of fetched) {
      if (!html || pages.length >= maxPages) continue;
      const $ = cheerio.load(html);

      // Discover same-domain links to crawl next.
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        let abs;
        try {
          abs = new URL(href, link);
        } catch {
          return;
        }
        abs.hash = '';
        if (abs.protocol !== 'http:' && abs.protocol !== 'https:') return;
        if (abs.hostname !== origin.hostname) return; // same site only
        if (SKIP_EXT.test(abs.pathname)) return;
        if (seen.has(abs.href)) return;
        seen.add(abs.href);
        queue.push(abs.href);
      });

      const { title, text } = readableText($);
      if (text && text.length > 40) pages.push({ url: link, title, text });
    }
  }

  // Join every page's text into one knowledge-base document.
  let content = '';
  let truncated = false;
  for (const p of pages) {
    const block = `## ${p.title || p.url}\n${p.url}\n\n${p.text}\n\n`;
    if (content.length + block.length > MAX_KB_CHARS) {
      content += block.slice(0, MAX_KB_CHARS - content.length);
      truncated = true;
      break;
    }
    content += block;
  }
  content = content.trim();

  return {
    content,
    pagesCrawled: pages.length,
    characters: content.length,
    truncated,
  };
}
