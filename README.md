# TOMA — Training Management System

TOMA is the training-management system for the site: HR manage courses, managers register
their employees, and employees self-register and track their training. This repository is a
monorepo containing the modern rewrite alongside the legacy applications it is replacing.

> **Naming:** the product is **TOMA**. Much of the *legacy* code and the database schema are
> named `coma`/`COMA` — those literal names are kept where they refer to the existing system
> and database (renaming them would break the running app and the schema). All new code uses
> the `@toma/*` namespace.

See [`MODERNIZATION_PLAN.md`](./MODERNIZATION_PLAN.md) for the full technical spec, audit, and
task list driving this work.

## Layout

```
apps/
  web/            Modern client — React 19 + Vite (planned)
  api/            Modern API — NestJS over the existing MySQL/MariaDB (planned)
packages/
  shared/         @toma/shared — domain model (zod schemas + TS types), the contract source of truth
db/               Migrations, seed generators, mockup-DB compose (planned)
ci/               Shared CI scripts invoked by both GitHub Actions and GitLab CI (planned)
docs/             Reverse-engineered legacy schema and design notes
legacy-client/    The current Angular 6 app — untouched, runs until cutover
backend/          The current Express server — untouched, runs until cutover
```

The new apps build as two Docker images (`toma-web`, `toma-api`); the legacy apps keep their
own build/deploy until decommission. See the plan's §2.9–2.10.

## Development

Requires Node 22 (see `.nvmrc`). This is an npm-workspaces monorepo.

```bash
npm install            # installs all workspaces
npm run typecheck      # typecheck every workspace
npm run lint
npm run test
npm run format:check
```

Working on a single workspace:

```bash
npm run build -w @toma/shared
```

### Legacy apps

The legacy Angular client (`legacy-client/`) and Express server (`backend/`) are self-contained
with their own `package.json`, `Dockerfile`, and compose files. They are **excluded** from the
workspace root and from the shared tooling (lint/format) on purpose. See
`legacy-client/README.md` for how to run the old client.

> Note for CI/CD: the legacy client's Jenkins/GitLab jobs previously built from the repo root.
> After this restructure their build context is `legacy-client/` — the deploy pipeline must
> `cd legacy-client` (or set the compose/Docker context accordingly) until it is decommissioned.
