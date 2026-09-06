#!/usr/bin/env node
// Append a price snapshot to a price-tracked database, then rebuild it.
//
// Usage:
//   node gen/snapshot.js <slug> <prices.json> [--date YYYY-MM-DD] [--source LABEL]
//
// prices.json is either
//   { "<row name>": 149.99, ... }
// or
//   [ { "name": "<row name>", "priceUSD": 149.99, "source": "Newegg" }, ... ]
//
// For each matched row: pushes {date, priceUSD, source} onto priceHistory,
// sets priceUSD, and recomputes pricePerTB / pricePerGB when those fields
// exist. Rows not in the file are left untouched. Unknown names are reported.
// A snapshot for the same date replaces the earlier one (idempotent re-runs).

const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const [slug, pricesFile, ...rest] = process.argv.slice(2);
if (!slug || !pricesFile) { console.error('usage: node gen/snapshot.js <slug> <prices.json> [--date YYYY-MM-DD] [--source LABEL]'); process.exit(1); }

const opt = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) opt[rest[i].slice(2)] = rest[++i];
const date = opt.date || new Date().toISOString().slice(0, 10);
const defaultSource = opt.source || 'snapshot';

const dataPath = path.join(ROOT, slug, slug + '.json');
const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
let input = JSON.parse(fs.readFileSync(path.resolve(pricesFile), 'utf8'));
if (!Array.isArray(input)) input = Object.entries(input).map(([name, priceUSD]) => ({ name, priceUSD }));

const byName = new Map(rows.map(r => [r.name.toLowerCase(), r]));
let updated = 0; const unknown = [];
for (const p of input) {
  const r = byName.get(String(p.name).toLowerCase());
  if (!r) { unknown.push(p.name); continue; }
  if (p.priceUSD == null || isNaN(p.priceUSD)) continue;
  const price = Math.round(Number(p.priceUSD) * 100) / 100;
  r.priceHistory = Array.isArray(r.priceHistory) ? r.priceHistory.filter(h => h.date !== date) : [];
  r.priceHistory.push({ date, priceUSD: price, source: p.source || defaultSource });
  r.priceHistory.sort((a, b) => a.date.localeCompare(b.date));
  r.priceUSD = price;
  if ('pricePerTB' in r) {
    const tb = r.capacityTB ?? (r.capacityGB ? r.capacityGB / 1000 : null);
    if (tb) r.pricePerTB = Math.round(price / tb);
  }
  if ('pricePerGB' in r && r.totalGB) r.pricePerGB = Math.round((price / r.totalGB) * 100) / 100;
  updated++;
}

fs.writeFileSync(dataPath, JSON.stringify(rows, null, 2) + '\n');
console.log(`${slug}: ${updated} rows updated for ${date}${unknown.length ? `; ${unknown.length} unknown names: ${unknown.slice(0, 8).join(' | ')}${unknown.length > 8 ? ' …' : ''}` : ''}`);

require('child_process').execSync(`node ${path.join(__dirname, 'build.js')} ${slug}`, { stdio: 'inherit' });
