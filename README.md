# TOMA — Training Management System

TOMA is the training-management system for the site: HR manage courses, managers register
their employees, and employees self-register and track their training. This repository is an
npm-workspaces monorepo — a React web client and a NestJS API over the existing MySQL/MariaDB
(`coma` + `emma`) schema.

> **Naming:** the product is **TOMA**. The existing database schema is named `coma`/`COMA`;
> those literal names are kept where they refer to the database (renaming them would break the
> running schema). All application code uses the `@toma/*` namespace.

See [`MODERNIZATION_PLAN.md`](./MODERNIZATION_PLAN.md) for the full technical spec and design
notes, and [`docs/`](./docs) for the reverse-engineered `coma`/`emma` schema.

## Layout

```
apps/
  web/            React 19 + Vite + MUI client
  api/            NestJS API (mysql2) over the existing coma/emma schema
packages/
  shared/         @toma/shared — domain model (zod schemas + TS types), the contract source of truth
  contract/       @toma/contract — OpenAPI 3.1 generated from @toma/shared (gated in CI)
db/               Mockup schema + seed for local dev/testing, and a MariaDB compose file
ci/               Shared CI scripts invoked by both GitHub Actions and GitLab CI
docs/             Reverse-engineered coma/emma schema notes
```

Auth and mail are pluggable: locally the app uses **DevAuth** (username-only) and an in-app
**notification outbox**; on company infrastructure these are wired to LDAP and on-prem Exchange.

## Run it locally

Requires **Node 22** (see `.nvmrc`) and a **MariaDB/MySQL on `localhost:3306`** (e.g.
`docker run --name toma-db -e MARIADB_ROOT_PASSWORD=root -p 3306:3306 -d mariadb:10.11`).

```bash
npm install

# Create the coma + emma schemas, seed demo data, and the app's `toma` user (one time / to reset).
# Use the DB root credentials you chose above:
MOCKDB_ROOT_USER=root MOCKDB_ROOT_PASSWORD=root npm run db:setup

# Two terminals:
npm run dev -w @toma/api      # API on http://localhost:3000
npm run dev -w @toma/web      # web on http://localhost:4300 (proxies /api to the API)
```

Open **http://localhost:4300**. The API's defaults already match the seeded database, so no
`.env` is needed for local dev.

### Demo logins (DevAuth — username only, no password)

| Username | Role | Notes |
| --- | --- | --- |
| `alice` | HR (also manages Bob's org) | Company dashboard + budget, Training cycle controls, attendance entry |
| `bob` | Manager (R&D) | Team dashboard, bids on the seeded Q4 cycle, registers his team |
| `carol`, `dave` | Employees | Personal dashboard, self-registration, own notifications/justifications |
| `admin` | Admin | |
| `devuser` | Developer | Sees budget data |
| `frank` (subcontractor), `gina` (student) | — | Exercise the registration constraints |

## Development

This is an npm-workspaces monorepo.

```bash
npm run typecheck      # typecheck every workspace
npm run lint
npm run test           # requires a seeded DB (see above)
npm run format:check
npm run contract:check # fails if openapi.json is stale vs @toma/shared
```

Working on a single workspace:

```bash
npm run build -w @toma/shared
```
