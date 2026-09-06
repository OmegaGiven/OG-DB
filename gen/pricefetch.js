#!/usr/bin/env node
// pricefetch.js -- look up current street prices for one price-tracked DB by
// scraping Newegg search result cards, and write a prices.json that
// gen/snapshot.js understands.
//
//   node gen/pricefetch.js <slug> <out.json> [--limit N] [--llm] [--verbose]
//
// Per row: fetch https://www.newegg.com/p/pl?d=<name>, parse the item cards
// (title, price, condition), keep NEW listings whose title contains every
// significant token of the product name and no extra "Ti/Super/XT/Pro/…"
// qualifier the name lacks, and record the LOWEST matching price. Rows with no
// clean match are skipped. With --llm, ambiguous rows (several candidates with
// >40% price spread) are handed to a local Ollama model to pick the right card.
//
// Env: OGDB_OLLAMA (http://127.0.0.1:11434), OGDB_MODEL (gemma4:12b),
//      OGDB_DELAY_MS (1500) between requests.
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const slug = args[0], out = args[1];
if (!slug || !out) { console.error('usage: node gen/pricefetch.js <slug> <out.json> [--limit N] [--llm] [--verbose]'); process.exit(2); }
const opt = { limit: 0, llm: false, verbose: false };
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--limit') opt.limit = Number(args[++i]);
  else if (args[i] === '--llm') opt.llm = true;
  else if (args[i] === '--verbose') opt.verbose = true;
}
const OLLAMA = process.env.OGDB_OLLAMA || 'http://127.0.0.1:11434';
const MODEL = process.env.OGDB_MODEL || 'gemma4:12b';
const DELAY = Number(process.env.OGDB_DELAY_MS || 1500);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

const rows = JSON.parse(fs.readFileSync(path.join(ROOT, slug, slug + '.json'), 'utf8'));
const take = opt.limit ? rows.slice(0, opt.limit) : rows;

const STOP = new Set(['geforce','nvidia','radeon','amd','intel','arc','apple','wireless','internal','ssd','hdd','kit','series','edition','the','with','and','gen','drive','hard','solid','state','memory','ram','ddr','pcie','nvme','m.2','m2','sata','rgb','x','-','–']);
const QUAL = ['ti','super','xt','xtx','gre','pro','plus','max','ultra','evo','qvo','elite','lpx','neo','royal','white','black','oc','founders'];
const norm = s => String(s).toLowerCase().replace(/&quot;|&amp;|&#39;/g, ' ').replace(/[()\[\],/|"']/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = s => norm(s).replace(/-/g, ' ').split(' ').filter(t => t && !STOP.has(t) && !/^cl\d+$/.test(t));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasTok = (title, t) => new RegExp('(^|[^a-z0-9])' + escRe(t) + '([^a-z0-9]|$)', 'i').test(title);

function matches(name, title) {
  const nt = norm(name), tt = norm(title);
  for (const t of tokens(name)) if (!hasTok(tt, t)) return false;        // every name token present
  for (const q of QUAL) if (!hasTok(nt, q) && hasTok(tt, q)) {
    // title has a qualifier the name lacks (e.g. 4070 Ti vs 4070) -> different SKU
    // ...unless the qualifier is decorative (colour / OC) which we tolerate
    if (!['white','black','oc','founders'].includes(q)) return false;
  }
  return true;
}

function parseCards(html) {
  return html.split(/<div class="item-cell"/).slice(1).map(c => {
    const t = (c.match(/class="item-title"[^>]*>([\s\S]*?)<\/a>/) || [])[1];
    const p = c.match(/class="price-current"[\s\S]*?<strong>([\d,]+)<\/strong>\s*<sup>([\d.]+)<\/sup>/);
    const href = (c.match(/class="item-title"[^>]*href="([^"]+)"/) || [])[1] || '';
    const cond = (c.match(/(Refurbished|Open Box|Used|Renewed)/i) || [])[1] || 'new';
    if (!t || !p) return null;
    return { title: t.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), price: Number(p[1].replace(/,/g, '') + (p[2].startsWith('.') ? p[2] : '.' + p[2])), cond: cond.toLowerCase(), url: href }; // <sup> already carries the leading dot (".62")
  }).filter(Boolean);
}

async function fetchNewegg(q) {
  const url = 'https://www.newegg.com/p/pl?d=' + encodeURIComponent(q).replace(/%20/g, '+');
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return parseCards(await r.text());
}

async function llmPick(name, hint, cands) {
  const list = cands.map((c, i) => `[${i + 1}] $${c.price} — ${c.title}`).join('\n');
  const prompt = `Which listing is the exact product "${name}" (${hint})? New condition, same capacity/variant, no bundles or different models. Listings:\n${list}\n\nRespond with ONLY JSON: {"index": <number or null>, "confidence": "high"|"medium"|"low"}`;
  try {
    const r = await fetch(OLLAMA + '/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, stream: false, format: 'json', keep_alive: '10m', options: { temperature: 0, num_ctx: 4096, num_predict: 60 } }),
      signal: AbortSignal.timeout(180000) });
    const j = JSON.parse((await r.json()).response || '{}');
    if (j.confidence === 'low' || !j.index) return null;
    return cands[j.index - 1] || null;
  } catch { return null; }
}

const hintOf = r => [r.brand, r.family, r.capacityGB ? r.capacityGB + 'GB' : '', r.capacityTB ? r.capacityTB + 'TB' : '', r.kitLayout, r.speedMTs ? (r.ddrGen || 'DDR') + '-' + r.speedMTs : '', r.vramGB ? r.vramGB + 'GB VRAM' : ''].filter(Boolean).join(' ');
const lastOf = r => (r.priceHistory && r.priceHistory.length) ? r.priceHistory[r.priceHistory.length - 1].priceUSD : (r.priceUSD ?? 0);
const sleep = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  const results = []; let n = 0;
  for (const r of take) {
    n++;
    const last = lastOf(r);
    let cards = [];
    try { cards = await fetchNewegg(r.name); } catch (e) { console.error(`  ${slug} | ${r.name} | fetch failed: ${e.message}`); await sleep(DELAY); continue; }
    let cands = cards.filter(c => c.cond === 'new' && matches(r.name, c.title));
    // sanity band vs last recorded price (catches accessories / wrong variant / bundles)
    if (last > 0) cands = cands.filter(c => c.price <= last * 3 && c.price >= last / 3);
    let pick = null, how = '';
    if (cands.length) {
      cands.sort((a, b) => a.price - b.price);
      const spread = cands[cands.length - 1].price / cands[0].price;
      if (cands.length === 1 || spread <= 1.4 || !opt.llm) { pick = cands[0]; how = cands.length === 1 ? 'single match' : `lowest of ${cands.length}`; }
      else { pick = await llmPick(r.name, hintOf(r), cands.slice(0, 8)); how = pick ? 'llm pick' : 'llm declined'; }
    }
    if (pick) {
      results.push({ name: r.name, priceUSD: pick.price, source: 'Newegg' });
      console.error(`  ${slug} | ${r.name} | $${last} -> $${pick.price} (${how})`);
      if (opt.verbose) console.error(`      ${pick.title.slice(0, 110)}`);
    } else {
      console.error(`  ${slug} | ${r.name} | $${last} -> skipped (${cards.length} cards, ${cands.length} clean matches)`);
    }
    await sleep(DELAY);
  }
  fs.writeFileSync(out, JSON.stringify(results, null, 1));
  console.error(`${slug}: ${results.length} / ${n} rows priced`);
  console.log(`${results.length} ${n}`);
})();
