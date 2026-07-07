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
  Location                     VARCHAR(128)  NULL,
  IsIn                         TINYINT(1)    NOT NULL DEFAULT 1,
  IsMandatory                  TINYINT(1)    NOT NULL DEFAULT 0,
  IsConference                 TINYINT(1)    NOT NULL DEFAULT 0,
  CourseType                   INT           NOT NULL DEFAULT 0,
  Year                         INT           NOT NULL,
  Creator                      VARCHAR(128)  NULL,
  isTentative                  TINYINT(1)    NOT NULL DEFAULT 0,
  participantsAmountEstimated  INT           NOT NULL DEFAULT 0,
  INDEX idx_courses_year (Year),
  INDEX idx_courses_name (CourseName)
);

CREATE TABLE coursetouser (
  CourseID INT NOT NULL,
  ID       INT NOT NULL,
  PRIMARY KEY (CourseID, ID),
  INDEX idx_ctu_user (ID)
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
