# TOMA Modernization Work Plan (v2)

**Scope:** Full rewrite of the TOMA/COMA training-management system UI + API layer, **on top of the existing database schema** and the existing on-premises company infrastructure.
**Goal:** A modern, secure, maintainable web app for HR course management, manager-driven registration, employee self-registration, and training analytics.
**Status:** Planning document — implementation follows the task list in §6.

**Binding constraints (from product owner):**

1. **Rewrite in React** (agreed — rationale in §2.1). Same database; new fields handled additively with approved migrations. Same on-prem environment infrastructure (Docker on company servers, internal network, no cloud services).
2. **Five roles:** Admin, Developer, HR, Manager, Employee (matrix in §2.4).
3. **Recurring courses become first-class** — today each yearly run is an unrelated course row distinguished only by a `"Name #N YYYY"` naming convention.
4. **Managers see full multi-year training history** of their employees; registering an employee checks prior participation in the same course (re-registration allowed but must be visible).
5. **Automatic registration notification emails** to relevant managers; **HR-configurable rules** (per course or global; recipients by manager title, department, etc.).
6. **Any DB change ships as a migration script**, including automatic identification of recurring courses, tested on a mockup database, and **requires Admin approval before running on production**.
7. **Mail/calendar is on-prem Exchange + Outlook** — integration via SMTP relay + iCalendar and/or EWS. No cloud APIs (no Microsoft Graph).
8. **No calendar schedule** — the work is expressed as a dependency-ordered task list (§6), to be executed by Claude.

> **Repo reality check:** this repository contains only the Angular 6 frontend ("COMA Client"). The backend is a separate Node service exposing ~40 verb-style endpoints. Because the auth and data-model problems live in the API layer, the rewrite includes a new backend API **over the existing database** (§2.2–2.3).

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Part 1 — Target Technical Spec & Architecture](#2-part-1--target-technical-spec--architecture)
3. [Part 2 — Bug & Security Audit of the Current Code](#3-part-2--bug--security-audit)
4. [Part 3 — Database Strategy & Migration Plan](#4-part-3--database-strategy--migration-plan)
5. [Part 4 — New Features & Enhancements](#5-part-4--new-features--enhancements)
6. [Part 5 — Task List](#6-part-5--task-list)
7. [Risks & Mitigations](#7-risks--mitigations)
8. [Open Questions / Required Inputs](#8-open-questions--required-inputs)

---

## 1. Current State Assessment

| Aspect | Current | Problem |
|---|---|---|
| Framework | Angular 6.1 (2018, EOL), TypeScript 2.9, RxJS 6.2 | 14 major versions behind; no security patches; can't hire for it |
| HTTP | `@angular/http` (removed from Angular in v8) **and** `HttpClientModule` mixed | Deprecated API, duplicated stacks, `res.json()`/`res.text()` string parsing everywhere |
| Auth | Client-side only: `localStorage` flag + AES with a **hardcoded key in the bundle** | Trivially bypassable; see S-1/S-2/S-3 below |
| Data model | Courses identified by `"Name #N YYYY"` strings; year parsed by `slice(0, -5)` | Fragile string surgery in ~30 places; renames/collisions corrupt views; recurring courses are unrelated rows |
| State | Mutable arrays on singleton services + manual `Subject.next()` | Race conditions, presentation styles stored on data objects |
| UI | Angular Material 6 + ng-bootstrap 3 + hand-rolled CSS, status conveyed by baby/old-man icons and red outlines | Dated, inconsistent, inaccessible, not responsive |
| Dates | moment.js (deprecated), locale-dependent `toLocaleDateString()` comparisons | Correctness bugs, bundle weight |
| Excel | `xlsx@0.15` (known CVEs) client-side with string-built formulas | Vulnerable dep, formula-injection risk |
| Tests | Karma/Jasmine/Protractor scaffolding, effectively no tests | No safety net (Protractor is discontinued) |
| Build/Deploy | Docker build **disables TLS verification globally**; Apache httpd with no SPA fallback | Supply-chain risk; deep-link refresh 404s |
| Backend API | ~40 verb-style endpoints (`addUserToCourse/:ID`, `getCourseExists/:name/:year`), plain HTTP, unauthenticated | No resource model, no pagination, no authz |

**Verdict:** in-place upgrade is not worth it for ~7k LOC with no tests. **Rewrite the client in React and the API layer in TypeScript over the existing database**, run in parallel with the legacy app, then cut over.

---

## 2. Part 1 — Target Technical Spec & Architecture

### 2.1 Why React (agreed) and the exact stack

React is the right call here, for reasons beyond preference:

- **A rewrite erases Angular's only advantage** — team familiarity with *this* codebase. Since nothing is being ported, the migration-cost argument for staying on Angular disappears.
- **Hiring/longevity:** React's talent pool and ecosystem are the largest by far; for an internal system maintained for years by a small team, that matters more than framework taste.
- **Fit:** this is a data-heavy CRUD + dashboards app. React + TanStack Query is the most well-trodden path for exactly this shape of app; less framework ceremony than Angular DI/modules.
- **Incremental simplicity:** plain Vite SPA — no SSR needed for an internal tool behind the firewall, so no Next.js complexity.

One honest caveat: Angular's all-in-one structure enforces consistency on junior teams, while React requires choosing libraries. The stack below removes that ambiguity by fixing every choice up front.

| Layer | Choice | Notes |
|---|---|---|
| Build | **Vite + React 19 + TypeScript 5 (`strict`)** | Plain SPA; no SSR needed on the internal network |
| Routing | **React Router v7** (library mode) | Boring and well-known; role-guarded route tree |
| Server state | **TanStack Query v5** | Caching, invalidation, optimistic updates, retries |
| Local state | React state + **Zustand** only where genuinely global (auth/session, UI prefs) | No Redux ceremony |
| UI kit | **MUI (Material UI) v7** + MUI X DataGrid | Closest continuity with the current Material look; enterprise tables, date pickers included |
| Forms | **react-hook-form + zod** | Zod schemas shared with the API layer for end-to-end validation |
| Dates | **date-fns v4** | All logic on ISO instants; never locale-string comparisons |
| Charts | **Recharts** (or Chart.js 4 if pixel-parity with old charts is wanted) | Single dataviz style guide |
| Calendar | **FullCalendar (React)** | Catalog calendar view + personal schedule |
| Rich text | **TipTap** + DOMPurify (client) + server-side sanitization | Retires the vendored ngx-wig fork |
| Excel export | Server-generated via **exceljs**; injection-safe cell escaping | Retires `xlsx@0.15` |
| i18n | **i18next** (RTL-ready if Hebrew UI is wanted) | |
| API client | **OpenAPI-generated TS client** (orval) + MSW mocks for dev/tests | Contract-first |
| Tests | **Vitest + React Testing Library + MSW**, **Playwright** e2e | |
| Lint/format | ESLint (typescript-eslint) + Prettier, enforced in CI | |

**Backend (rewritten API layer over the existing DB):**

| Layer | Choice | Notes |
|---|---|---|
| Runtime | **Node.js 22 LTS + NestJS (TypeScript)** | Same runtime family as the existing server → same infra; NestJS gives structure, guards, OpenAPI generation |
| DB access | **Prisma** with schema **introspected from the existing database** (`prisma db pull`) | Guarantees we build on the schema as-is; migrations authored separately (§4) |
| API docs | OpenAPI 3.1 generated from Nest decorators + zod DTOs | Feeds the frontend client generator |
| Mail | **nodemailer → on-prem Exchange SMTP relay**; iCalendar (RFC 5545) MIME parts for Outlook meeting invites | §2.6 |
| Jobs | **BullMQ + Redis** (or node-cron if Redis is not allowed on the servers) | Reminder emails, notification queue, HRIS sync |
| Logging/audit | pino structured logs + `audit_log` table | |

### 2.2 API design (contract-first, over the existing DB)

Resource-oriented REST, `/api/v1`, JSON, `application/problem+json` errors, pagination and filtering server-side. Verb-style endpoints and name-encoded identity (`getCourse/:name`) are retired; the API speaks in **stable IDs** even while the underlying tables still key some data by name (the mapping happens once, in the data layer, instead of in 30 client call-sites).

```
POST   /auth/login | /auth/logout | GET /auth/me        (AD-backed, §2.5)

GET    /employees?query=&managerId=&department=&page=
GET    /employees/{id}                                   (field visibility per role, §2.4)
GET    /employees/{id}/history                           (ALL years: registrations + attendance, grouped by series)
GET    /managers/{id}/team?depth=all

GET    /course-series?q=&type=&page=                     (recurring course = series, §4.2)
GET    /course-series/{id}                               (all runs across years, aggregate stats)
POST   /course-series/{id}:schedule-next-run

GET    /courses?year=&status=&type=&seriesId=&q=&page=
POST   /courses                                          (HR; Manager creates with status=requested)
GET    /courses/{id}
PATCH  /courses/{id}
DELETE /courses/{id}
POST   /courses/{id}:duplicate
GET    /courses/{id}/sessions        POST /courses/{id}/sessions
GET    /courses/{id}/registrations
POST   /courses/{id}/registrations                       {employeeId, source: hr|manager|self}
       → response includes priorParticipations[] for the same series (re-registration visibility)
GET    /courses/{id}/registrations/precheck?employeeIds=  (bulk duplicate/conflict check before committing)
PATCH  /registrations/{id}                               (approve | decline | cancel | waitlist ops)
PUT    /sessions/{id}/attendance/{employeeId}            {present: bool}
POST   /courses/{id}/invitations                         (email + .ics meeting request)

GET/POST/PATCH/DELETE /notification-rules                (HR-managed, §2.7)
GET    /notification-log?courseId=&recipientId=&page=

GET    /reports/hours?year=&granularity=month&managerId=
GET    /reports/budget?year=                             (HR only — hidden from Admin)
GET    /reports/compliance?year=
GET/PUT /settings/budget/{year} , /settings/target-hours/{year}

GET    /admin/audit-log?entity=&actor=&page=             (Admin/Developer)
GET    /admin/db/health                                  (Admin: orphan rows, name-convention violations, integrity checks)
POST   /admin/migrations/{id}:approve                    (Admin approval gate, §4.4)
GET    /admin/migrations                                 (status, reports, dry-run results)
```

All aggregation (hours/month, org subtrees, series stats) is computed server-side — the current client does N+1 HTTP joins per course participant.

### 2.3 Domain model (logical — physical mapping in §4)

```
Employee        id, firstName, lastName, email, managerId, department, title,
                category, status, startDate, endDate            ← existing tables, read-mostly
CourseSeries    id, canonicalName, type, description, tags[]    ← NEW (recurring-course identity)
Course (run)    id, seriesId, title, year, descriptionHtml, notes, mailText,
                type: technical|enrichment|conference,
                status: requested|tentative|scheduled|completed|cancelled|archived,
                isMandatory, isInternal, price, capacity?,
                selfRegistration: none|open|approval_required, ownerId
CourseSession   id, courseId, startsAt, endsAt, venue, lecturer
Registration    id, courseId, employeeId, status: invited|pending_approval|registered|
                waitlisted|declined|cancelled, source: hr|manager|self,
                requestedBy, approvedBy?, timestamps
Attendance      sessionId, employeeId, present, markedById, markedAt
NotificationRule id, scope: global|series|course, event, recipientSelectors[], enabled  (§2.7)
NotificationLog id, ruleId?, type, recipient, courseId?, sentAt, status, error?
BudgetYear      year, amount        TargetHoursYear  year, hours
AuditLog        id, actorId, role, action, entityType, entityId, before, after, at
Role/UserRole   role assignment per user                        ← NEW (5-role model)
```

### 2.4 Roles & permission matrix (5 roles, server-enforced)

Roles are held in a new `user_role` table (the existing `authorizationIdCOMA` column is preserved and mapped during migration: `All→HR`, `PM→Manager`, `None→Employee`). Enforcement is server-side per endpoint **and per field** — role-based DTO serialization decides which fields leave the server (e.g., budget/price fields stripped for Admin and Manager responses), so "hidden fields" can't be recovered from the network tab.

| Capability | Admin | Developer | HR | Manager | Employee |
|---|:--:|:--:|:--:|:--:|:--:|
| System/infra dashboards, DB health & repair tools | ✅ | ✅ (mock DB) | — | — | — |
| Approve & run DB migrations (production) | ✅ | dry-run only | — | — | — |
| Manage user roles | ✅ | — | — | — | — |
| View audit log | ✅ | ✅ | own-entity events | — | — |
| **Budget & cost data (amounts, prices, budget reports)** | 🚫 hidden | ✅ (mock/test data) | ✅ | 🚫 hidden | 🚫 hidden |
| Create / edit / delete courses & series | 🔧 repair-mode only | ✅ (testing) | ✅ | request/suggest only | — |
| Approve manager course requests | — | ✅ (testing) | ✅ | — | — |
| Register anyone to a course | — | ✅ (testing) | ✅ | own reports only | self only |
| View employee list & profiles | ✅ (sensitive fields hidden) | ✅ | ✅ full | own subtree, some fields hidden | self only |
| View multi-year training history | ✅ | ✅ | ✅ all | ✅ own reports (all years) | ✅ self |
| Mark attendance | 🔧 repair | ✅ | ✅ | own reports' courses | — |
| Configure notification rules | — | ✅ (testing) | ✅ | — | — |
| Reports & dashboards | infra only | ✅ | ✅ all | team-scoped | self-scoped |
| Self-register to open courses | — | ✅ | ✅ | ✅ | ✅ (where allowed) |

Notes:
- **Admin** is an *operator* role: full schema/infra access (DB health console, integrity repair, migration approvals, role management) but business-sensitive fields (budgets, prices) are masked in both UI and API responses. Direct DB access stays possible at the DB tier — the app-level hiding is a policy statement, not a technical wall, and is documented as such.
- **Developer** gets every feature enabled but is bound to **non-production environments / the mockup database**. Implementation: environment-scoped role — the production deployment refuses Developer-role logins (config flag), while staging/dev accept them. A visible environment banner (color-coded) prevents "which DB am I on?" accidents.
- **Manager** course suggestions reuse the tentative-course concept: a Manager `POST /courses` creates `status=requested`; HR reviews in an approvals inbox and promotes to `tentative`/`scheduled`.

### 2.5 Authentication (on-prem)

No cloud IdP is available, so in order of preference:

1. **ADFS (on-prem) via OIDC** if the company runs it — standard SSO, no passwords touch our app.
2. Otherwise **direct LDAP/AD bind** from the API: user submits AD credentials to `/auth/login` over TLS, API binds against the domain controller, then issues an **httpOnly, Secure, SameSite session cookie** (server-side session store). No JWT-in-localStorage, no crypto in the browser.
3. Optional later: Kerberos/IWA (Negotiate) for silent intranet SSO.

Either way: the current scheme (client-side AES with a bundled key + a localStorage flag) is deleted entirely, and **every** API route enforces authn + role authz middleware.

### 2.6 Exchange / Outlook integration (on-prem)

- **Email sending:** nodemailer → the on-prem Exchange **SMTP relay** (submission endpoint, TLS, service account). All notification mail goes through one queued mailer with retry + `notification_log`.
- **Calendar invites:** RFC 5545 iCalendar MIME parts (`method=REQUEST`) attached to invite mails — Outlook renders these as real meeting requests with Accept/Decline. Session changes send `SEQUENCE`-incremented updates; cancellations send `method=CANCEL`. This covers invites/updates/cancellations **without any Exchange API dependency**.
- **Optional EWS layer** (phase-later task): a service account using Exchange Web Services (SOAP) enables organizer-owned meetings, attendee tracking, and free/busy lookups when scheduling sessions. Kept optional because EWS auth (NTLM/Basic) and library support (`ews-javascript-api`) are heavier; SMTP+iCal delivers 90% of the value.
- **Reminders:** queued jobs (N days before session) send reminder mail per notification rules.

### 2.7 Notification rules engine (HR-configurable)

```
NotificationRule {
  id, name, enabled,
  scope:   global | series(seriesId) | course(courseId),
  event:   registration_created | self_registration_requested | registration_cancelled |
           registration_approved | waitlist_promoted | course_requested |
           session_reminder(offsetDays) | attendance_missing,
  recipientSelectors: [                     // union, deduplicated at send time
    { kind: direct_manager }                // manager of the affected employee
    { kind: manager_title,  title: "..." }  // e.g., all "Group Leader"s
    { kind: department,     dept:  "..." }  // managers/members of a department
    { kind: hr }                            // all HR-role users
    { kind: course_owner }
    { kind: employee }                      // the affected employee
    { kind: custom_emails,  emails: [...] }
  ],
  templateId, createdBy, updatedAt
}
```

- **Defaults shipped:** `registration_created → direct_manager + hr` (satisfies requirement #5 out of the box), `self_registration_requested → direct_manager`, `waitlist_promoted → employee`.
- **HR UI:** rules table + editor with recipient-selector chips, per-course override panel on the course page ("this course notifies: …"), live preview ("this rule currently resolves to 14 recipients"), test-send button, and the send log.
- Evaluation happens in the API on domain events; sends are queued, logged, deduplicated per (event, recipient).

### 2.8 Frontend architecture & UX

```
src/
  app/            router, providers, role guards, env banner
  api/            generated client + query hooks (TanStack Query)
  auth/           session store, login page, role helpers
  ui/             design system: PageShell, DataTable, StatusChip, EmptyState,
                  ConfirmUndo, FieldMasked, charts theme
  features/
    dashboard/    role-aware home (HR ops / manager team / employee "my learning" / admin infra)
    catalog/      series-grouped catalog: table + cards + calendar; faceted filters; ⌘K search
    series/       series page: all runs across years, stats, "schedule next run"
    course/       detail tabs: overview | sessions | participants | attendance | notifications
    course-editor/ wizard: details → sessions (hour-level conflict check) → participants → review & notify
    employees/    directory (server-side pagination), profile with FULL multi-year history timeline
    registrations/ approvals inbox (HR + managers), waitlists, duplicate-participation warnings
    reports/      hours, budget (HR), compliance; exports
    notifications/ HR rules management + send log
    admin/        role management, audit log, DB health, migration review & approval
```

UX specifics carried over from v1 of this plan and extended:

1. **Series-first catalog** — recurring courses appear once, expandable to runs; per-run status chips (Requested / Tentative / Scheduled / In progress / Completed / Needs attendance) replace the baby/old-man/exclamation icon system.
2. **Registration with history visibility (req. #4):** when a manager picks an employee for a course, the picker row shows prior participations of the same series inline ("✔ attended 2023 · registered 2021"); committing a re-registration requires an explicit "register again" confirmation. Bulk precheck endpoint powers the same UX for multi-select.
3. **Manager team view:** roster with hours-vs-target rings, expandable full history per employee (all years), restricted fields never rendered (and never sent — §2.4).
4. **Course wizard** replaces the 700-line form; per-person session-overlap detection at selection time (hour-granular, timezone-safe, server-checked).
5. **Attendance:** tap-to-toggle roster per session, "mark all", printable/exportable sheet.
6. **Accessibility & polish:** WCAG 2.2 AA, keyboard-complete, light/dark from one token set, responsive (self-registration and attendance are the mobile-first flows), skeletons, empty states, undo-toasts instead of blocking confirms where reversible.
7. **Admin console:** DB health checks (orphan attendance rows, name-convention violations, series-mapping exceptions), migration review/approval screen (§4.4), role management, audit log browser.

### 2.9 Infrastructure (same environment, hardened)

- **Same shape as today:** Docker images on company servers, docker-compose/`production.yaml`, GitLab CI/Jenkins. New images: `toma-web` (nginx:alpine serving the React build with SPA fallback, gzip, security headers, non-root) and `toma-api` (node:22-alpine, non-root).
- **Remove all TLS-verification bypasses** from builds; install the corporate CA into the images properly. npm installs go through the company proxy with `strict-ssl` **on**.
- **Runtime config** (`/config.json` for web, env vars for API): API base URL, AD/LDAP settings, SMTP host, DB DSN. One image for all environments; no hardcoded `http://localhost:8080`.
- **CI:** lint → typecheck → unit tests → build → dependency & container scan → e2e (Playwright vs. compose stack with mockup DB) → publish images. Migration dry-run job runs on every migration change (§4.5).

---

## 3. Part 2 — Bug & Security Audit

Findings from reading the current code; these motivate design choices above and define the legacy quick-win tasks in §6. Severity: 🔴 critical, 🟠 high, 🟡 medium, ⚪ low.

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

**Correction path:** S-1…S-4 are fixed by the AD-backed session + server-side RBAC design (§2.5), not by patching the current code. S-5 is an immediate quick win on the existing Dockerfile. S-6/S-7 disappear with the dependency choices in §2.1.

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

The structural bugs (B-2/3/8/11/17) are consequences of the string-keyed data model and client-side joins — they disappear by design in the rewrite. Only the cheap legacy quick wins (S-5, B-1, B-21) are worth fixing in the old app while it runs in parallel.

---

## 4. Part 3 — Database Strategy & Migration Plan

Hard constraints: **the existing database keeps serving the app**; new needs are met **additively**; every change is a reviewed, tested, Admin-approved migration.

### 4.1 Additive-only principles

1. **Never** rename, drop, or change the semantics of an existing column/table while the legacy app can still write (parallel-run period). The legacy app must keep functioning against the migrated schema.
2. New capabilities go into **new tables** (`course_series`, `registration_ext`, `notification_rule`, `notification_log`, `user_role`, `audit_log`, `migration_approval`) and **new nullable columns** with defaults (e.g., `course.series_id`, `course.capacity`, `course.self_registration`).
3. The API's data layer owns the mapping between the legacy shape (name-keyed rows, `"Name #N YYYY"`) and the domain model (§2.3). Compatibility views can be added for reporting if useful.
4. Existing data is never destructively rewritten; derived structures (series links) are populated alongside.

### 4.2 Recurring-course identification (automatic, reviewed)

A migration tool scans all historical course rows and proposes series groupings:

- **Normalization:** strip trailing year (`\s\d{4}$`) and run suffix (`#\d+$`), trim, casefold, collapse whitespace → candidate series key.
- **Grouping:** exact normalized-name match ⇒ high confidence; fuzzy match (small edit distance / token overlap, same course type) ⇒ low confidence, flagged.
- **Output:** a human-readable **series-mapping report**: proposed `course_series` rows, member runs per series with years, confidence per grouping, and an exceptions list (ambiguous or one-off courses).
- **Review loop:** the report is reviewed (Admin + HR domain knowledge), corrections applied to a mapping file, re-run until clean; only then does the data migration insert `course_series` rows and set `course.series_id`.

### 4.3 Migration tooling

- Versioned SQL migrations (**node-pg-migrate/knex-style runner**, engine per the actual DB — to be confirmed from the server's config; scripts are plain SQL with `up`/`down`).
- Every migration ships with: purpose description, DDL/DML, expected effects (row counts, affected tables), rollback script, and automated **reconciliation checks** (e.g., "every non-archived course has a series_id", "sum of hours per employee unchanged").
- **Dry-run mode** prints the plan and reconciliation results without committing.

### 4.4 Admin approval gate (requirement #6)

- Production migration execution requires a recorded approval: the runner writes a `migration_approval` row (migration id, checksum, approver, timestamp) and **refuses to apply any migration on the production DSN without a matching approved checksum**.
- The Admin console (§2.8) shows pending migrations with their reports and dry-run output, and provides the Approve action; approval can also be granted via a signed CLI command if the console isn't available (bootstrap case).
- Every run (dry or real) is logged to `audit_log` with before/after row counts.

### 4.5 Mockup database & testing (requirement #6)

- **Mockup DB** = same engine + schema in Docker Compose, seeded two ways: (a) synthetic generator (realistic names, org tree, multi-year recurring courses, edge cases like `#N` suffixes, name collisions such as Java/JavaScript, orphan attendance rows) and (b) optional **anonymizer** for a production snapshot (scrubs names/emails, keeps distributions) for high-fidelity rehearsal.
- CI runs on every migration change: fresh mockup DB → apply all migrations → reconciliation assertions → run API integration test suite against the migrated schema → legacy-compat smoke checks (the queries the old app issues still succeed).
- The Developer role's environments always point at mockup DBs (§2.4).

---

## 5. Part 4 — New Features & Enhancements

Requirements #2–#5 (roles, series, history visibility, notifications) are specified in §2 and are **in scope**. Remaining backlog, prioritized:

### Must have (in scope)
1. **Employee self-registration** — per-course policy (`none`/`open`/`approval_required`), capacity, waitlist with automatic promotion.
2. **Manager course requests** — request/suggest flow with HR approvals inbox (per role matrix).
3. **Registration notifications with HR-configurable rules** (§2.7) incl. reminders and .ics Outlook invites (§2.6).
4. **Compliance tracking for mandatory courses** — per org unit, exportable, reminder blast.
5. **Audit log** — every mutation attributable (today `creator` is a free-text name).
6. **Admin console** — DB health, migration approvals, role management.

### Should have
7. Post-course feedback surveys (rating + comments on the course page).
8. "Schedule next run" from a series (copies latest run; replaces the `#N` convention UX).
9. HRIS sync hardening — scheduled employee import with reconciliation report.
10. Certificates of completion (PDF on the employee profile).
11. Bulk operations — multi-select registration, CSV import, bulk attendance.
12. Saved reports & scheduled email exports (monthly hours report to HR).

### Could have (backlog)
13. Skill/topic tagging + recommendations ("people in your role took…").
14. QR self-check-in for attendance.
15. Budget forecasting (committed vs. actual vs. tentative scenarios).
16. External training requests (employee submits external course/conference with cost for approval).
17. Learning paths (ordered bundles for onboarding).
18. EWS-based organizer meetings + free/busy-aware session scheduling (§2.6).

---

## 6. Part 5 — Task List

Dependency-ordered checklist (no calendar). ⛔ marks tasks blocked on stakeholder input (§8); everything else is executable by Claude. Legacy app stays untouched except T0.4.

### WS-0 — Inputs & groundwork
- [ ] T0.1 ⛔ Obtain DB engine/version, connection details, and a schema dump (or read access) — *everything in WS-2/WS-3 keys off the real schema*
- [ ] T0.2 ⛔ Confirm auth path: ADFS available? else LDAP endpoint + service account (§2.5)
- [ ] T0.3 ⛔ Exchange SMTP relay host/port + service account; confirm whether EWS is reachable
- [ ] T0.4 Legacy quick wins on the running app: remove Docker TLS bypasses (S-5), add SPA fallback (B-21), fix `fastName` typo (B-1)
- [ ] T0.5 Document the existing schema (tables, keys, name conventions, data quirks) as `docs/legacy-schema.md`
- [ ] T0.6 Write the OpenAPI v1 contract for §2.2; set up mock server (MSW/prism) from it

### WS-1 — Mockup database & migration framework  *(prereq: T0.1, T0.5)*
- [ ] T1.1 Docker Compose mockup DB (same engine/version) + synthetic seed generator (org tree, multi-year recurring courses, `#N` suffixes, name-collision and orphan-row edge cases)
- [ ] T1.2 Optional production-snapshot anonymizer (scrub PII, keep distributions)
- [ ] T1.3 Migration runner: versioned SQL up/down, dry-run mode, reconciliation-check hooks, checksums
- [ ] T1.4 `migration_approval` gate: refuse un-approved checksums on the production DSN; CLI approve command; audit logging
- [ ] T1.5 CI job: fresh mockup DB → apply migrations → reconciliation asserts → legacy-compat smoke queries

### WS-2 — Schema extensions & data migration  *(prereq: WS-1)*
- [ ] T2.1 Migration M1: `user_role` (+ mapping from `authorizationIdCOMA`: All→HR, PM→Manager, None→Employee), `audit_log`
- [ ] T2.2 Migration M2: `course_series` + `course.series_id` (nullable) + new course columns (`capacity`, `self_registration`, `status` — additive, legacy-compatible defaults)
- [ ] T2.3 Series auto-detection tool (§4.2): normalization + grouping + confidence scoring → series-mapping report (`reports/series-mapping.md`)
- [ ] T2.4 ⛔ Review loop on the mapping report (Admin/HR corrections) → final mapping file
- [ ] T2.5 Migration M3: populate `course_series` / `series_id` from the approved mapping; reconciliation: every course mapped or explicitly one-off
- [ ] T2.6 Migration M4: `registration_ext` (status/source/approver), `notification_rule`, `notification_log`
- [ ] T2.7 Full dry-run of M1–M4 on mockup (synthetic + anonymized) with reconciliation report; package for Admin approval (§4.4)

### WS-3 — Backend API  *(prereq: T0.6, WS-1; runs against mockup DB until cutover)*
- [ ] T3.1 NestJS scaffold: config, pino logging, problem+json errors, OpenAPI generation, healthcheck
- [ ] T3.2 Prisma introspection of the existing schema; repository layer translating legacy shapes (name-keyed rows) → domain model (§2.3)
- [ ] T3.3 Auth: LDAP/AD bind (or ADFS OIDC per T0.2), server-side sessions, httpOnly cookies, CSRF protection
- [ ] T3.4 RBAC: role guards per endpoint + **field-level DTO masking** per §2.4 (budget/price stripped for Admin/Manager/Employee); production refuses Developer logins
- [ ] T3.5 Employees module: directory (paginated/filtered), profile, org subtree (cycle-safe), **multi-year history grouped by series**
- [ ] T3.6 Courses & series module: CRUD, duplicate, schedule-next-run, manager `status=requested` flow, sessions with hour-level conflict checks
- [ ] T3.7 Registrations module: create (with `priorParticipations` in response — req. #4), bulk precheck endpoint, approve/decline/cancel, capacity + waitlist with auto-promotion
- [ ] T3.8 Attendance module: per-session marking, bulk mark, export (exceljs, injection-safe)
- [ ] T3.9 Reports module: hours (precise/predicted/tentative vs. target, month/quarter), budget (HR-only), compliance — all aggregation in SQL
- [ ] T3.10 Notification engine: rule model + evaluation on domain events, recipient resolution (direct manager / title / department / HR / custom), queued mailer (nodemailer→SMTP), templates, `notification_log`, retry/dedupe
- [ ] T3.11 iCalendar generation: REQUEST/UPDATE(SEQUENCE)/CANCEL parts on invites and session changes; reminder jobs (offsetDays)
- [ ] T3.12 Admin module: audit-log query API, DB health checks (orphans, convention violations), migrations status + approve endpoints
- [ ] T3.13 Server-side HTML sanitization for syllabus/mail text (fixes S-8 class)
- [ ] T3.14 API integration test suite against mockup DB (role matrix tests: every endpoint × 5 roles)

### WS-4 — Frontend (React)  *(prereq: T0.6; parallel with WS-3 via mocks)*
- [ ] T4.1 Vite + React 19 + TS scaffold, ESLint/Prettier, Vitest/RTL/MSW, Playwright, CI wiring
- [ ] T4.2 Design system: theme tokens (light/dark), PageShell/nav, DataTable, StatusChip, EmptyState, ConfirmUndo, skeletons, env banner (prod/staging/dev color-coded)
- [ ] T4.3 Generated API client (orval) + TanStack Query hooks + MSW mocks from OpenAPI
- [ ] T4.4 Auth flow: login page (or ADFS redirect), session handling, role-guarded route tree, "Developer blocked in prod" handling
- [ ] T4.5 Catalog: series-grouped table/cards/calendar views, faceted filters, saved filters, ⌘K search
- [ ] T4.6 Series page: runs across years, stats, schedule-next-run
- [ ] T4.7 Course detail: tabs (overview/sessions/participants/attendance/notifications), status chips, duplicate
- [ ] T4.8 Course editor wizard: details → sessions (conflict warnings) → participants (search, bulk email paste, team add, capacity/waitlist indicators, **prior-participation badges + re-register confirmation**) → review & notify; draft autosave keyed by course id
- [ ] T4.9 Employees: directory, profile with multi-year history timeline, manager team view (hours rings, hidden fields respected)
- [ ] T4.10 Registrations: approvals inbox (HR/manager), waitlist management, self-registration flow (mobile-first)
- [ ] T4.11 Attendance: roster tap-to-toggle, mark-all, printable sheet
- [ ] T4.12 Dashboards: HR ops / manager team / employee "my learning" / admin infra
- [ ] T4.13 Reports: hours, budget (HR-only render), compliance; export buttons
- [ ] T4.14 Notification rules UI: rules table/editor with recipient chips, per-course overrides, recipient preview, test-send, send log
- [ ] T4.15 Admin console: role management, audit browser, DB health, **migration review & approve** screen
- [ ] T4.16 A11y pass (WCAG 2.2 AA), keyboard coverage, responsive audit
- [ ] T4.17 Playwright e2e: role-based journeys (HR course lifecycle; manager register-with-history-warning; employee self-register; admin approve migration)

### WS-5 — Deployment & cutover  *(prereq: WS-2, WS-3, WS-4)*
- [ ] T5.1 Production images: nginx web (SPA fallback, headers, non-root), node API (non-root); no TLS bypasses; corporate CA baked in
- [ ] T5.2 Compose/`production.yaml` for company servers: web + api + redis (if used) alongside legacy; runtime config files
- [ ] T5.3 Staging deployment against mockup/anonymized DB; Developer-role access enabled here
- [ ] T5.4 ⛔ Admin approval of M1–M4 on production (via the approval gate) → run migrations → reconciliation report
- [ ] T5.5 Parallel run: new app live against production DB; legacy app still available; banner cross-links; verify legacy still functions post-migration (additive guarantee)
- [ ] T5.6 Reconcile reports vs. legacy for the last full year (hours/budget numbers match or divergences explained)
- [ ] T5.7 ⛔ Cutover decision → legacy switched to read-only → decommission; runbook + admin/HR handover docs

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Real schema differs from what the client code implies (only the API's SQL knows the truth) | Rework in data layer | T0.1/T0.5 first; Prisma introspection makes the schema explicit before any feature work |
| Series auto-detection mis-groups courses (fuzzy matches) | Wrong history/compliance data | Confidence-scored report + human review loop (T2.3/T2.4); low-confidence groups require explicit approval; one-off fallback is safe |
| Legacy app breaks against migrated schema during parallel run | Outage for current users | Additive-only rule (§4.1) + legacy-compat smoke queries in CI (T1.5) + T5.5 verification |
| LDAP/ADFS specifics unknown until T0.2 | Auth rework | Auth isolated behind one NestJS module with a narrow interface; both strategies implemented behind config |
| Exchange deliverability quirks (relay restrictions, iCal rendering in Outlook versions) | Broken invites | Test-send tooling early (T3.11 against a real mailbox), plain-text fallback part in every mail |
| Field-level hiding leaks via some endpoint | Budget data exposure to Admin/Managers | Central DTO-masking layer + role-matrix integration tests on every endpoint (T3.14) |
| Scope creep from backlog (§5) | Never-ending project | Task list is the scope; backlog items enter only by explicit decision |

---

## 8. Open Questions / Required Inputs

Blocking items (map to ⛔ tasks):

1. **T0.1** — DB engine + version, and a schema dump or read-only credentials. Is direct DB access from a dev environment possible, or should I work from a provided dump?
2. **T0.2** — Is ADFS available for OIDC, or do we authenticate via direct LDAP bind? LDAP host/base DN + a service account either way. Which AD groups (if any) should map to the five roles automatically?
3. **T0.3** — Exchange SMTP relay host/port + service account for the sender mailbox (e.g., `toma@company`). Is EWS enabled/reachable if we later want organizer-owned meetings?
4. **T2.4** — Who reviews the series-mapping report with me (needs HR domain knowledge of which historic names are "the same course")?
5. **T5.4 / T5.7** — Who holds the Admin role at go-live (migration approval + cutover decision)?

Non-blocking, decide anytime:
6. Language(s): English only, or Hebrew (RTL) too?
7. Which employee fields exactly are hidden from Managers (and from Admin besides budget/price)?
8. Should Manager course *requests* notify HR by default (suggested: yes, via a shipped notification rule)?
9. Redis allowed on the company servers for the job queue, or should reminders run on in-process cron?
