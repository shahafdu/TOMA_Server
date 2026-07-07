# @toma/contract

The TOMA API **v1 OpenAPI contract**, generated from the `@toma/shared` zod schemas so the
server and client can never drift (plan §2.10, task T0.6).

- `src/document.ts` — the registry: component schemas (from `@toma/shared`) + path definitions.
- `openapi.json` — the generated, committed spec. **Do not edit by hand.**

## Commands

```bash
npm run contract:gen      # regenerate openapi.json from the schemas (run after schema changes)
npm run contract:check    # CI gate: fails if openapi.json is stale
npm run mock -w @toma/contract   # serve a mock API from the spec (Prism, fetched via npx)
```

Downstream: the web client's typed API client (orval) and the NestJS app's validation both
consume this spec / the shared schemas, and CI enforces `contract:check` so the committed spec
always matches the code.

## Coverage

A representative core of the §2.2 surface is defined (auth, employees + history, courses +
sessions, registrations + precheck, attendance, notification rules, hours report). The remaining
endpoints are added the same way — register the shared schema, add a `registerPath`.
