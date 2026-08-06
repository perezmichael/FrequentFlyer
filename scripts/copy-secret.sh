#!/usr/bin/env bash
# Copy one value out of .env.local, without printing it.
#
#   ./scripts/copy-secret.sh SUPABASE_URL          # to the clipboard
#   ./scripts/copy-secret.sh GEMINI_API_KEY --push # straight into GitHub Actions
#
# Strips surrounding quotes and whitespace. Values in .env.local are quoted,
# and python-dotenv strips those locally — so a hand-copied value works on a
# laptop and fails in CI with a confusing "Invalid URL", because GitHub stored
# the quotes as part of the secret.
#
# --push exists because the clipboard round-trip is where that bug actually
# lives: it only takes one paste from the file instead of from here. This has
# now silently broken the pipeline twice — SUPABASE_URL in July, and
# GEMINI_API_KEY in August, where the scout kept reporting success for three
# days while every Gemini call returned "API key not valid". Piping the value
# straight to `gh` removes the human step that keeps reintroducing it.
set -euo pipefail

NAME="${1:-}"
PUSH="${2:-}"
if [ -z "$NAME" ]; then
    echo "usage: $0 <ENV_VAR_NAME> [--push]" >&2
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

if [ "$PUSH" = "--push" ]; then
    # Piped on stdin, never in argv — arguments show up in `ps` and shell history.
    printf '%s' "$VALUE" | gh secret set "$NAME"
    echo "$NAME pushed to GitHub Actions secrets (${#VALUE} chars, quotes stripped)."
else
    printf '%s' "$VALUE" | pbcopy
    echo "$NAME copied to clipboard (${#VALUE} chars, quotes stripped). Paste it into GitHub, then run this again for the next one."
fi
