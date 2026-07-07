-- emma schema (employee master). In production this is owned by the Emma app and fed from
-- Workday; TOMA reads it. Column set mirrors backend/emma.users.md (subset TOMA uses).
USE emma;

CREATE TABLE users (
  sircID              INT           NOT NULL PRIMARY KEY,
  ID                  VARCHAR(32)   NULL,
  genNum              VARCHAR(32)   NULL,
  userName            VARCHAR(64)   NOT NULL UNIQUE,
  firstName           VARCHAR(64)   NOT NULL,
  lastName            VARCHAR(64)   NOT NULL,
  email               VARCHAR(128)  NULL,
  privateEmail        VARCHAR(128)  NULL,
  imageUrl            VARCHAR(255)  NULL,
  workTitle           VARCHAR(64)   NULL,
  `rank`              INT           NULL,
  teamName            VARCHAR(64)   NULL,
  costCenter          VARCHAR(32)   NULL,
  category            VARCHAR(32)   NULL,
  status              VARCHAR(16)   NOT NULL DEFAULT 'working',
  startDate           DATETIME      NULL,
  startDate2          DATETIME      NULL,
  endDate             DATETIME      NULL,
  endDate2            DATETIME      NULL,
  managerID           VARCHAR(32)   NULL,
  managerSircID       INT           NULL,
  authorizationIdCOMA INT           NOT NULL DEFAULT 1,
  AuthorizationID     INT           NULL,
  INDEX idx_users_manager (managerSircID),
  INDEX idx_users_status (status)
);
