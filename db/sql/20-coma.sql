-- coma schema (TOMA application data). Tables mirror the legacy structure (docs/legacy-schema.md),
-- including the per-year-column anti-pattern, plus the NEW additive `user_role` table (plan M1).
USE coma;

CREATE TABLE courses (
  CourseID                     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  CourseName                   VARCHAR(200)  NOT NULL,          -- "Name #N YYYY"
  Lecturer                     VARCHAR(128)  NULL,
  Syllabus                     TEXT          NULL,
  TotalHours                   DECIMAL(6, 2) NOT NULL DEFAULT 0,
  Price                        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  Notes                        VARCHAR(400)  NULL,
  TextForMail                  TEXT          NULL,
  Location                     VARCHAR(128)  NULL,          -- in-person: room / external venue
  IsIn                         TINYINT(1)    NOT NULL DEFAULT 1,
  IsMandatory                  TINYINT(1)    NOT NULL DEFAULT 0,
  IsConference                 TINYINT(1)    NOT NULL DEFAULT 0,
  CourseType                   INT           NOT NULL DEFAULT 0,
  Discipline                   VARCHAR(64)   NULL,          -- NEW (additive): subject domain
  -- NEW (additive, plan §2.3.1 + registration epic): delivery, seats, self-reg, constraints.
  DeliveryType                 VARCHAR(16)   NOT NULL DEFAULT 'in_person',  -- 'in_person' | 'online'
  Platform                     VARCHAR(16)   NULL,          -- online: 'corporate' | 'other'
  PlatformUrl                  VARCHAR(512)  NULL,          -- online: connection link
  Capacity                     INT           NULL,          -- total seat cap (NULL = unlimited)
  PerManagerLimit              INT           NULL,          -- max seats a single manager may fill
  SelfRegistration             VARCHAR(24)   NOT NULL DEFAULT 'none', -- 'none'|'open'|'approval_required'
  ExcludeSubcontractors        TINYINT(1)    NOT NULL DEFAULT 0,
  ExcludeStudents              TINYINT(1)    NOT NULL DEFAULT 0,
  Year                         INT           NOT NULL,
  Creator                      VARCHAR(128)  NULL,
  isTentative                  TINYINT(1)    NOT NULL DEFAULT 0,
  participantsAmountEstimated  INT           NOT NULL DEFAULT 0,
  INDEX idx_courses_year (Year),
  INDEX idx_courses_name (CourseName)
);

CREATE TABLE coursetouser (
  CourseID    INT NOT NULL,
  ID          INT NOT NULL,
  -- NEW (additive): registration lifecycle so self-service + approval can be represented.
  status      VARCHAR(20) NOT NULL DEFAULT 'registered', -- registered|pending_approval|waitlisted|declined|cancelled
  source      VARCHAR(10) NOT NULL DEFAULT 'hr',          -- hr|manager|self
  requestedBy INT NULL,
  approvedBy  INT NULL,
  createdAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (CourseID, ID),
  INDEX idx_ctu_user (ID),
  INDEX idx_ctu_status (CourseID, status)
);

-- NEW (additive, registration epic #8): restrict a course's registration to specific teams.
-- No rows for a course ⇒ open to all teams.
CREATE TABLE course_team_restriction (
  CourseID INT         NOT NULL,
  teamName VARCHAR(64) NOT NULL,
  PRIMARY KEY (CourseID, teamName)
);

CREATE TABLE coursetodatetime (
  CourseID      INT      NOT NULL,
  DateTimeStart DATETIME NOT NULL,
  DateTimeEnd   DATETIME NOT NULL,
  INDEX idx_ctd_course (CourseID)
);

CREATE TABLE coursedatetimetouser (
  CourseID      INT      NOT NULL,
  ID            INT      NOT NULL,
  DateTimeStart DATETIME NOT NULL,
  DateTimeEnd   DATETIME NOT NULL,
  INDEX idx_cdtu_course (CourseID),
  INDEX idx_cdtu_user (ID)
);

-- Per-year education-hours columns (running totals) — the legacy anti-pattern (§4.9).
CREATE TABLE users (
  ID                INT           NOT NULL PRIMARY KEY,
  EducationHours2024 DECIMAL(6, 2) NOT NULL DEFAULT 0,
  EducationHours2025 DECIMAL(6, 2) NOT NULL DEFAULT 0,
  EducationHours2026 DECIMAL(6, 2) NOT NULL DEFAULT 0
);

CREATE TABLE budget (
  yearlyBudget2024 DECIMAL(12, 2) NOT NULL DEFAULT 0,
  yearlyBudget2025 DECIMAL(12, 2) NOT NULL DEFAULT 0,
  yearlyBudget2026 DECIMAL(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE hours (
  yearlyTargetHours2024 INT NOT NULL DEFAULT 0,
  yearlyTargetHours2025 INT NOT NULL DEFAULT 0,
  yearlyTargetHours2026 INT NOT NULL DEFAULT 0
);

-- NEW (plan M1): explicit role assignment. Overrides the authorizationIdCOMA→role mapping,
-- and is the only way to represent the admin/developer roles that the legacy column can't.
CREATE TABLE user_role (
  sircID INT         NOT NULL PRIMARY KEY,
  role   VARCHAR(16) NOT NULL
);
