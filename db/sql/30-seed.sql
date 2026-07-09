-- Synthetic seed for the mockup DB. Designed to exercise the tricky legacy shapes:
--  * an org tree (HR → manager → reports) across the 5 roles
--  * a recurring course series ("Intro to TypeScript" in 2025 and 2026)
--  * a substring name collision (Java vs JavaScript)
--  * a no-suffix course, a conference, and a tentative course
--  * a prior-year participation (requirement #4)
--  * teamName stored with parentheses; a 'left' employee

USE emma;
INSERT INTO users
  (sircID, userName, firstName, lastName, email, workTitle, `rank`, teamName, category, status, startDate, managerSircID, authorizationIdCOMA)
VALUES
  (1, 'alice',   'Alice', 'Cohen',   'alice@example.com',   'HR Lead',   NULL, '(HR)',  'SIRC', 'working', '2018-02-01', NULL, 2),
  (2, 'bob',     'Bob',   'Levi',    'bob@example.com',     'Team Lead', 3,    '(R&D)', 'SIRC', 'working', '2019-05-01', 1,    3),
  (3, 'carol',   'Carol', 'Mizrahi', 'carol@example.com',   'Engineer',  NULL, '(R&D)', 'SIRC', 'working', '2021-09-01', 2,    1),
  (4, 'dave',    'Dave',  'Peretz',  'dave@example.com',    'Engineer',  NULL, '(R&D)', 'SIRC', 'working', '2022-01-15', 2,    1),
  (5, 'admin',   'Ada',   'Admin',   'admin@example.com',   'IT Admin',  NULL, '(IT)',  'SIRC', 'working', '2017-01-01', NULL, 2),
  (6, 'devuser', 'Dana',  'Dev',     'devuser@example.com', 'Developer', NULL, '(IT)',  'SIRC', 'working', '2020-03-01', NULL, 1),
  (7, 'erin',    'Erin',  'Gross',   'erin@example.com',    'Engineer',  NULL, '(R&D)', 'SIRC', 'left',    '2019-01-01', 2,    1),
  -- Non-permanent personnel under Bob, for the registration-constraint feature (#9).
  (8, 'frank',   'Frank', 'Nadav',   'frank@example.com',   'Contractor',NULL, '(R&D)', 'subcontractor', 'working', '2023-01-01', 2, 1),
  (9, 'gina',    'Gina',  'Shani',   'gina@example.com',    'Student',   NULL, '(R&D)', 'student',       'working', '2024-06-01', 2, 1);

USE coma;

-- Explicit role overrides for the roles the legacy column cannot express.
INSERT INTO user_role (sircID, role) VALUES (5, 'admin'), (6, 'developer');

INSERT INTO courses
  (CourseID, CourseName, Lecturer, Syllabus, TotalHours, Price, Location, IsIn, IsMandatory, IsConference, CourseType, Discipline, Year, Creator, isTentative, participantsAmountEstimated)
VALUES
  (101, 'Intro to TypeScript #1 2025', 'Noa Bar',   'TS basics',        8,  4000, 'Room A', 1, 0, 0, 0, 'Engineering',          2025, 'Alice Cohen', 0, 0),
  (201, 'Intro to TypeScript #2 2026', 'Noa Bar',   'TS basics',        8,  4500, 'Room A', 1, 0, 0, 0, 'Engineering',          2026, 'Alice Cohen', 0, 0),
  (202, 'Java #1 2026',                'Guy Adar',  'Java fundamentals',6,  3000, 'Room B', 1, 0, 0, 0, 'Engineering',          2026, 'Alice Cohen', 0, 0),
  (203, 'JavaScript #1 2026',          'Guy Adar',  'JS fundamentals',  6,  3200, 'Room B', 1, 0, 0, 0, 'Engineering',          2026, 'Alice Cohen', 0, 0),
  (204, 'Leadership 101 2026',         'Rina Katz', 'Leading teams',    4,  2000, 'Room C', 1, 0, 0, 1, 'Leadership',           2026, 'Alice Cohen', 0, 0),
  (205, 'Cloud Conf 2026',             'External',  'Cloud conference', 12, 6000, 'Expo',   0, 0, 1, 0, 'Cloud & Infra',        2026, 'Bob Levi',    0, 0),
  (206, 'Future AI #1 2026',           '',          '',                 5,  0,    '',       1, 0, 0, 0, 'Data & AI',            2026, 'Bob Levi',    1, 10),
  (207, 'Kubernetes Fundamentals 2026','Guy Adar',  'Containers & K8s', 12, 5200, 'Room B', 1, 0, 0, 0, 'Cloud & Infra',        2026, 'Alice Cohen', 0, 0),
  (208, 'Security Awareness 2026',     'Rina Katz', 'Annual security training', 2, 0, 'Online', 1, 1, 0, 1, 'Security & Compliance', 2026, 'Alice Cohen', 0, 0),
  (209, 'Effective Communication 2026','Rina Katz', 'Soft skills workshop', 6, 2400, 'Room C', 1, 0, 0, 1, 'Soft Skills',       2026, 'Alice Cohen', 0, 0),
  (210, 'Design Systems 2026',         'Noa Bar',   'Building scalable UI design systems', 8, 4800, 'Room A', 1, 0, 0, 0, 'Product & Design', 2026, 'Bob Levi', 0, 0),
  (211, 'Code of Conduct 2026',        'HR',        'Company code of conduct — required annually', 1, 0, 'Online', 1, 1, 0, 1, 'Security & Compliance', 2026, 'Alice Cohen', 0, 0),
  (212, 'Data Privacy & Policy Compliance 2026', 'HR', 'Data privacy and policy compliance training', 2, 0, 'Online', 1, 1, 0, 1, 'Security & Compliance', 2026, 'Alice Cohen', 0, 0);

-- Delivery, seat and constraint settings (registration epic #8/#9 + delivery requirement).
-- Online courses have unlimited seats and a connection link; no physical room.
UPDATE courses SET DeliveryType='online', Platform='corporate',
  PlatformUrl='https://learn.example.com/security-awareness', Location=NULL, Capacity=NULL
  WHERE CourseID=208;
UPDATE courses SET DeliveryType='online', Platform='corporate',
  PlatformUrl='https://learn.example.com/code-of-conduct', Location=NULL, Capacity=NULL
  WHERE CourseID=211;
UPDATE courses SET DeliveryType='online', Platform='corporate',
  PlatformUrl='https://learn.example.com/data-privacy', Location=NULL, Capacity=NULL
  WHERE CourseID=212;
UPDATE courses SET DeliveryType='online', Platform='other',
  PlatformUrl='https://zoom.example.com/j/future-ai', Location=NULL WHERE CourseID=206;

-- In-person courses keep their room in Location; HR caps seats and (optionally) per manager.
UPDATE courses SET Capacity=20, PerManagerLimit=3, ExcludeStudents=1,
  SelfRegistration='approval_required' WHERE CourseID=201;   -- Intro to TypeScript
UPDATE courses SET Capacity=25 WHERE CourseID=202;            -- Java
UPDATE courses SET Capacity=25 WHERE CourseID=203;            -- JavaScript
UPDATE courses SET Capacity=5, ExcludeSubcontractors=1 WHERE CourseID=205;  -- Cloud Conf
UPDATE courses SET SelfRegistration='approval_required' WHERE CourseID=209;  -- Effective Communication
UPDATE courses SET Capacity=12 WHERE CourseID=207;           -- Kubernetes (R&D-only, below)
-- Design Systems: free self-reg, capped small so the waitlist path is exercisable.
UPDATE courses SET SelfRegistration='open', Capacity=2 WHERE CourseID=210;

-- Kubernetes is limited to the R&D team/group (team names compared without the legacy parens).
INSERT INTO course_team_restriction (CourseID, teamName) VALUES (207, 'R&D');

INSERT INTO coursetodatetime (CourseID, DateTimeStart, DateTimeEnd) VALUES
  (101, '2025-03-10 09:00:00', '2025-03-10 13:00:00'),
  (101, '2025-03-11 09:00:00', '2025-03-11 13:00:00'),
  (201, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (201, '2026-03-11 09:00:00', '2026-03-11 13:00:00'),
  (202, '2026-05-20 09:00:00', '2026-05-20 15:00:00'),
  (203, '2026-09-15 09:00:00', '2026-09-15 15:00:00'),
  (204, '2026-06-01 13:00:00', '2026-06-01 17:00:00'),
  (205, '2026-11-01 09:00:00', '2026-11-01 21:00:00'),
  (206, '2026-12-01 13:00:00', '2026-12-01 14:00:00'),
  (207, '2026-10-05 09:00:00', '2026-10-05 15:00:00'),
  (207, '2026-10-06 09:00:00', '2026-10-06 15:00:00'),
  (208, '2026-09-01 10:00:00', '2026-09-01 12:00:00'),
  (209, '2026-07-20 13:00:00', '2026-07-20 17:00:00'),
  (210, '2026-11-15 09:00:00', '2026-11-15 17:00:00'),
  (211, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (212, '2026-02-15 10:00:00', '2026-02-15 11:30:00');

INSERT INTO coursetouser (CourseID, ID) VALUES
  (101, 3),
  (201, 3), (201, 4),
  (202, 3),
  (203, 4),
  (204, 2), (204, 3), (204, 4),
  (205, 2),
  (207, 4), (207, 3),
  (209, 2), (209, 3),
  (210, 3),
  -- Mandatory compliance courses apply to all working employees
  (208, 1), (208, 2), (208, 3), (208, 4), (208, 5), (208, 6),
  (211, 1), (211, 2), (211, 3), (211, 4), (211, 5), (211, 6),
  (212, 1), (212, 2), (212, 3), (212, 4), (212, 5), (212, 6);

-- A self-service registration awaiting Bob's approval (course 209 is approval_required).
INSERT INTO coursetouser (CourseID, ID, status, source, requestedBy)
  VALUES (209, 4, 'pending_approval', 'self', 4);

INSERT INTO coursedatetimetouser (CourseID, ID, DateTimeStart, DateTimeEnd) VALUES
  (101, 3, '2025-03-10 09:00:00', '2025-03-10 13:00:00'),
  (101, 3, '2025-03-11 09:00:00', '2025-03-11 13:00:00'),
  (201, 3, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (201, 3, '2026-03-11 09:00:00', '2026-03-11 13:00:00'),
  (201, 4, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (204, 2, '2026-06-01 13:00:00', '2026-06-01 17:00:00'),
  -- Compliance completions (varied, so rates are not 100%)
  (208, 1, '2026-09-01 10:00:00', '2026-09-01 12:00:00'),
  (208, 2, '2026-09-01 10:00:00', '2026-09-01 12:00:00'),
  (208, 3, '2026-09-01 10:00:00', '2026-09-01 12:00:00'),
  (211, 1, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (211, 2, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (211, 3, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (211, 4, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (211, 5, '2026-02-01 10:00:00', '2026-02-01 11:00:00'),
  (212, 1, '2026-02-15 10:00:00', '2026-02-15 11:30:00'),
  (212, 2, '2026-02-15 10:00:00', '2026-02-15 11:30:00');

INSERT INTO users (ID, EducationHours2024, EducationHours2025, EducationHours2026) VALUES
  (1, 0, 0, 0),
  (2, 0, 0, 4),
  (3, 0, 8, 8),
  (4, 0, 0, 4),
  (5, 0, 0, 0),
  (6, 0, 0, 0),
  (7, 0, 0, 0),
  (8, 0, 0, 0),
  (9, 0, 0, 0);

INSERT INTO budget (yearlyBudget2024, yearlyBudget2025, yearlyBudget2026) VALUES (90000, 100000, 120000);
INSERT INTO hours (yearlyTargetHours2024, yearlyTargetHours2025, yearlyTargetHours2026) VALUES (40, 40, 40);

-- ================= Quarterly cycle seed (bidding/registration lifecycle) ======================

-- A Q4 2026 cycle currently open for bidding (deadline in the near future).
INSERT INTO training_cycle (CycleID, Year, Quarter, Status, BiddingClosesAt)
  VALUES (1, 2026, 4, 'bidding', '2026-07-31 17:00:00');

-- Candidate courses HR put up for the Q4 cycle (their Q4 sessions already exist above).
UPDATE courses SET CycleID = 1, LifecycleState = 'bidding'
  WHERE CourseID IN (205, 206, 207, 210);

-- Bob (manager) has already bid on two of them; he can still change these until the deadline.
INSERT INTO course_bid (CourseID, ManagerSircID, Seats) VALUES
  (207, 2, 2),
  (210, 2, 1);

-- The "bidding opened" mail that reached Bob when HR launched the cycle.
INSERT INTO notification_outbox (Event, RecipientSircID, Subject, Body, CycleID, SentAt)
  VALUES ('bidding_opened', 2, 'Bidding open for Q4 2026 training',
          'HR has opened bidding for the Q4 2026 training cycle. Please submit how many of your team you want on each candidate course before 31 Jul 2026.',
          1, '2026-07-05 09:00:00');
