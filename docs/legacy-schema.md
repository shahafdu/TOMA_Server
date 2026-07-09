# Legacy Database Schema (reverse-engineered)

**Status:** reverse-engineered from `backend/` SQL and `backend/emma.users.md`. Column **types,
keys, and indexes are inferred, not authoritative** — confirm with a real dump (plan task T0.1):

```bash
mysqldump --no-data --routines coma emma > docs/schema.sql
```

Engine: **MySQL/MariaDB** (`mysql` driver; `.env` uses `MARIADB_*`). Two schemas: **`coma`**
(application data, writable) and **`emma`** (employee master, **read-only** for TOMA — fed from
Workday by the Emma application).

---

## `coma` schema

### `coma.courses`
One row per course run. Course identity is encoded in the name as `"<Name> #<N> <YYYY>"`.

| Column | Inferred type | Notes |
|---|---|---|
| `CourseID` | INT PK AUTO_INCREMENT | surrogate key |
| `CourseName` | VARCHAR | `"Name #N YYYY"`; year & run-number embedded in the string |
| `Lecturer` | VARCHAR | free text |
| `Syllabus` | TEXT | HTML (ngx-wig) |
| `TotalHours` | DECIMAL/INT | sum of session durations |
| `Price` | DECIMAL | budget-sensitive |
| `Notes` | VARCHAR(400) | |
| `TextForMail` | TEXT | HTML |
| `Location` | VARCHAR | maps to domain `venue` |
| `IsIn` | TINYINT(1) | internal (vs. external) |
| `IsMandatory` | TINYINT(1) | |
| `IsConference` | TINYINT(1) | |
| `CourseType` | INT | 0 = technical, else enrichment (conference via `IsConference`) |
| `Year` | INT | course year (also embedded in `CourseName`) |
| `Creator` | VARCHAR | free-text full name (no FK — see audit `creator` limitation) |
| `isTentative` | TINYINT(1) | planning placeholder |
| `participantsAmountEstimated` | INT | tentative-course estimate |

### `coma.coursetouser` — registrations
| Column | Inferred type | Notes |
|---|---|---|
| `CourseID` | INT FK → courses | |
| `ID` | VARCHAR/INT | employee `sircID` |

No status/source/timestamp columns — enrollment is a bare pair. (New model adds these, plan §4.6.)

### `coma.coursetodatetime` — sessions
| Column | Inferred type | Notes |
|---|---|---|
| `CourseID` | INT FK → courses | |
| `DateTimeStart` | DATETIME | |
| `DateTimeEnd` | DATETIME | |

No session PK; sessions are identified by (`CourseID`, `DateTimeStart`, `DateTimeEnd`).

### `coma.coursedatetimetouser` — attendance
| Column | Inferred type | Notes |
|---|---|---|
| `CourseID` | INT FK → courses | |
| `ID` | VARCHAR/INT | employee `sircID` |
| `DateTimeStart` | DATETIME | matches a session start |
| `DateTimeEnd` | DATETIME | matches a session end |

Presence of a row = attended. This is the **truth** education hours should derive from — but
today they don't (see per-year columns below).

### `coma.users` — per-year education hours ⚠️
| Column | Inferred type | Notes |
|---|---|---|
| `ID` | VARCHAR/INT PK | employee `sircID` |
| `EducationHours2019`, `…2020`, `…{year}` | DECIMAL | **one physical column per year** |

Hours are **running totals**, incremented/decremented on each attendance change
(`UPDATE … SET EducationHours{year} = EducationHours{year} ± <hrs>`). They drift from
`coursedatetimetouser` over time (plan §3.3 BB-5). A new year requires a manual `ALTER TABLE`.

### `coma.budget` / `coma.hours` — per-year settings ⚠️
- `budget`: columns `yearlyBudget{year}` (DECIMAL), single row.
- `hours`: columns `yearlyTargetHours{year}` (INT), single row.

Same per-year-column anti-pattern (plan §4.9 normalizes all three into row-per-year tables).

### `coma.houersPerMonthPerManager` — precomputed manager stats
(name misspelled in the schema itself)

| Column | Inferred type | Notes |
|---|---|---|
| `ID` | VARCHAR/INT | manager `sircID` |
| `recoredDate` | DATE | month bucket (misspelled) |
| `empCount` | INT | |
| `predictHours` | DECIMAL | |
| `presiceHours` | DECIMAL | misspelled "precise" |

Populated monthly by `spr_monthlyUpdateHoursPerMonthPerManager` (a Jenkins cron runs it).

---

## `emma` schema (read-only)

### `emma.users`
Documented in `backend/emma.users.md`. Fed from **Workday**. Key columns TOMA relies on:

| Column | Notes |
|---|---|
| `ID` | employee id (VARCHAR) — a distinct identifier from `sircID` |
| `sircID` | **the identifier TOMA/COMA keys on** |
| `genNum` | alternate id; leading zeros stripped in queries |
| `userName` | login; used by LDAP auth |
| `firstName`, `lastName`, `email`, `privateEmail`, `imageUrl` | |
| `managerID`, `managerSircID` | manager link (via either id) |
| `workTitle`, `rank` (1–8: PM/TL/…/Director) | drive notification `manager_title` selector |
| `teamName` | stored as `(TeamName)` with parentheses — normalize before use |
| `costCenter`, `CL`, `jobFamily`, `jobFamilyGroup` | org attributes |
| `category` | e.g. `SIRC`, `Contractor` — reports filter on `SIRC` |
| `status` | `working` / `left` / `deleted`; **deleted rows get a timestamp-suffixed id** |
| `startDate`, `startDate2`, `endDate`, `endDate2` | `*2` variants used for rehires |
| `authorizationIdCOMA` | TOMA permission level (1 None, 2 All, 3 PM) → role map (plan §4.6) |
| `AuthorizationID` | Emma's own level — distinct from `authorizationIdCOMA` |

Dates are normalized to a **noon timestamp** to avoid timezone date drift (this is why legacy
tentative courses use a 13:00–14:00 placeholder session).

Other `emma` tables referenced (not used by TOMA): `users_log`, `portal_view`, `new_user_it`,
`dept_name_to_code`, `auto_mail_exception_list`, `autoEmmaUsersBeckup`.

---

## Stored procedures (`coma`) — bodies not yet available (T0.1)

| Procedure | Params | Purpose |
|---|---|---|
| `spr_getAllemployeesCoursesWithHouersByManagerID` | managerID, targetYear | employees' courses + hours (Excel export) |
| `spr_getSumEmpPerMonth` | year | monthly active-employee counts |
| `spr_getPrecisetHoursPerMonthByManagerUsingOldData` | ID, year | precise hours/month for a manager |
| `spr_getPredictHoursPerMonthByManagerUsingOldData` | ID, year | predicted hours/month for a manager |
| `spr_getAmountEmployees` | ID | employee count under a manager |
| `spr_monthlyUpdateHoursPerMonthPerManager` | — | refreshes `houersPerMonthPerManager` |

These power the hours dashboards; the rewrite re-derives them from base tables and reconciles
against these procedures' output (plan T5.6). **Get the bodies via `--routines` in the dump.**

---

## Cross-cutting conventions & quirks (must survive into the new data layer)

1. **Course identity is a string** `"Name #N YYYY"`; year via `RIGHT(name,4)`, trimmed via
   `slice(0,-5)`. Substring matching (`LIKE "%name%"`) causes cross-course collisions
   (Java ↔ JavaScript). → replaced by `CourseSeries` + surrogate ids.
2. **Per-year columns** (`EducationHours{year}`, `yearlyBudget{year}`, `yearlyTargetHours{year}`)
   require annual DDL. → normalized in migration M6 (plan §4.9).
3. **Two employee ids** (`ID` vs `sircID`); TOMA keys on `sircID`, managers link via either.
4. **Deleted employees**: id suffixed with a timestamp; `status='deleted'`.
5. **`teamName`** wrapped in parentheses.
6. **Noon-normalized dates** in `emma`.
7. **`Creator`** is a free-text name, not an FK — attribution is unreliable (→ audit log).
8. **Attendance rows** carry denormalized `DateTimeStart/End` that must match a session exactly.
