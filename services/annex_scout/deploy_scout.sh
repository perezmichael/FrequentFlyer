#!/bin/zsh
# Deploy the scout to its launchd runtime home.
#
# Why this exists: the repo lives in ~/Desktop, which macOS privacy protection
# (TCC) blocks for launchd background jobs — the daily cron literally cannot
# read files here. So the scheduled job runs a copy in ~/.frequentflyer-scout
# instead. Run this script (from a normal terminal, which CAN read Desktop)
# after changing any scout code so the runtime copy picks it up.
#
# All state lives in Supabase; the runtime copy is disposable.
set -eu

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.frequentflyer-scout"

mkdir -p "$DEST"

# Code + config the scout needs at runtime. (.env holds the Supabase/Gemini
# keys; it stays on this machine.)
cp "$SRC"/master_scout.py "$SRC"/vibedoc.md "$SRC"/venues.json \
   "$SRC"/bad_venues.json "$SRC"/.env "$SRC"/run_scout.sh \
   "$SRC"/requirements.txt "$DEST"/
chmod +x "$DEST/run_scout.sh"

# Runtime venv (created once; rebuilt only if deleted)
if [ ! -x "$DEST/venv/bin/python" ]; then
    echo "Creating runtime venv..."
    python3 -m venv "$DEST/venv"
    "$DEST/venv/bin/pip" install --quiet -r "$DEST/requirements.txt"
else
    "$DEST/venv/bin/pip" install --quiet -r "$DEST/requirements.txt"
fi

echo "Deployed scout to $DEST"
