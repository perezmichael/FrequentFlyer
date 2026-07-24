#!/bin/zsh
# Daily scout run — invoked by launchd (com.frequentflyer.scout), or run
# manually. Logs to services/annex_scout/logs/, keeps two weeks of history.
set -u

SCOUT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCOUT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/scout_$(date +%Y-%m-%d_%H%M%S).log"

cd "$SCOUT_DIR"
echo "── Scout run started $(date) ──" >> "$LOG_FILE"
# -u: unbuffered stdout, so the log fills line-by-line instead of in 8KB chunks
"$SCOUT_DIR/venv/bin/python" -u master_scout.py >> "$LOG_FILE" 2>&1
STATUS=$?
echo "── Exit $STATUS at $(date) ──" >> "$LOG_FILE"

# Prune logs older than 14 days
find "$LOG_DIR" -name 'scout_*.log' -mtime +14 -delete

exit $STATUS
