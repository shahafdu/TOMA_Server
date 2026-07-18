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
  -- NEW (additive, bidding/registration lifecycle epic): which quarterly cycle a candidate
  -- course belongs to, and its state within that cycle's workflow.
  CycleID                      INT           NULL,
  LifecycleState               VARCHAR(16)   NOT NULL DEFAULT 'catalog',
  -- catalog|candidate|bidding|open|locked|confirmed|rejected
  Year                         INT           NOT NULL,
  Creator                      VARCHAR(128)  NULL,
  isTentative                  TINYINT(1)    NOT NULL DEFAULT 0,
  participantsAmountEstimated  INT           NOT NULL DEFAULT 0,
  INDEX idx_courses_year (Year),
  INDEX idx_courses_name (CourseName),
  INDEX idx_courses_cycle (CycleID)
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

-- NEW (additive): per-discipline yearly training-hour goals, applied to every employee.
-- Management/leadership tracks are modelled as disciplines here too, so a single
-- (Year, Discipline) grain covers both subject-domain and management-level goals.
CREATE TABLE training_goal (
  Year        INT          NOT NULL,
  Discipline  VARCHAR(64)  NOT NULL,
  TargetHours DECIMAL(6, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (Year, Discipline)
);

-- NEW (plan M1): explicit role assignment. Overrides the authorizationIdCOMA→role mapping,
-- and is the only way to represent the admin/developer roles that the legacy column can't.
CREATE TABLE user_role (
  sircID INT         NOT NULL PRIMARY KEY,
  role   VARCHAR(16) NOT NULL
);

-- ================= Quarterly bidding / registration lifecycle (new epic) =====================

-- One quarterly training cycle. Drives the phase every candidate course moves through.
CREATE TABLE training_cycle (
  CycleID              INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Year                 INT         NOT NULL,
  Quarter              TINYINT     NOT NULL,          -- 1..4
  Status               VARCHAR(16) NOT NULL DEFAULT 'draft',
  -- draft|bidding|registration|locked|completed
  BiddingClosesAt      DATETIME    NULL,              -- shown on the bidding form
  RegistrationClosesAt DATETIME    NULL,              -- shown on the registration form
  CreatedAt            DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cycle (Year, Quarter)
);

-- A manager's bid: how many of their people they want on a candidate course (#1).
CREATE TABLE course_bid (
  CourseID      INT      NOT NULL,
  ManagerSircID INT      NOT NULL,
  Seats         INT      NOT NULL DEFAULT 0,
  UpdatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (CourseID, ManagerSircID),
  INDEX idx_bid_course (CourseID)
);

-- No-show justification workflow (#9). A row is created when HR marks a registered person
-- absent; the person/manager submit a reason; HR accepts or rejects it.
CREATE TABLE attendance_justification (
  JustificationID INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  CourseID        INT         NOT NULL,
  ID              INT         NOT NULL,               -- employee sircID
  SessionDate     DATE        NULL,                   -- the missed day (NULL = whole course)
  Reason          TEXT        NULL,
  Status          VARCHAR(16) NOT NULL DEFAULT 'requested', -- requested|submitted|accepted|rejected
  CreatedAt       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_just (CourseID, ID, SessionDate),
  INDEX idx_just_course (CourseID)
);

-- The mail outbox. Every "automatic mail" is queued here (subject/body/recipient/schedule).
-- A dispatcher marks rows SentAt; on-prem Exchange wiring is the deferred production step.
CREATE TABLE notification_outbox (
  NotificationID  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Event           VARCHAR(40)  NOT NULL,
  RecipientSircID INT          NOT NULL,
  Subject         VARCHAR(255) NOT NULL,
  Body            TEXT         NOT NULL,
  CourseID        INT          NULL,
  CycleID         INT          NULL,
  ScheduledFor    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SentAt          DATETIME     NULL,
  ReadAt          DATETIME     NULL,
  CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_outbox_recipient (RecipientSircID),
  INDEX idx_outbox_due (SentAt, ScheduledFor)
);
