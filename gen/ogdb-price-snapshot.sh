#!/usr/bin/env bash
# ogdb-price-snapshot -- weekly price refresh for the price-tracked OG-DB databases.
#
# Runs on `station` under OpenClaw's cron (job: ogdb-price-snapshot). For each
# price-tracked DB it:
#   1. searches SearXNG for the current US price of every row,
#   2. asks a local Ollama model to extract ONE number from the snippets (JSON mode,
#      bounded context, no agent scaffolding -- keeps small models honest),
#   3. sanity-checks the number against the last recorded price,
#   4. appends the point via gen/snapshot.js (which also rebuilds the page),
#   5. commits + pushes. Rows the model can't price are skipped, not guessed.
#
# Usage:
#   ogdb-price-snapshot                 # full run, commits + pushes
#   ogdb-price-snapshot --dry-run       # no snapshot.js, no git; prints what it would record
#   ogdb-price-snapshot --limit 3       # only the first N rows per DB (testing)
#   ogdb-price-snapshot --db gpus       # one DB only (repeatable)
#   OGDB_MODEL=devstral:24b ogdb-price-snapshot
#
# Config via env: OGDB_REPO (default ~/OG-DB), OGDB_MODEL (default gemma4:12b),
# OGDB_OLLAMA (default http://127.0.0.1:11500, falls back to :11434),
# OGDB_SEARX (default http://127.0.0.1:8080), OGDB_LOG (default ~/.openclaw/logs/ogdb-snapshot.log).
set -euo pipefail

REPO="${OGDB_REPO:-$HOME/OG-DB}"
MODEL="${OGDB_MODEL:-gemma4:12b}"
OLLAMA="${OGDB_OLLAMA:-http://127.0.0.1:11500}"
SEARX="${OGDB_SEARX:-http://127.0.0.1:8080}"
LOG="${OGDB_LOG:-$HOME/.openclaw/logs/ogdb-snapshot.log}"
DBS=(gpus ssds ram hdds)
DRY=0; LIMIT=0; ONLY=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1;;
    --limit) LIMIT="$2"; shift;;
    --db) ONLY+=("$2"); shift;;
    -h|--help) sed -n '2,24p' "$0"; exit 0;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac; shift
done
[ ${#ONLY[@]} -gt 0 ] && DBS=("${ONLY[@]}")
mkdir -p "$(dirname "$LOG")"
log(){ printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG" >&2; }

# ---- preflight ---------------------------------------------------------
if ! curl -fsS --max-time 10 "$OLLAMA/api/tags" >/dev/null 2>&1; then
  if curl -fsS --max-time 10 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
    OLLAMA="http://127.0.0.1:11434"; log "broker proxy down, using $OLLAMA directly"
  else
    log "FATAL: ollama unreachable at $OLLAMA and :11434"; exit 1
  fi
fi
curl -fsS --max-time 10 "$SEARX/search?q=ping&format=json" >/dev/null || { log "FATAL: searxng unreachable at $SEARX"; exit 1; }
cd "$REPO"
[ $DRY -eq 1 ] || git pull -q --ff-only
DATE="$(date -u +%F)"
log "start model=$MODEL dbs=${DBS[*]} dry=$DRY limit=$LIMIT"

# ---- one row: search -> extract -> validate -------------------------------
# prints "price<TAB>source" or nothing
price_row(){
  local name="$1" last="$2" hint="$3"
  local q="$name price USD"
  local snippets
  snippets="$(curl -fsS --max-time 25 --get "$SEARX/search" \
      --data-urlencode "q=$q" --data-urlencode "format=json" --data-urlencode "categories=general" \
    | node -e '
      let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
        let j;try{j=JSON.parse(d)}catch{process.exit(0)}
        const bad=/ebay\.com\/itm|aliexpress|temu\.|reddit\.com|youtube\.com/i;
        const r=(j.results||[]).filter(x=>!bad.test(x.url||"")).slice(0,8);
        console.log(r.map((x,i)=>`[${i+1}] ${x.title||""}\n    ${(x.content||"").replace(/\s+/g," ").slice(0,300)}\n    ${x.url||""}`).join("\n"));
      });' )"
  [ -z "$snippets" ] && return 0

  local prompt
  prompt="You are extracting the CURRENT retail price in US dollars of one product from web search snippets.
Product: $name
Context: $hint
Last recorded price: \$$last
Rules: use the price for THIS exact product and capacity/variant, new condition, from a reputable US retailer (Amazon, Newegg, B&H, Best Buy, Micro Center, Walmart, ServerPartDeals, manufacturer store). Ignore refurbished, bundles, used listings, other capacities, and prices in other currencies. If the snippets do not clearly show a price for this exact product, set priceUSD to null. Do not guess.
Snippets:
$snippets

Respond with ONLY a JSON object: {\"priceUSD\": <number or null>, \"source\": \"<retailer name or domain>\", \"confidence\": \"high\"|\"medium\"|\"low\"}"

  local body out
  body="$(node -e 'console.log(JSON.stringify({model:process.argv[1],prompt:process.argv[2],stream:false,format:"json",keep_alive:"10m",options:{temperature:0,num_ctx:8192,num_predict:120}}))' "$MODEL" "$prompt")"
  out="$(curl -fsS --max-time 240 "$OLLAMA/api/generate" -H 'Content-Type: application/json' -d "$body" 2>/dev/null || true)"
  [ -z "$out" ] && return 0
  node -e '
    const last=Number(process.argv[1]);
    let env; try{env=JSON.parse(require("fs").readFileSync(0,"utf8"))}catch{process.exit(0)}
    let r; try{r=JSON.parse(env.response||"")}catch{process.exit(0)}
    const p=Number(r.priceUSD);
    if(!isFinite(p)||p<=0) process.exit(0);
    if(r.confidence==="low") process.exit(0);
    // reject wild swings vs last recorded (bad match / other variant)
    if(last>0 && (p>last*3 || p<last/3)) process.exit(0);
    process.stdout.write(Math.round(p*100)/100+"\t"+String(r.source||"web").replace(/[\t\n]/g," ").slice(0,40));
  ' "$last" <<<"$out"
}

# ---- per-DB loop --------------------------------------------------------
TOTAL_OK=0; TOTAL_ROWS=0; CHANGED=()
for slug in "${DBS[@]}"; do
  data="$REPO/$slug/$slug.json"
  [ -f "$data" ] || { log "skip $slug: no $data"; continue; }
  prices="$(mktemp -t ogdb-prices-$slug.XXXX.json)"
  # rows as: name<TAB>lastPrice<TAB>hint   (hint = brand/family/capacity-ish fields to disambiguate)
  rows="$(node -e '
    const d=require(process.argv[1]); const lim=Number(process.argv[2])||0;
    const take=lim?d.slice(0,lim):d;
    for(const r of take){
      const last=(r.priceHistory&&r.priceHistory.length)?r.priceHistory[r.priceHistory.length-1].priceUSD:(r.priceUSD??0);
      const hint=[r.brand,r.family,r.capacityGB?r.capacityGB+"GB":"",r.capacityTB?r.capacityTB+"TB":"",r.kitLayout,r.speedMTs?"DDR"+(r.ddrGen||"")+"-"+r.speedMTs:"",r.vramGB?r.vramGB+"GB VRAM":"",r.segment].filter(Boolean).join(" ");
      console.log([r.name,last,hint].join("\t"));
    }' "$data" "$LIMIT")"
  n=0; ok=0; echo '[' > "$prices"; first=1
  while IFS=$'\t' read -r name last hint; do
    [ -z "$name" ] && continue
    n=$((n+1))
    res="$(price_row "$name" "$last" "$hint" || true)"
    if [ -n "$res" ]; then
      price="${res%%$'\t'*}"; src="${res#*$'\t'}"
      ok=$((ok+1))
      [ $first -eq 1 ] || echo ',' >> "$prices"; first=0
      node -e 'console.log(JSON.stringify({name:process.argv[1],priceUSD:Number(process.argv[2]),source:process.argv[3]}))' "$name" "$price" "$src" >> "$prices"
      log "  $slug | $name | \$$last -> \$$price ($src)"
    else
      log "  $slug | $name | \$$last -> (no confident price, skipped)"
    fi
  done <<<"$rows"
  echo ']' >> "$prices"
  TOTAL_ROWS=$((TOTAL_ROWS+n)); TOTAL_OK=$((TOTAL_OK+ok))
  log "$slug: $ok / $n rows priced"
  if [ $DRY -eq 1 ]; then
    log "dry-run: would run: node gen/snapshot.js $slug $prices --date $DATE"; cat "$prices" >&2
  elif [ $ok -gt 0 ]; then
    node gen/snapshot.js "$slug" "$prices" --date "$DATE" --source web 2>&1 | tee -a "$LOG" >&2
    CHANGED+=("$slug")
  fi
  rm -f "$prices"
done

# ---- landing 'updated' stamp + commit ----------------------------------
if [ $DRY -eq 0 ] && [ ${#CHANGED[@]} -gt 0 ]; then
  sed -i -E "s#(<span>updated <b>)[0-9-]+(</b></span>)#\1${DATE}\2#" index.html || true
  git add -A
  if ! git diff --cached --quiet; then
    git commit -q -m "Price snapshot $DATE: ${CHANGED[*]} ($TOTAL_OK/$TOTAL_ROWS rows)

Automated weekly refresh via ogdb-price-snapshot on station
(searxng + ollama/$MODEL, wild-swing and low-confidence rows skipped)."
    git push -q
    log "pushed: ${CHANGED[*]} ($TOTAL_OK/$TOTAL_ROWS rows)"
  else
    log "nothing to commit"
  fi
fi
log "done $TOTAL_OK/$TOTAL_ROWS rows priced"
echo "OG-DB price snapshot $DATE: $TOTAL_OK/$TOTAL_ROWS rows priced across ${DBS[*]}$( [ $DRY -eq 1 ] && echo ' (dry run)' )"
