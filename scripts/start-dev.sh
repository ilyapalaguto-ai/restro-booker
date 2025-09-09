#!/bin/sh
set -e

echo "[entrypoint] starting dev container"

RETRIES=10
SLEEP_SECONDS=3

run_migrations() {
  echo "[migrations] running: npx drizzle-kit push"
  npx drizzle-kit push
}

attempt=1
until run_migrations || [ $attempt -gt $RETRIES ]; do
  echo "[migrations] attempt $attempt failed, retrying in ${SLEEP_SECONDS}s..."
  attempt=$((attempt+1))
  sleep $SLEEP_SECONDS
done

if [ $attempt -gt $RETRIES ]; then
  echo "[migrations] giving up after $RETRIES attempts" >&2
  exit 1
fi

echo "[migrations] applied successfully"
echo "[app] starting dev server"
exec npm run dev
