#!/usr/bin/env bash
#
# Decides whether Vercel should build this commit.
#
#   exit 1  ->  build (Vercel's convention: non-zero means proceed)
#   exit 0  ->  skip
#
# Why this exists: a lot of this repo never reaches Vercel. The scout is Python
# run by GitHub Actions, scripts/ are local one-offs, db/ is SQL applied by
# hand, and markdown is documentation. Of 54 commits in three weeks, roughly a
# third touched only those — and every one still paid for a full Next build of
# a project carrying fabric.js, three.js and leaflet. Build CPU came to 27
# hours and $5.78 over that period.
#
# Fails OPEN on purpose. Any uncertainty — no parent commit, a shallow clone,
# git behaving unexpectedly — builds anyway. A wasted build costs cents; a
# wrongly-skipped one means the site silently stops matching the repo, which is
# a far worse failure and a confusing one to debug.

set -u

# Paths that cannot affect the deployed Next app.
EXCLUDES=(
    ':(exclude)services/**'   # the Python scout — runs on GitHub Actions
    ':(exclude)scripts/**'    # local maintenance scripts
    ':(exclude)db/**'         # SQL applied by hand to Supabase
    ':(exclude)*.md'          # docs
    ':(exclude).github/**'    # CI config
)

# No parent to compare against (first commit, shallow clone): build.
if ! git rev-parse HEAD^ >/dev/null 2>&1; then
    echo "No parent commit to diff against — building."
    exit 1
fi

# --quiet exits 0 when the diff is empty, i.e. nothing outside the excluded
# paths changed, i.e. nothing the build could possibly produce differently.
if git diff --quiet HEAD^ HEAD -- . "${EXCLUDES[@]}"; then
    echo "Only scout/scripts/db/docs changed — skipping the build."
    exit 0
fi

echo "App code changed — building."
exit 1
