#!/usr/bin/env bash
#
# Waits for the CI MariaDB service, then (re)creates the mockup schemas and seeds them.
# Shared by both pipelines. Connects as root over TCP (host/password from MOCKDB_* env).
set -euo pipefail

host="${MOCKDB_HOST:-127.0.0.1}"
port="${MOCKDB_PORT:-3306}"

echo "Waiting for MariaDB at ${host}:${port}…"
for _ in $(seq 1 60); do
  if node -e "require('mysql2/promise').createConnection({host:process.env.MOCKDB_HOST||'127.0.0.1',port:+(process.env.MOCKDB_PORT||3306),user:process.env.MOCKDB_ROOT_USER||'root',password:process.env.MOCKDB_ROOT_PASSWORD||''}).then(c=>c.end()).then(()=>process.exit(0)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "MariaDB reachable."
    npm run db:setup
    exit 0
  fi
  sleep 2
done

echo "MariaDB did not become reachable in time." >&2
exit 1
