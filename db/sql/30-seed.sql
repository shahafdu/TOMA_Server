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
  (7, 'erin',    'Erin',  'Gross',   'erin@example.com',    'Engineer',  NULL, '(R&D)', 'SIRC', 'left',    '2019-01-01', 2,    1);

USE coma;

-- Explicit role overrides for the roles the legacy column cannot express.
INSERT INTO user_role (sircID, role) VALUES (5, 'admin'), (6, 'developer');

INSERT INTO courses
  (CourseID, CourseName, Lecturer, Syllabus, TotalHours, Price, Location, IsIn, IsMandatory, IsConference, CourseType, Year, Creator, isTentative, participantsAmountEstimated)
VALUES
  (101, 'Intro to TypeScript #1 2025', 'Noa Bar',   'TS basics',        8,  4000, 'Room A', 1, 0, 0, 0, 2025, 'Alice Cohen', 0, 0),
  (201, 'Intro to TypeScript #2 2026', 'Noa Bar',   'TS basics',        8,  4500, 'Room A', 1, 0, 0, 0, 2026, 'Alice Cohen', 0, 0),
  (202, 'Java #1 2026',                'Guy Adar',  'Java fundamentals',6,  3000, 'Room B', 1, 0, 0, 0, 2026, 'Alice Cohen', 0, 0),
  (203, 'JavaScript #1 2026',          'Guy Adar',  'JS fundamentals',  6,  3200, 'Room B', 1, 0, 0, 0, 2026, 'Alice Cohen', 0, 0),
  (204, 'Leadership 101 2026',         'Rina Katz', 'Leading teams',    4,  2000, 'Room C', 1, 1, 0, 1, 2026, 'Alice Cohen', 0, 0),
  (205, 'Cloud Conf 2026',             'External',  'Cloud conference', 12, 6000, 'Expo',   0, 0, 1, 0, 2026, 'Bob Levi',    0, 0),
  (206, 'Future AI #1 2026',           '',          '',                 5,  0,    '',       1, 0, 0, 0, 2026, 'Bob Levi',    1, 10);

INSERT INTO coursetodatetime (CourseID, DateTimeStart, DateTimeEnd) VALUES
  (101, '2025-03-10 09:00:00', '2025-03-10 13:00:00'),
  (101, '2025-03-11 09:00:00', '2025-03-11 13:00:00'),
  (201, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (201, '2026-03-11 09:00:00', '2026-03-11 13:00:00'),
  (202, '2026-05-20 09:00:00', '2026-05-20 15:00:00'),
  (203, '2026-09-15 09:00:00', '2026-09-15 15:00:00'),
  (204, '2026-06-01 13:00:00', '2026-06-01 17:00:00'),
  (205, '2026-11-01 09:00:00', '2026-11-01 21:00:00'),
  (206, '2026-12-01 13:00:00', '2026-12-01 14:00:00');

INSERT INTO coursetouser (CourseID, ID) VALUES
  (101, 3),
  (201, 3), (201, 4),
  (202, 3),
  (203, 4),
  (204, 2), (204, 3), (204, 4),
  (205, 2);

INSERT INTO coursedatetimetouser (CourseID, ID, DateTimeStart, DateTimeEnd) VALUES
  (101, 3, '2025-03-10 09:00:00', '2025-03-10 13:00:00'),
  (101, 3, '2025-03-11 09:00:00', '2025-03-11 13:00:00'),
  (201, 3, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (201, 3, '2026-03-11 09:00:00', '2026-03-11 13:00:00'),
  (201, 4, '2026-03-10 09:00:00', '2026-03-10 13:00:00'),
  (204, 2, '2026-06-01 13:00:00', '2026-06-01 17:00:00');

INSERT INTO users (ID, EducationHours2024, EducationHours2025, EducationHours2026) VALUES
  (1, 0, 0, 0),
  (2, 0, 0, 4),
  (3, 0, 8, 8),
  (4, 0, 0, 4),
  (5, 0, 0, 0),
  (6, 0, 0, 0),
  (7, 0, 0, 0);

INSERT INTO budget (yearlyBudget2024, yearlyBudget2025, yearlyBudget2026) VALUES (90000, 100000, 120000);
INSERT INTO hours (yearlyTargetHours2024, yearlyTargetHours2025, yearlyTargetHours2026) VALUES (40, 40, 40);
