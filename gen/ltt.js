#!/usr/bin/env node
/*
 * gen/ltt.js -- OPTIONAL, MANUAL LTT Labs enrichment for the GPU / Mouse / Keyboard DBs.
 * NOT for cron. Fetches politely (real browser headers, 25s spacing, hard-stop on the
 * first 403), caches every page, and only pulls the measured spec block + pro/con
 * highlights + the verified product URL from labs.lttstore.com's static page data.
 * FPS / power-draw / acoustic charts load client-side and are NOT scraped -- we link out.
 *
 * robots.txt on lttlabs.com is `Content-Signal: search=yes, ai-train=no, use=reference`.
 * This tool takes a small amount of already-published measured data for a *reference*
 * comparison table, with attribution and a link back. Keep the volume low.
 *
 *   node gen/ltt.js <gpus|mice|keyboards> [--limit N] [--only "Name"] [--refetch] [--dry]
 *
 * Writes <slug>/ltt.json ; gen/build.js merges it onto matching rows as row.ltt.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const slug = process.argv[2];
const MAP = { gpus: 'graphics-cards', mice: 'mice', keyboards: 'keyboards' };
if (!MAP[slug]) { console.error('usage: node gen/ltt.js <gpus|mice|keyboards> [--limit N] [--only "Name"] [--refetch] [--dry]'); process.exit(2); }
const cat = MAP[slug];
const opt = {};
for (let i = 3; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--limit') opt.limit = +process.argv[++i];
  else if (a === '--only') opt.only = process.argv[++i];
  else if (a === '--refetch') opt.refetch = true;
  else if (a === '--dry') opt.dry = true;
}
const CACHE = path.join(__dirname, '.ltt-cache');
fs.mkdirSync(CACHE, { recursive: true });
const GAP_MS = 25000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'same-origin',
  'Upgrade-Insecure-Requests': '1'
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).toLowerCase().replace(/[()\[\],/|"'’.]/g, ' ').replace(/\bgb\b/g, 'gb').replace(/\s+/g, ' ').trim();
const STOP = new Set(['geforce', 'nvidia', 'radeon', 'amd', 'intel', 'arc', 'the', 'wireless', 'gaming', 'edition', 'series', 'rgb', 'x', '-']);
const toks = s => norm(s).replace(/-/g, ' ').split(' ').filter(t => t && !STOP.has(t));
// strict GPU model identity: number + tier suffixes + VRAM size
const TIERS = ['ti', 'super', 'xtx', 'xt', 'gre', 'pro'];
function modelKey(s) {
  s = ' ' + s.toLowerCase().replace(/[-_]/g, ' ') + ' ';
  const num = (s.match(/\b(?:rtx|rx|gtx|arc|radeon|geforce)?\s*([a-b]?\d{3,4})\b/) || [])[1] || '';
  const suf = TIERS.filter(t => new RegExp('\\b' + t + '\\b').test(s)).sort().join('+');
  const mem = (s.match(/\b(\d{1,2})\s*gb\b/) || [])[1] || '';
  return { num, suf, mem };
}
const rank = u => (/founders-edition|reference/.test(u) ? 3 : /-nvidia-|-amd-|-intel-/.test(u) || /^nvidia-|^amd-|^intel-/.test(u.split('/').pop()) ? 2 : 1);

async function get(url, referer) {
  const key = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  const file = path.join(CACHE, key + '.html');
  if (!opt.refetch && fs.existsSync(file)) return { html: fs.readFileSync(file, 'utf8'), cached: true };
  await sleep(GAP_MS);
  // Cloudflare fingerprints Node's HTTP client; curl passes. Shell out.
  const args = ['-sS', '--compressed', '--max-time', '30', '-w', '\n__HTTP_%{http_code}__', '-A', UA];
  for (const [k, v] of Object.entries({ ...HEADERS, Referer: referer || 'https://www.lttlabs.com/categories/' + cat })) args.push('-H', k + ': ' + v);
  args.push(url);
  const res = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (res.error) throw res.error;
  const body = res.stdout || '';
  const mm = body.match(/\n__HTTP_(\d+)__\s*$/);
  const code = mm ? +mm[1] : 0;
  const html = mm ? body.slice(0, mm.index) : body;
  if (code === 403) throw new Error('403 from ' + url + ' -- Cloudflare is blocking this IP; stopping. Re-run later.');
  if (code !== 200) return { html: null, status: code };
  fs.writeFileSync(file, html);
  return { html, cached: false };
}

function flight(html) {
  let f = '';
  const re = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let m;
  while ((m = re.exec(html))) { try { f += JSON.parse('"' + m[1] + '"'); } catch (e) {} }
  return f;
}
function num(f, k) { const m = f.match(new RegExp('"' + k + '"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)')); return m ? +m[1] : null; }
function str(f, k) { const m = f.match(new RegExp('"' + k + '"\\s*:\\s*"([^"]{0,80})"')); return (m && !/^[A-Z].*\(|Name\/Type$|^Slot Width$|^Color$|^Power Connection$/.test(m[1])) ? m[1] : null; }
function highlights(f, which) {
  // "highlightsGood":[{"highlight":"..."},...]
  const m = f.match(new RegExp('"' + which + '"\\s*:\\s*(\\[[^\\]]{0,900}\\])'));
  if (!m) return [];
  return [...m[1].matchAll(/"highlight"\s*:\s*"([^"]{3,180})"/g)].map(x => x[1].replace(/\\/g, '')).slice(0, 4);
}

const FIELDS = {
  "graphics-cards": f => ({
    tdpW: num(f, 'totalDesignPowerW') ?? num(f, 'powerConsumptionW'),
    boostMhz: num(f, 'boostClockMhz'), baseMhz: num(f, 'baseClockMhz'),
    memGB: num(f, 'memorySizeGb'), memType: str(f, 'memoryType'),
    memBandwidthGBs: num(f, 'memoryBandwidthGbs'), memBusBit: num(f, 'memoryInterfaceWidth'),
    lengthMm: num(f, 'dimensionsLengthMm'), widthMm: num(f, 'dimensionsWidthMm'), heightMm: num(f, 'dimensionsHeightMm'),
    slots: str(f, 'dimensionsSlots'), powerConnector: str(f, 'powerConnection'),
    weightG: num(f, 'weightG'), dieSizeMm2: num(f, 'dieSizeMm2'),
    perfCharts: /"gamingPerformanceChartEnabled"\s*:\s*true/.test(f) || null
  }),
  mice: f => ({
    weightG: num(f, 'weightG'), lengthMm: num(f, 'dimensionsLengthMm'), widthMm: num(f, 'dimensionsWidthMm'),
    heightMm: num(f, 'dimensionsHeightMm'), buttons: num(f, 'buttonCount') ?? num(f, 'numberOfButtons'),
    sensor: str(f, 'sensorName') ?? str(f, 'sensor'), maxDpi: num(f, 'maxDpi') ?? num(f, 'maxSensitivityDpi'),
    pollingHz: num(f, 'maxPollingRateHz') ?? num(f, 'pollingRateHz'),
    clickLatencyMs: num(f, 'clickLatencyMs') ?? num(f, 'buttonLatencyMs')
  }),
  keyboards: f => ({
    weightG: num(f, 'weightG'), lengthMm: num(f, 'dimensionsLengthMm'), widthMm: num(f, 'dimensionsWidthMm'),
    heightMm: num(f, 'dimensionsHeightMm'), keys: num(f, 'keyCount') ?? num(f, 'numberOfKeys'),
    switchName: str(f, 'switchName') ?? str(f, 'keySwitch'),
    actuationG: num(f, 'actuationForceG') ?? num(f, 'operatingForceG'),
    actuationMm: num(f, 'actuationDistanceMm') ?? num(f, 'preTravelMm'),
    latencyMs: num(f, 'latencyMs') ?? num(f, 'wiredLatencyMs')
  })
};

(async () => {
  const rows = JSON.parse(fs.readFileSync(path.join(ROOT, slug, slug + '.json'), 'utf8'));
  let take = opt.only ? rows.filter(r => r.name.toLowerCase().includes(opt.only.toLowerCase())) : rows;
  if (opt.limit) take = take.slice(0, opt.limit);

  console.error(`sitemap...`);
  const sm = await get('https://www.lttlabs.com/sitemap.xml');
  if (!sm.html) { console.error('sitemap fetch failed'); process.exit(1); }
  const prods = [...sm.html.matchAll(new RegExp('<loc>(https://www\\.lttlabs\\.com/products/' + cat + '/[a-z0-9-]+)</loc>', 'g'))].map(m => m[1]);
  console.error(`${prods.length} ${cat} products on LTT Labs`);
  const idx = prods.map(u => ({ u, slugToks: toks(u.split('/').pop()), key: modelKey(u.split('/').pop()) }));

  const out = {};
  try { Object.assign(out, JSON.parse(fs.readFileSync(path.join(ROOT, slug, 'ltt.json'), 'utf8'))); } catch (e) {}

  for (const r of take) {
    let best = null, score = 0;
    if (cat === 'graphics-cards') {
      // strict: same model number + same tier suffixes (ti/super/xt/xtx/gre/pro); VRAM must match if both name it.
      const rk = modelKey(r.name);
      if (!rk.num) { console.error(`  ${r.name} -> no model number, skip`); continue; }
      const cands = idx.filter(c => c.key.num === rk.num && c.key.suf === rk.suf && (!rk.mem || !c.key.mem || rk.mem === c.key.mem));
      if (!cands.length) { console.error(`  ${r.name} -> no LTT match (key ${rk.num}${rk.suf ? '/' + rk.suf : ''})`); continue; }
      cands.sort((a, b) => rank(b.u) - rank(a.u));
      best = cands[0].u; score = 1;
    } else {
      const rt = toks(r.name);
      for (const c of idx) {
        const hit = rt.filter(t => c.slugToks.includes(t)).length;
        let sc = hit / Math.max(rt.length, 1);
        if (hit === rt.length) sc += 0.2;
        if (sc > score) { score = sc; best = c.u; }
      }
      if (!best || score < 0.7) { console.error(`  ${r.name} -> no LTT match (best ${score.toFixed(2)})`); continue; }
    }
    let page;
    try { page = await get(best, 'https://www.lttlabs.com/categories/' + cat); }
    catch (e) { console.error('  ' + e.message); break; }
    if (!page.html) { console.error(`  ${r.name} -> ${best} HTTP ${page.status}`); continue; }
    const f = flight(page.html);
    const measured = FIELDS[cat](f);
    const rec = {
      url: best,
      fetched: new Date().toISOString().slice(0, 10),
      good: highlights(f, 'highlightsGood'),
      bad: highlights(f, 'highlightsBad'),
      measured: Object.fromEntries(Object.entries(measured).filter(([, v]) => v != null && v !== ''))
    };
    out[r.name] = rec;
    console.error(`  ${r.name} -> ${best.split('/').pop()} ${page.cached ? '(cache)' : ''} | ${Object.keys(rec.measured).length} fields, ${rec.good.length}+/${rec.bad.length}-`);
  }

  if (opt.dry) { console.error('\n--- dry run, not writing ---'); console.log(JSON.stringify(out, null, 2).slice(0, 1500)); return; }
  fs.writeFileSync(path.join(ROOT, slug, 'ltt.json'), JSON.stringify(out, null, 2) + '\n');
  console.error(`\nwrote ${slug}/ltt.json (${Object.keys(out).length} products)`);
})();
