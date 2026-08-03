#!/usr/bin/env bash
# Copy one value out of .env.local to the clipboard, without printing it.
#
#   ./scripts/copy-secret.sh SUPABASE_URL
#
# Strips surrounding quotes and whitespace. Values in .env.local are quoted,
# and python-dotenv strips those locally — so a hand-copied value works on a
# laptop and fails in CI with a confusing "Invalid URL", because GitHub stored
# the quotes as part of the secret.
set -euo pipefail

NAME="${1:-}"
if [ -z "$NAME" ]; then
    echo "usage: $0 <ENV_VAR_NAME>" >&2
    exit 1
fi

ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "no .env.local at $ENV_FILE" >&2
    exit 1
fi

VALUE="$(
    python3 - "$ENV_FILE" "$NAME" <<'PY'
import sys
path, name = sys.argv[1], sys.argv[2]
for line in open(path):
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, val = line.split("=", 1)
    if key.strip() != name:
        continue
    val = val.strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
        val = val[1:-1]
    print(val, end="")
    break
PY
)"

if [ -z "$VALUE" ]; then
    echo "$NAME not found in .env.local" >&2
    exit 1
fi

printf '%s' "$VALUE" | pbcopy
echo "$NAME copied to clipboard (${#VALUE} chars, quotes stripped). Paste it into GitHub, then run this again for the next one."
