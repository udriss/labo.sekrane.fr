#!/usr/bin/env bash
set -euo pipefail

# CI helper to fail fast if schema drift, failed or unapplied migrations are detected.
# Use in pipelines: npm run ci:prisma:drift

echo "🔍 Checking Prisma migrations status..." >&2
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f .env.local ]; then
    # shellcheck disable=SC1091
    source .env.local
  elif [ -f .env ]; then
    # shellcheck disable=SC1091
    source .env
  fi
fi

OUT=$(npx prisma migrate status --schema prisma/schema.prisma 2>&1 || true)
printf '%s\n' "$OUT"

FAIL=0

# Schema validation / env issues
if grep -qi "Environment variable not found" <<<"$OUT"; then
  echo "❌ Missing required environment variables (e.g. DATABASE_URL)." >&2
  FAIL=1
fi
if grep -qi "Prisma schema validation" <<<"$OUT"; then
  echo "❌ Prisma schema validation error." >&2
  FAIL=1
fi

# Drift / failed / unapplied migrations
if grep -qi "Drift detected" <<<"$OUT"; then
  echo "❌ Drift detected between database schema and Prisma schema." >&2
  FAIL=1
fi
if grep -qi "failed migrations" <<<"$OUT"; then
  echo "❌ Failed migrations present." >&2
  FAIL=1
fi
if grep -qi "unapplied migrations" <<<"$OUT"; then
  echo "⚠️  Unapplied migrations present (treating as failure). Run: npx prisma migrate deploy" >&2
  FAIL=1
fi

if [ $FAIL -eq 0 ]; then
  echo "✅ Prisma migrations status clean." >&2
else
  exit 1
fi
