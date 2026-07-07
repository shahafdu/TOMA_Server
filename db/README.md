# @toma/db — mockup database

A disposable MariaDB (same engine as production) holding the two legacy schemas — **`coma`**
(application data) and **`emma`** (employee master) — with synthetic seed data. It backs the
API's integration tests and local development until the real database is available.

## Layout

- `sql/00-init.sql` — drop/recreate `coma` + `emma`, create the `toma` app user.
- `sql/10-emma.sql`, `sql/20-coma.sql` — DDL mirroring the legacy schema (`docs/legacy-schema.md`),
  including the per-year-column pattern and the new additive `user_role` table (plan M1).
- `sql/30-seed.sql` — synthetic org tree, a recurring course series, a Java/JavaScript name
  collision, a tentative course, and a prior-year participation (requirement #4).
- `src/setup.ts` — applies the SQL in order (idempotent).

## Usage

```bash
# Option A — Docker (parity with CI):
docker compose -f db/docker-compose.yml up -d
MOCKDB_HOST=127.0.0.1 MOCKDB_ROOT_PASSWORD=root npm run db:setup

# Option B — a local MariaDB reachable via unix socket:
MOCKDB_SOCKET=/var/run/mysqld/mysqld.sock npm run db:setup
```

The API connects as `toma`/`toma` to database `coma` and reaches `emma` via qualified names
(the app user is granted on both), mirroring the legacy backend's cross-database queries.
