#!/usr/bin/env bash
# ogdb-price-snapshot -- weekly price refresh for the price-tracked OG-DB databases.
#
# Runs on `station` under OpenClaw's cron (job: ogdb-price-snapshot). For each
# price-tracked DB it:
#   1. gen/pricefetch.js  -> scrapes Newegg search cards, keeps clean NEW matches,
#      records the lowest price; ambiguous rows optionally go to a local Ollama
#      model to pick the right card (--llm). Rows with no clean match are skipped.
#   2. gen/snapshot.js    -> appends the dated point, updates $/TB or $/GB, rebuilds.
#   3. commits + pushes.
#
# Usage:
#   ogdb-price-snapshot                 # full run, commits + pushes
#   ogdb-price-snapshot --dry-run       # fetch + report only; no snapshot, no git
#   ogdb-price-snapshot --limit 3       # first N rows per DB (testing)
#   ogdb-price-snapshot --db gpus       # one DB (repeatable)
#   ogdb-price-snapshot --no-llm        # never call the model; skip ambiguous rows
#
# Env: OGDB_REPO (~/OG-DB), OGDB_MODEL (gemma4:12b), OGDB_OLLAMA (http://127.0.0.1:11434 --
# direct; the :11500 broker proxy can hang), OGDB_DELAY_MS (1500), OGDB_LOG
# (~/.openclaw/logs/ogdb-snapshot.log).
set -euo pipefail

REPO="${OGDB_REPO:-$HOME/OG-DB}"
LOG="${OGDB_LOG:-$HOME/.openclaw/logs/ogdb-snapshot.log}"
export OGDB_OLLAMA="${OGDB_OLLAMA:-http://127.0.0.1:11434}"
export OGDB_MODEL="${OGDB_MODEL:-gemma4:12b}"
DBS=(gpus ssds ram hdds)
DRY=0; LIMIT=0; LLM=1; ONLY=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY=1;;
    --limit) LIMIT="$2"; shift;;
    --db) ONLY+=("$2"); shift;;
    --no-llm) LLM=0;;
    -h|--help) sed -n '2,21p' "$0"; exit 0;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac; shift
done
[ ${#ONLY[@]} -gt 0 ] && DBS=("${ONLY[@]}")
mkdir -p "$(dirname "$LOG")"
log(){ printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "$LOG" >&2; }

cd "$REPO"
# the station clone is a pure mirror of origin/main -- never keep local-only work here
[ $DRY -eq 1 ] || { git fetch -q origin && git reset -q --hard origin/main; }
if [ $LLM -eq 1 ] && ! curl -fsS --max-time 10 "$OGDB_OLLAMA/api/tags" >/dev/null 2>&1; then
  log "ollama unreachable at $OGDB_OLLAMA -- continuing without the model (ambiguous rows skipped)"; LLM=0
fi
DATE="$(date -u +%F)"
log "start dbs=${DBS[*]} dry=$DRY limit=$LIMIT llm=$LLM model=$OGDB_MODEL"

TOTAL_OK=0; TOTAL_ROWS=0; CHANGED=()
for slug in "${DBS[@]}"; do
  [ -f "$REPO/$slug/$slug.json" ] || { log "skip $slug: no data file"; continue; }
  prices="$(mktemp -t ogdb-prices-$slug.XXXX.json)"
  fetchargs=()
  [ "$LIMIT" -gt 0 ] && fetchargs+=(--limit "$LIMIT")
  [ $LLM -eq 1 ] && fetchargs+=(--llm)
  counts="$(node gen/pricefetch.js "$slug" "$prices" "${fetchargs[@]}" 2> >(tee -a "$LOG" >&2))"
  ok="${counts%% *}"; n="${counts#* }"
  TOTAL_OK=$((TOTAL_OK+ok)); TOTAL_ROWS=$((TOTAL_ROWS+n))
  if [ $DRY -eq 1 ]; then
    log "dry-run $slug: would record $ok points -> $(tr -d '\n' < "$prices" | tr -s ' ' | head -c 400)"
  elif [ "$ok" -gt 0 ]; then
    node gen/snapshot.js "$slug" "$prices" --date "$DATE" --source Newegg 2>&1 | tee -a "$LOG" >&2
    CHANGED+=("$slug")
  fi
  rm -f "$prices"
done

if [ $DRY -eq 0 ] && [ ${#CHANGED[@]} -gt 0 ]; then
  sed -i -E "s#(<span>updated <b>)[0-9-]+(</b></span>)#\1${DATE}\2#" index.html || true
  git add -A
  if ! git diff --cached --quiet; then
    git commit -q -m "Price snapshot $DATE: ${CHANGED[*]} ($TOTAL_OK/$TOTAL_ROWS rows)

Automated weekly refresh via ogdb-price-snapshot on station (Newegg
search cards, lowest clean new-condition match; ambiguous rows resolved
by ollama/$OGDB_MODEL or skipped)."
    git pull -q --rebase origin main || true
    git push -q
    log "pushed: ${CHANGED[*]} ($TOTAL_OK/$TOTAL_ROWS rows)"
  else
    log "nothing to commit"
  fi
fi
log "done $TOTAL_OK/$TOTAL_ROWS rows priced"
echo "OG-DB price snapshot $DATE: $TOTAL_OK/$TOTAL_ROWS rows priced across ${DBS[*]}$( [ $DRY -eq 1 ] && echo ' (dry run)' )"
