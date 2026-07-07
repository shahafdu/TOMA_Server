# TOMA Modernization Work Plan

**Scope:** Full refactor of the TOMA/COMA training-management client (this repo) plus the API contract it depends on.
**Goal:** A modern, secure, maintainable web app for HR course management, manager-driven registration, employee self-registration, and training analytics.
**Status:** Planning document — no implementation yet.

> **Repo reality check:** this repository (`TOMA_Server`) contains only the **Angular 6 frontend** ("COMA Client") plus a vendored fork of `ngx-wig`. The backend (Node/Express-style REST endpoints on port 8080) lives elsewhere. Several critical problems found below (authentication, authorization, data model) **cannot be fixed in the frontend alone** — the plan therefore includes a backend/API workstream that must be coordinated with the team that owns the server.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Part 1 — Target Technical Spec & Architecture](#2-part-1--target-technical-spec--architecture)
3. [Part 2 — Bug & Security Audit of the Current Code](#3-part-2--bug--security-audit)
4. [Part 3 — New Features & Enhancements](#4-part-3--new-features--enhancements)
5. [Part 4 — Phased Work Plan](#5-part-4--phased-work-plan)
6. [Risks & Mitigations](#6-risks--mitigations)
7. [Open Questions for Stakeholders](#7-open-questions-for-stakeholders)

---

## 1. Current State Assessment

| Aspect | Current | Problem |
|---|---|---|
| Framework | Angular 6.1 (2018, EOL), TypeScript 2.9, RxJS 6.2 | 14 major versions behind; no security patches; can't hire for it |
| HTTP | `@angular/http` (removed from Angular in v8) **and** `HttpClientModule` mixed | Deprecated API, duplicated stacks, `res.json()`/`res.text()` string parsing everywhere |
| Auth | Client-side only: `localStorage` flag + AES with a **hardcoded key in the bundle** | Trivially bypassable; see S-1/S-2/S-3 below |
| Data model | Courses identified by `"Name #N YYYY"` strings; year parsed by `slice(0, -5)` | Fragile string surgery in ~30 places; renames/collisions corrupt views |
| State | Mutable arrays on singleton services + manual `Subject.next()` | Race conditions, presentation styles stored on data objects |
| UI | Angular Material 6 + ng-bootstrap 3 + hand-rolled CSS, status conveyed by baby/old-man icons and red outlines | Dated, inconsistent, inaccessible, not responsive |
| Dates | moment.js (deprecated), locale-dependent `toLocaleDateString()` comparisons | Correctness bugs, bundle weight |
| Excel | `xlsx@0.15` (known CVEs) client-side with string-built formulas | Vulnerable dep, formula-injection risk |
| Tests | Karma/Jasmine/Protractor scaffolding, effectively no tests | No safety net (Protractor is discontinued) |
| Build/Deploy | Docker build **disables TLS verification globally**; Apache httpd with no SPA fallback | Supply-chain risk; deep-link refresh 404s |
| Backend API | ~40 verb-style endpoints (`addUserToCourse/:ID`, `getCourseExists/:name/:year`), plain HTTP, unauthenticated | No resource model, no pagination, no authz |

**Verdict:** an in-place upgrade (6→7→…→20) is not worth it for ~7k LOC of frontend code with no tests. A **contract-first parallel rebuild** is faster, safer, and lets the legacy app keep running until cutover.

---

## 2. Part 1 — Target Technical Spec & Architecture

### 2.1 Stack recommendation

**Recommended: Angular 20 LTS rebuild** (keeps the team's Angular knowledge, mature enterprise ecosystem). React 19 + Vite is a viable alternative if the team prefers a reset, but nothing in this product requires leaving Angular, and the migration cost is lower staying.

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Angular 20 (LTS)**, standalone components, signals, built-in control flow (`@if/@for`), zoneless-ready | No NgModules; typed reactive forms |
| Language/tooling | TypeScript 5.x `strict: true`, ESLint + `angular-eslint` + Prettier | tslint is dead; enforce in CI |
| UI kit | **Angular Material 3** (M3 design tokens) + Angular CDK | One UI library — drop ng-bootstrap/ngf-bootstrap entirely |
| Data fetching | **TanStack Query for Angular** (`@tanstack/angular-query`) or lightweight signal stores per feature | Caching, retries, invalidation, optimistic updates; avoids full NgRx ceremony |
| API client | **OpenAPI 3.1 contract → generated TS client** (openapi-generator or orval) | Single source of truth; kills hand-built URL strings |
| Auth | **OIDC / corporate SSO** (Entra ID / Okta / Keycloak) via `angular-auth-oidc-client`; JWT in interceptor | No passwords in this app at all |
| Dates | **date-fns v4** (with `@date-fns/tz`) or Luxon | Replace moment.js; all comparisons on ISO instants, never locale strings |
| Charts | **Chart.js 4** via `ng2-charts` v6 (or ngx-echarts if dashboards grow) | Follow a single dataviz style guide |
| Tables/grids | Angular Material table + CDK virtual scroll; **AG Grid Community** for the heavy HR admin grids | Sorting/filtering/pinning/export out of the box |
| Calendar | **FullCalendar** for course/session calendar views | |
| Rich text | **TipTap** (or Quill 2) replacing the vendored ngx-wig fork; sanitize with DOMPurify + server-side sanitization | Removes an unmaintained fork from the repo |
| Excel/exports | **exceljs** client-side for small exports; server-generated files for big reports | Retire `xlsx@0.15`; escape cell values (formula-injection) |
| Unit tests | **Vitest** (or Jest) with Angular Testing Library | Karma is deprecated |
| E2E tests | **Playwright** | Protractor is discontinued |
| Component workshop | Storybook (optional, phase 2+) | Design-system documentation |
| Error tracking | Sentry (self-hosted GlitchTip if data must stay on-prem) | Replaces silent `console.log` failure handling |

### 2.2 API redesign (contract-first, backend workstream)

Replace verb-style endpoints with a resource-oriented REST API, `/api/v1`, JSON, `application/problem+json` errors, cursor/offset pagination, server-side filtering & sorting.

**Core resources:**

```
POST   /auth (delegated to SSO — no custom login endpoint)
GET    /employees?query=&managerId=&page=            (paginated, filtered server-side)
GET    /employees/{id}
GET    /employees/{id}/registrations?year=
GET    /employees/{id}/reports/hours?year=
GET    /managers/{id}/team?depth=all                 (org subtree resolved server-side)

GET    /courses?year=&status=&type=&q=&page=
POST   /courses
GET    /courses/{id}                                 (numeric surrogate ID — NOT the name)
PATCH  /courses/{id}
DELETE /courses/{id}
POST   /courses/{id}:duplicate
GET    /courses/{id}/sessions
POST   /courses/{id}/sessions
GET    /courses/{id}/registrations
POST   /courses/{id}/registrations                   {employeeId, source: hr|manager|self}
PATCH  /registrations/{id}                           {status: registered|waitlisted|cancelled|approved…}
PUT    /sessions/{id}/attendance/{employeeId}        {present: bool}
POST   /courses/{id}/invitations                     (email + .ics)

GET    /reports/hours?year=&granularity=month&managerId=
GET    /reports/budget?year=
GET/PUT /settings/budget/{year} , /settings/target-hours/{year}
GET    /audit-log?entity=&page=
```

**Key contract rules:**
- Every entity has a **stable numeric/UUID id**. Course "identity by name + year suffix" is abolished; `code`/`title`/`year` become plain attributes. Course-family/duplication is modeled with a `templateId`/`seriesId` instead of the `#N` suffix convention.
- All authorization enforced **server-side** from JWT claims. The client only uses roles to hide UI.
- Aggregations (hours per month, per-manager rollups, org subtree) computed server-side — the current client fetches every user of every course individually (N+1 over HTTP).

### 2.3 Data model redesign

```
Employee        (id, firstName, lastName, email, managerId, category, status,
                 startDate, endDate, avatarUrl)          ← synced from HRIS, read-only here
Course          (id, code, title, descriptionHtml, notes, mailText, type: technical|enrichment|conference,
                 status: draft|tentative|scheduled|completed|cancelled|archived,
                 isMandatory, isInternal, price, capacity?, year, ownerId,
                 selfRegistration: none|open|approval_required, tags[])
CourseSession   (id, courseId, startsAt, endsAt, venue, lecturer)
Registration    (id, courseId, employeeId, status: invited|pending_approval|registered|
                 waitlisted|declined|cancelled, source: hr|manager|self,
                 requestedBy, approvedBy?, createdAt, updatedAt)
Attendance      (id, sessionId, employeeId, present, markedById, markedAt)
BudgetYear      (year, amount)   /  TargetHoursYear (year, hours)
NotificationLog (id, type, recipientId, courseId?, sentAt, channel)
AuditLog        (id, actorId, action, entityType, entityId, before/after, at)
```

This directly removes today's classes of bugs: string-suffix parsing, client-side joins, "attended" inferred from a separate name list, tentative courses encoded as a boolean + fake 13:00–14:00 session.

### 2.4 AuthN / AuthZ

- **Authentication:** OIDC Authorization Code + PKCE against corporate IdP. No password field anywhere in this codebase. Sessions via short-lived access tokens + silent refresh.
- **Authorization (server-enforced RBAC):**
  - `HR_ADMIN` — full CRUD, budgets, targets, reports, settings (today's "All").
  - `MANAGER` — sees own subtree, registers/deregisters own reports, proposes (tentative) courses, approves self-registrations of reports (today's "PM", but enforced server-side).
  - `EMPLOYEE` — sees catalog, own history/hours, self-registers where allowed. (New — today employees have no persona.)
- Route guards remain purely cosmetic; every API call re-checks on the server.

### 2.5 Frontend architecture

```
src/app/
  core/        auth (oidc), api (generated client), interceptors, error-handler, config
  shared/      ui components (page-shell, data-table, status-chip, empty-state, confirm),
               pipes, utils, design tokens
  features/
    dashboard/          role-aware home
    catalog/            course catalog: table + card + calendar views, filters
    course/             detail (tabs: overview, sessions, participants, attendance, comms)
    course-editor/      create/edit wizard, tentative flow, duplication
    employees/          directory, employee profile, team view
    registrations/      approvals inbox, waitlists
    reports/            hours, budget, compliance + exports
    admin/              budgets, targets, settings, audit log
```

- **State:** server state via TanStack Query (cache keys per resource, invalidation on mutation, optimistic add/remove participant); local UI state via signals. No mutable shared arrays, no `Subject` bus, no `style` objects written onto model instances.
- **Forms:** typed reactive forms; draft autosave **keyed by course id** (fixes cross-course recovery bug), with explicit "restore draft?" affordance.
- **Error handling:** central interceptor → problem+json → toast + Sentry; no silent failures.
- **Performance:** route-level code splitting, virtual scrolling on big lists, `OnPush`/signals everywhere.

### 2.6 UI/UX design

**Personas & entry experiences**
- **HR admin:** operational dashboard — upcoming sessions this week, courses missing attendance, budget vs. actual, pending approvals, quick actions.
- **Manager:** team dashboard — team hours vs. target (progress rings), team registrations, approve requests, "register my team" flow.
- **Employee (new):** course catalog, "my learning" (upcoming sessions, history, hours progress), self-registration.

**Key UX moves**
1. **Course catalog** replaces the collapsible-well list: card grid + data-table + **calendar view** toggles; faceted filters (year, type, status, mandatory, internal/external, dates); saved filters; global search (⌘K).
2. **Course creation wizard** (details → sessions → participants → review & notify) replaces the single 700-line form; inline conflict detection (per-person session overlap shown at selection time, hour-granular, timezone-safe).
3. **Status system:** colored chips + icons with text labels (Draft / Tentative / Scheduled / In progress / Completed / Needs attendance) replace baby/old-man/exclamation background images and red outlines.
4. **Participants management:** searchable multi-select with bulk paste of emails (keep this recent feature — it's good), bulk add team/department, capacity + waitlist indicators. Drag-and-drop kept only as an enhancement, never the only path.
5. **Attendance:** per-session roster with tap-to-toggle, "mark all", and printable/exportable sheet; optional QR self-check-in (phase 4+).
6. **Dashboards:** consistent chart style, target lines, quarter drill-down; replace the current white-on-dark hardcoded pink/yellow palette.
7. **Design quality bar:** WCAG 2.2 AA, full keyboard support, light/dark themes from one token set, responsive down to mobile (self-registration and attendance marking are the mobile-first flows), skeleton loading, empty states with next-step actions, undo toasts instead of blocking confirm dialogs where reversible.
8. **i18n-ready** (Angular i18n or Transloco), including RTL support if Hebrew UI is desired.

### 2.7 Infrastructure, build & CI/CD

- **Docker:** multi-stage `node:22-alpine` build → **nginx:alpine** runtime with SPA fallback (`try_files … /index.html`), gzip/brotli, security headers (CSP, HSTS), non-root user. Remove *all* TLS-verification bypasses (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `strict-ssl false`) — install the corporate CA properly instead.
- **Runtime config:** `config.json` fetched at startup (API base URL, IdP settings) — one image for all environments; delete hardcoded `http://localhost:8080`.
- **CI (GitLab):** lint → typecheck → unit tests → build → dependency & container scan → e2e (Playwright against preview) → deploy. Renovate/Dependabot for dependency currency.
- **Version check:** replace the recursive "you promised to refresh :(" nag loop with a standard build-hash banner ("New version available — Refresh").

---

## 3. Part 2 — Bug & Security Audit

Findings from reading the current code. File references point at this repo. Severity: 🔴 critical, 🟠 high, 🟡 medium, ⚪ low.

### 3.1 Security (all 🔴 unless noted)

| # | Finding | Location |
|---|---|---|
| S-1 | **Login is bypassable from devtools.** Auth state is `localStorage.getItem('isLoggedInKey') === 'true'`; the route guard trusts it. Setting one key grants the full app. | `auth.service.ts:45-49`, `auth.guard.ts:11` |
| S-2 | **Hardcoded symmetric encryption key shipped in the JS bundle.** Password is AES-encrypted client-side with a key any user can read — cryptographically equivalent to plaintext. Also transmitted over plain `http://`. | `auth.service.ts:62`, `urls.ts:1-2` |
| S-3 | **No session token — every data API is unauthenticated.** After login, no credential accompanies any request; anyone who can reach the backend can call `getAllUsers`, `removeCourse`, etc. directly. | `course.service.ts:86-98`, `employee.service.ts:89-91` |
| S-4 | **Authorization is client-side only.** PM/admin restrictions are UI filters (`filterPmsCourses`, guards); the API endpoints themselves accept anything. | `emp-list.component.ts:159-166`, `auth-mngr.guard.ts` |
| S-5 | **Build pipeline disables TLS verification globally** (`NODE_TLS_REJECT_UNAUTHORIZED=0`, npm `strict-ssl false`, apt/git verify off) — a supply-chain attack vector on every build. | `Dockerfile:13,22,28-31` |
| S-6 | **Known-vulnerable dependencies:** `xlsx@0.15` (CVE-2023-30533 prototype pollution), `crypto-js@3.1` (CVE-2023-46233 weak PBKDF2), moment.js (ReDoS advisories), Angular 6 itself (EOL, no patches). | `package.json` |
| S-7 | **Excel formula injection**: exported sheets embed server data and string-concatenated formulas without escaping; a course/user name starting with `=` executes in Excel. | `employee.service.ts:134-153, 315-353` |
| S-8 | 🟠 **Stored-HTML XSS surface**: syllabus/mail text are rich HTML (ngx-wig) rendered with a publicly injected `DomSanitizer`; needs server-side sanitization in the new design. | `course-detail.component.ts:33`, templates |
| S-9 | 🟡 Username written to `localStorage` **before** authentication succeeds; login result parsed with magic `res.text().slice(17)`. | `auth.service.ts:59-71` |
| S-10 | 🟡 Client `IUser` model carries a `password` field it never needs. | `user.model.ts:7` |

**Correction path:** S-1…S-4 are fixed by the OIDC + server-side RBAC design (§2.4), not by patching the current code. S-5 is an immediate quick win on the existing Dockerfile. S-6/S-7 disappear with the dependency choices in §2.1.

### 3.2 Functional bugs

| # | Sev | Finding | Location |
|---|---|---|---|
| B-1 | 🟠 | Typo `user_json.fastName` → every direct report's name renders as `"John undefined"` in the team table (and `lastName` is deleted right after). | `employee.service.ts:169` |
| B-2 | 🟠 | **Race in manager guard:** `currentUser` is populated by an async call on refresh; deep-linking to `/employees/:ID` runs the guard before `authorizationId`/`userList` load → legitimate admins/managers are denied (empty `getAllManagersEmployeesOffline`). | `auth.service.ts:21-33`, `auth-mngr.guard.ts:12-25` |
| B-3 | 🟠 | `getAllManagersEmployeesOffline` recurses the org tree with no cycle protection (only guards direct self-reference) → stack overflow on any managerial cycle; also O(n²) filtering per level. | `employee.service.ts:179-190` |
| B-4 | 🟠 | `isUserInMonthForReport` compares `getMonth()` **ignoring the year** — an employee who started March 2024 is excluded from Jan–Feb counts of *every* year, and `<`/`>` boundaries exclude the start/end months themselves. | `employee.service.ts:52-56` |
| B-5 | 🟠 | `IUser` defaults `startDate`/`endDate` to `new Date()` — any user built from a failed lookup appears to "end today" and is silently filtered out of future-year lists. | `user.model.ts:22`, `employee.service.ts:82-87` |
| B-6 | 🟠 | Hours page (limited view, pre-2022 path): the predicted-data cursor only advances **inside** the precise-data guard, so predicted months are skipped/misaligned once precise data runs short; `pridctedData[pridctedDataIndex]` is also unguarded → `TypeError`. | `hours.component.ts:173-185` |
| B-7 | 🟠 | `checkTime()` calls `moment.min([])` for courses with an empty schedule (tentative courses without dates) → Invalid date, NaN comparisons, broken filters. | `course-list.component.ts:364-371` |
| B-8 | 🟠 | Course identity by substring: `courseTable2Obj` matches `item.CourseName.includes(courseName)` so "Java" resolves against "JavaScript 2025"; year is recovered by `slice(-4)` and names trimmed with `slice(0, -5)` in ~30 places. Wrong course/year data whenever names overlap. | `course.service.ts:277-295` and callers |
| B-9 | 🟠 | Saving a **tentative course with no dates** reads `dateTimeList[length-1]` before the empty-list fallback runs → crash before save. | `course-edit.component.ts:447` |
| B-10 | 🟡 | `getNewNumberForCourse` uses a non-null assertion on `match(courseSuffRegEx)` — throws for names without `#N`; family matching by `indexOf` also cross-matches other families. | `course.service.ts:431-448` |
| B-11 | 🟡 | Date-collision check compares `toLocaleDateString()` strings (locale-dependent, whole-day granularity) and only warns *after* the participant was added; no hour-level overlap detection. | `course.service.ts:479-503` |
| B-12 | 🟡 | Numeric validators `pattern('[0-9].*')` accept `"1abc"` for hours/price/estimates. | `course-edit.component.ts:90,92,99-100` |
| B-13 | 🟡 | Autosave uses one global `localStorage` key: a draft from course A is offered for recovery inside course B; `canDeactivate` clears the draft even when the user cancels navigation. | `course-edit.component.ts:75,196-201,586-617` |
| B-14 | 🟡 | `removeCourseFromUser` reconstructs the course's full name with the **currently selected UI year** instead of the course's own year → stale `allCourses` entries when years differ. | `employee.service.ts:211` |
| B-15 | 🟡 | Sort comparators `(a >= b) ? 1 : -1` never return 0 — violates the comparator contract; equal rows jitter between renders. | `course-list.component.ts:361`, `emp-list.component.ts:189` |
| B-16 | 🟡 | Subscriptions to `openedUserChanged` / `openedCourseChanged` are never unsubscribed → handlers accumulate on every route visit (memory leak + repeated work). | `course-list.component.ts:130`, `emp-list.component.ts:124` |
| B-17 | 🟡 | `courseTable2Obj` mutates a service-wide `numServCalls` counter and emits `courseListChanged` from inside a per-course mapper → duplicate/missing emissions when calls interleave (e.g., year switch mid-load). | `course.service.ts:59,344-352,381-383` |
| B-18 | 🟡 | `course-edit` aliases `this.dateTimeList = course.schedule` — edits mutate the shared cached course object even when the user cancels. | `course-edit.component.ts:149,175` |
| B-19 | 🟡 | Hours dashboard reads `Object.keys(date[0])` assuming JSON key order equals month order — not guaranteed; also Chart.js v1-style `scales` options (`stepValue`, `steps`, `max: 20`) that Chart.js 2 ignores/clips. | `hours.component.ts:224,63-71` |
| B-20 | 🟡 | `setAttendanceAll` picks add-vs-remove based on `userList[0]` only, and shows the notification from whichever request happens to finish last. | `course-detail.component.ts:199-235` |
| B-21 | 🟡 | Deep-link refresh 404s: Apache httpd serves the SPA with no rewrite/fallback rule (`EXPOSE 8080` yet httpd listens on 80). | `Dockerfile:46-48` |
| B-22 | 🟡 | No error handling on any HTTP subscribe — server errors vanish (login page shows nothing if the backend is down). | `login-form.component.ts:36-45` and app-wide |
| B-23 | ⚪ | User-facing text: `"Courseupdated successfully"` (missing space), "Spetember", "Targert", "Change he's attendance", "evertyhing/cancal" in dialogs. | `course-edit.component.ts:571`, `hours.component.ts:60,315`, `budget.component.ts:29`, `version-check.service.ts:56-58` |
| B-24 | ⚪ | Version-check nag re-arms itself every 5 minutes forever ("You promised you will refresh the page :("), interval never cleared. | `version-check.service.ts:73-93` |
| B-25 | ⚪ | `NgbModule` imported twice (plain + `forRoot()`), `HttpModule` + `HttpClientModule` both loaded; hardcoded `'SIRC'` category filter; leftover `console.log`s and commented-out debug IDs. | `app.module.ts:80-81`, `emp-detail.component.ts:76`, `emp-list.component.ts:161-163` |
| B-26 | ⚪ | Presentation state (`style` objects, background-image icon stacks) written directly onto shared model instances. | `course-list.component.ts:217-283`, `emp-list.component.ts:131-151` |

**How the plan resolves these:** roughly a third (B-1, B-9, B-12, B-23…) are trivially fixable in the legacy app if a stop-gap release is wanted, but the structural ones (B-2/3/8/11/17) are consequences of the string-keyed data model and client-side joins — they disappear by design in the rebuild (§2.2–2.5). The plan therefore does **not** schedule a bug-fixing phase on legacy code beyond the security quick wins in Phase 0.

---

## 4. Part 3 — New Features & Enhancements

Prioritized with MoSCoW. "Must" items are in the phased plan; others are backlog.

### Must have (in scope of this program)
1. **Employee self-registration** — per-course policy (`none` / `open` / `approval_required`), capacity limits, waitlist with automatic promotion, confirmation emails.
2. **Manager approval workflow** — approvals inbox for managers/HR, notifications on request/approve/decline, full audit trail.
3. **Notifications engine** — templated email (invite, reminder N days before session, waitlist promoted, attendance missing) with **iCal (.ics) attachments** so sessions land in Outlook calendars; per-user notification log.
4. **Role-based dashboards** — HR operations view, manager team view, employee "my learning" view (§2.6).
5. **Compliance tracking for mandatory courses** — who hasn't completed which mandatory training, per org unit, with export and reminder blast.
6. **SSO** — corporate IdP login, no local passwords.
7. **Audit log** — every create/update/delete/registration change is attributable (today `creator` is a free-text full name).

### Should have
8. **Calendar views** — org-wide training calendar + personal calendar; Outlook/Exchange sync beyond .ics if an API is available.
9. **Post-course feedback surveys** — rating + comments, results on the course page; informs future planning.
10. **Course templates & series** — proper modeling of recurring courses (replaces the `#N` name-suffix convention), one-click "schedule next run".
11. **HRIS sync hardening** — scheduled employee import with reconciliation report instead of implicit reads.
12. **Certificates of completion** — generated PDF per attendee, stored on the employee profile.
13. **Bulk operations** — multi-select registration/removal, CSV import of participants, bulk attendance.
14. **Saved reports & scheduled exports** — email a monthly hours report to HR automatically.
15. **Teams/Slack notifications** as an additional channel.

### Could have (backlog)
16. Skill/topic tagging with personal recommendations ("people in your role took…").
17. QR-code self-check-in for attendance at the venue.
18. PWA install + offline attendance marking for instructors.
19. Budget forecasting (committed vs. actual vs. tentative) with scenario toggles.
20. External training requests (employee submits an external course/conference for approval with cost).
21. Learning paths (ordered course bundles for onboarding programs).
22. AI assistant for HR: draft course descriptions/invite emails, suggest schedule slots with fewest conflicts.

---

## 5. Part 4 — Phased Work Plan

Assumptions: 2–3 frontend/full-stack devs + 1 backend dev (part-time on the API) + designer at ~30%; sprints of 2 weeks. Legacy app keeps running untouched until Phase 6 cutover. Durations are estimates for planning, not commitments.

### Phase 0 — Discovery & Foundations (2–3 weeks)
- Inventory backend endpoints & DB schema with the server team; document the *actual* contract (source of truth for parity).
- Write the **OpenAPI v1 contract** for §2.2 and agree ownership/timeline with backend team.
- Decide IdP (Entra/Okta/Keycloak) and register the app; confirm email infrastructure for notifications.
- UX discovery: interviews with HR, 2–3 managers, employees; journey maps for the three personas; low-fi wireframes of catalog, course detail, wizard, dashboards.
- **Legacy quick wins (only these):** remove TLS bypasses from Dockerfile (S-5), add Apache SPA fallback (B-21), fix `fastName` typo (B-1) — cheap, high-value, keeps legacy usable during the program.
- **Deliverables:** signed-off API contract v1, design direction, environment/CI skeleton, groomed backlog.
- **Exit criteria:** backend team committed to contract milestones; IdP client credentials issued.

### Phase 1 — Platform Skeleton (3–4 weeks)
- New Angular 20 workspace: strict TS, ESLint/Prettier, Vitest, Playwright, CI pipeline with scans.
- OIDC login/logout/refresh, role claims, route guards, HTTP interceptor, problem+json error handling, Sentry.
- Generated API client from the OpenAPI contract (against a mock server until the real one lands).
- App shell: navigation, page layout, theming (M3 tokens, light/dark), design-system primitives (data table, status chip, empty state, confirm/undo toast, skeletons).
- Runtime `config.json`, nginx image, deploy to a dev environment.
- **Exit criteria:** login via SSO on dev; one end-to-end vertical slice (e.g., read-only course list from the mock API) with tests in CI.

### Phase 2 — Core Domain: Courses, Employees, Registration (5–6 weeks)
- **Catalog:** table/card/calendar views, faceted filters, saved filters, search.
- **Course detail:** tabs (overview, sessions, participants, attendance, communications), status chips, duplicate action.
- **Course editor wizard:** details → sessions (hour-granular conflict detection) → participants (search, bulk email paste, team add, capacity/waitlist) → review & notify. Draft autosave keyed by course id.
- **Employees:** directory with server-side pagination, employee profile (history, hours ring), manager team view.
- **Attendance:** per-session roster, mark all, export sheet.
- Backend parity work proceeds in parallel per contract.
- **Exit criteria:** HR can run the full course lifecycle (create → register → attend → complete) on staging with real data; feature parity checklist for these modules signed by HR.

### Phase 3 — Analytics & Reports (3–4 weeks)
- Hours dashboard (precise/predicted/tentative vs. target; month/quarter drill-down) — server-computed aggregates replacing the client-side math of `hours.component.ts`.
- Budget dashboard (cost vs. budget, committed vs. tentative).
- Compliance report for mandatory courses; Excel/CSV exports (server-generated, injection-safe).
- **Exit criteria:** numbers reconciled against legacy reports for the previous full year (acceptance test with HR).

### Phase 4 — Registration Workflows & Notifications (4–6 weeks)
- Self-registration policies, capacity & waitlist with auto-promotion.
- Manager/HR approvals inbox; audit log surface.
- Notification engine: templates, invites with .ics, reminders, waitlist/attendance nudges; per-user log.
- Employee "my learning" dashboard + mobile-responsive self-registration flow.
- **Exit criteria:** an employee can discover, request, get approved, attend, and see hours — with zero HR touch; notification deliverability verified.

### Phase 5 — Hardening & Migration (2–3 weeks)
- Accessibility audit (WCAG 2.2 AA), performance pass (bundle budget, LCP), penetration test of API authz.
- Data migration: split legacy `"Name #N YYYY"` records into Course/Session/Registration rows; reconciliation report; historical hours preserved.
- UAT with HR + pilot manager group; fix window.
- **Exit criteria:** UAT sign-off; migration dry-run clean on a production snapshot.

### Phase 6 — Cutover & Decommission (1–2 weeks)
- Freeze legacy writes → final migration → DNS/route switch → legacy app read-only for one grace period → decommission.
- Runbook, admin documentation, handover session for HR.

**Total: ~5–6 months.** Compressible to ~4 by overlapping Phases 3/4 with more staffing; the critical path is the backend contract (Phases 0–2).

### Suggested milestones

| Milestone | Target |
|---|---|
| M1 API contract signed, design direction approved | end Phase 0 |
| M2 SSO + vertical slice on dev | end Phase 1 |
| M3 Course lifecycle parity on staging | end Phase 2 |
| M4 Reports reconciled with legacy | end Phase 3 |
| M5 Self-registration + notifications live on staging | end Phase 4 |
| M6 Production cutover | end Phase 6 |

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Backend/API workstream slips (contract is the critical path) | Blocks Phases 2+ | Contract-first with a mock server; frontend never waits on the real backend; escalate ownership in Phase 0 |
| Legacy data quality (name-suffix keys, orphan attendance rows) | Migration errors, wrong history | Migration dry-runs with reconciliation reports early (start in Phase 2, not 5) |
| No SSO/IdP available in the subsidiary | Auth redesign blocked | Fallback: Keycloak instance federated to corporate directory; decided in Phase 0 |
| HR workflow knowledge is tribal | Parity gaps discovered late | Phase 0 interviews + written parity checklist; HR reviews at every phase exit |
| Scope creep from the feature backlog | Timeline blowout | MoSCoW enforced; "Could" items need explicit trade-off decisions |
| Team ramp-up on Angular 20 idioms (signals, standalone) | Slow start | Phase 1 includes reference implementations + lint rules encoding the patterns |
| Parallel-run confusion (two apps live) | User frustration | Banner in legacy app linking to new one per migrated module; short parallel window |

---

## 7. Open Questions for Stakeholders

1. **IdP:** Which SSO provider does the corporate parent mandate (Entra ID / Okta / other)? Is a client registration for this subsidiary feasible?
2. **Backend ownership:** Who owns the server repo, and can they staff the API workstream on this timeline? Node/Express kept, or is a rewrite (e.g., NestJS) on the table?
3. **HRIS source:** Where does employee/manager/category data authoritatively come from, and is there an API/export for scheduled sync?
4. **Email/calendar:** SMTP relay or Microsoft Graph available for invites and .ics? Is Teams notification wanted?
5. **Languages:** English only, or Hebrew (RTL) UI as well?
6. **Self-registration policy:** default open or approval-required? Who approves — direct manager, HR, or course owner?
7. **History depth:** how many years of legacy records must be migrated vs. archived read-only?
8. **Compliance:** any retention/privacy constraints (training records are personal data) that affect audit-log and export design?
9. **Naming:** product is called TOMA but the codebase says COMA — confirm the name for the new UI.
