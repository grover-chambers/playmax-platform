#!/usr/bin/env bash
# watch_census.sh — live watcher for the Kanini Field census DB.
# Tracks: rep access events (login/sync/open per device + app build) and
# per-entity row counts, printing NEW activity since the last poll so you can
# see the V9 queue draining in real time.
#
# Usage: bash watch_census.sh [interval_seconds]   (default 30)
set -u

source /tmp/opencode/census_watch.env
export CENSUS_SERVICE_ROLE_KEY

BASE="https://zsprlozgdxzxeevvetmg.supabase.co/rest/v1"
INTERVAL="${1:-30}"

ENTITIES=(consent_records outlets retailers routes route_stops outlet_contacts \
  visits visit_items order_intents competitor_observations health_scores \
  stock_observations shelf_photos category_observations consumer_intercepts \
  daily_submissions back_checks)

count_rows() { # $1 table -> rows (0 if table missing)
  curl -s -H "apikey: $CENSUS_SERVICE_ROLE_KEY" -H "Authorization: Bearer $CENSUS_SERVICE_ROLE_KEY" \
    "$1?select=id" -H "Prefer: count=exact" -o /dev/null -D - 2>/dev/null \
    | tr -d '\r' | grep -i "^content-range" | grep -oE "/ ?[0-9]+$" | tr -d '/'
}
recent_events() { # $1 lookback seconds (ISO >= now-$1)
  local since
  since=$(date -u -d "@$(( $(date +%s) - ${1:-120} ))" +%Y-%m-%dT%H:%M:%S 2>/dev/null)
  [ -z "$since" ] && since=$(python3 -c "import datetime;print((datetime.datetime.utcnow()-datetime.timedelta(seconds=${1:-120})).strftime('%Y-%m-%dT%H:%M:%S'))" 2>/dev/null)
  curl -s -H "apikey: $CENSUS_SERVICE_ROLE_KEY" -H "Authorization: Bearer $CENSUS_SERVICE_ROLE_KEY" \
    "$BASE/rep_access_events?select=rep_email,event_type,app_version,version_code,created_at&created_at=gte.$since&order=created_at.desc&limit=25" 2>/dev/null
}

echo "=== Kanini Field census watcher (poll every ${INTERVAL}s) — Ctrl-C to stop ==="
declare -A PREV
echo "Baseline rows:"
for t in "${ENTITIES[@]}"; do
  PREV[$t]=$(count_rows "$BASE/$t")
  echo "  $t = ${PREV[$t]}"
done

while true; do
  sleep "$INTERVAL"
  NOW=$(date -u +%H:%M:%SZ)
  echo "--- $NOW ---"
  CHANGED=0
  # 1) rep access events in the last lookback window
  events=$(recent_events 300)
  if [ -n "$events" ] && [ "$events" != "[]" ]; then
    echo "$events" | python3 -c "
import sys,json
try:
  rows=json.load(sys.stdin)
except Exception:
  sys.exit()
for r in rows:
  print(f\"  EVENT {r.get('rep_email')} | {r.get('event_type')} | build {r.get('version_code')} | {r.get('created_at')}\")
"
  fi
  # 2) per-entity deltas
  for t in "${ENTITIES[@]}"; do
    new=$(count_rows "$BASE/$t")
    old=${PREV[$t]:-0}
    if [ "$new" != "$old" ]; then
      d=$(( new - old ))
      echo "  +$d rows -> $t (total $new)"
      PREV[$t]=$new
      CHANGED=1
    fi
  done
  [ "$CHANGED" = "0" ] && echo "  (no new rows)" || true
done