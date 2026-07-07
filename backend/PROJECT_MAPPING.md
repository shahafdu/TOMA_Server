# COMA Server - Project Mapping Report

## Overview
**Name:** COMA Server (Course Management Application)  
**Purpose:** Backend server for employee training program management - used by HR and managers  
**Author:** REDACTED  
**Version:** 1.0.0  

---

## Architecture

### Technology Stack
- **Runtime:** Node.js (v20)
- **Framework:** Express.js
- **Database:** MySQL/MariaDB
- **Deployment:** Docker with PM2 clustering (2 instances)
- **CI/CD:** GitLab CI

### Application Entry Point
- `coma-server.js` - Main Express application server
- Listens on port 3000 (configurable via `PORT` env var, defaults to 3008 on host)

### Core Modules
| File | Purpose |
|------|---------|
| `coma-server.js` | Main API server with all REST endpoints |
| `connect-server.js` | Database connection pool configuration |
| `common.js` | Shared utility functions (user/course removal, SQL string escaping) |
| `coma-mailer.js` | Email/SMTP and iCal invitation handling |
| `coma-config.js` | Configuration constants |
| `course-review.js` | Daily cron: Sends course feedback requests |
| `mail-notification.js` | Monthly cron: Notifies managers about upcoming courses |
| `updateManagersCoursesEmp.js` | Monthly cron: Updates manager course statistics |

---

## Database Structure

### Databases
- **`emma`** - Primary employee/user database
- **`coma`** - COMA application database

### COMA Tables

**`users`** - User education tracking
- `ID` - User identifier (references emma.users.sircID)
- `EducationHours{year}` - Dynamic year columns for tracking education hours

**`courses`** - Course catalog
- `CourseID` - Primary key
- `CourseName` - Name + year (e.g., "Course Name 2024")
- `Lecturer`, `Syllabus`, `TotalHours`, `Price`, `Notes`, `TextForMail`
- `Location`, `IsIn`, `IsMandatory`, `IsConference`, `CourseType`
- `Year`, `Creator`, `isTentative`, `participantsAmountEstimated`

**`coursetouser`** - Course participants mapping
- `CourseID` - Foreign key to courses
- `ID` - User identifier

**`coursetodatetime`** - Course schedule slots
- `CourseID` - Foreign key to courses
- `DateTimeStart`, `DateTimeEnd` - Session timestamps

**`coursedatetimetouser`** - Attendance records
- `CourseID`, `ID` - Foreign keys
- `DateTimeStart`, `DateTimeEnd` - Session timestamps

**`budget`** - Yearly budget tracking
- `yearlyBudget{year}` - Dynamic year columns

**`hours`** - Yearly target hours
- `yearlyTargetHours{year}` - Dynamic year columns

**`houersPerMonthPerManager`** - Manager statistics (typo in table name)
- `ID` - Manager identifier
- `recoredDate` - Record date
- `empCount`, `predictHours`, `preciseHours`

### EMMA Tables (External)

**`users`** - Employee master data
- `sircID` - User identifier
- `firstName`, `lastName`, `email`, `imageUrl`, `userName`
- `category`, `status`, `startDate`, `endDate`, `endDate2`
- `managerSircID` - Manager's user ID
- `authorizationIdCOMA` - Permission level (must be >1 for COMA access)

---

## Stored Procedures (COMA)

| Procedure | Parameters | Purpose |
|-----------|------------|---------|
| `spr_getAllemployeesCoursesWithHouersByManagerID` | `managerID`, `targetYear` | Get direct employees' courses with hours |
| `spr_getSumEmpPerMonth` | `year` | Monthly employee statistics |
| `spr_getPrecisetHoursPerMonthByManagerUsingOldData` | `ID`, `year` | Precise hours per month for manager |
| `spr_getPredictHoursPerMonthByManagerUsingOldData` | `ID`, `year` | Predicted hours per month for manager |
| `spr_getAmountEmployees` | `ID` | Count employees for manager |
| `spr_monthlyUpdateHoursPerMonthPerManager` | None | Monthly manager course stats update |

---

## API Endpoints

### User Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getUserDetails/:ID/:year` | GET | Get user details with education hours |
| `/getUserByUserNameDetails/:userName/:year` | GET | Get user by username |
| `/getAllUsers/:year` | GET | Get all working employees |
| `/getManagerDirectEmployees/:managerID/:year` | GET | Get manager's direct reports |

### Course Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getAllCoursesData/:year` | GET | List all courses with schedule/participants |
| `/getAllCoursesName/:year` | GET | List course names only |
| `/getCourse/:courseName/:year` | GET | Get course details by name |
| `/getCourseParticipants/:CourseName/:year` | GET | Get participants for a course |
| `/getCourseAttendance/:courseName/:year` | GET | Get attendance records |
| `/getCourseAttendanceDetailes/:courseName/:year` | GET | Detailed attendance with user info |
| `/searchCourses/:searchTerm/:year` | GET | Search courses by name |
| `/getCourseExists/:courseName/:startYear/:year` | GET | Check if course exists |

### User-Course Operations
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/addUserToCourse/:ID/:year` | POST | Enroll user in course |
| `/removeUserFromCourse/:ID/:year` | POST | Remove user from course |
| `/setUserAttended/:ID/:courseName/:dateTimeStart/:dateTimeEnd/:year` | POST | Mark user as attended |
| `/removeUserAttended/:ID/:courseName/:dateTimeStart/:dateTimeEnd/:year` | POST | Remove attendance record |
| `/getDidUserAttendCourse/:ID/:courseName/:year` | GET | Check attendance status |
| `/getAllUserCourses/:ID/:year` | GET | Get user's enrolled courses |

### Course Creation/Modification
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/addCourse/:exists/:startYear/:origYear/:currYear` | POST | Add/update regular course |
| `/addTentativeCourse/:exists/:startYear/:origYear/:currYear` | POST | Add/update tentative course |
| `/removeCourse/:year` | POST | Delete course and related records |

### Budget & Hours
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getYearlyBudget/:year` | GET | Get yearly budget |
| `/getYearlyTargetHours/:year` | GET | Get yearly target hours |
| `/updateYearlyBudget/:year` | POST | Update yearly budget |
| `/updateYearlyTargetHours/:year` | POST | Update yearly target hours |

### Reporting & Analytics
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/getSumEmpPerMonth/:year` | GET | Monthly employee count |
| `/getSumEmpPerMonthPerManager/:ID/:year` | GET | Monthly stats per manager |
| `/getHoursPrecise/:year` | GET | Actual hours completed |
| `/getHoursTentative/:year` | GET | Tentative hours |
| `/getHoursPredicted/:year` | GET | Predicted hours |
| `/getEmployeesCourses/:managerID/:targetYear/:year` | GET | Employees' courses with hours |

### Email
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/authorizeUser` | POST | LDAP authentication + COMA permission check |
| `/sendInvites/:year` | POST | Send course invites with iCal attachments |
| `/sendMail` | POST | Generic email sending |

---

## Scheduled Jobs (Jenkins)

| Job | Schedule | Description |
|-----|----------|-------------|
| `emailNotificationsForManager` | Monthly | Notify managers 30 days before course start |
| `emailForCourseReview` | Daily | Request feedback from participants (day after course ends) |
| `autoDumpComa` | Monthly | Database backup dump |

---

## External Integrations

### LDAP Authentication
- **Server:** `ldap://legacysite.com`
- **Domain:** `@legacysite.com`
- **Encryption:** AES (key: `SWI`) - passwords encrypted client-side before transmission

### SMTP Server
- **Host:** REDACTED
- **Port:** 25
- **Security:** No authentication required
- **Features:** iCal (.ics) invitation attachments |

---

## Sensitive Information ⚠️

### Credentials (`.env`)
```
MARIADB_HOST=REDACTED
MARIADB_DATABASE=coma
MARIADB_PORT=REDACTED
MARIADB_USER=REDACTED
MARIADB_PASSWORD=REDACTED
```

### Configuration Sensitive Data (`coma-config.js`)
- **Exceptions list:** REDACTED (email exclusion list)
- **HR contact:** REDACTED

### Exposed LDAP Details
- LDAP server URL: `ldap://legacysite.com`
- Domain suffix: `@legacysite.com`
- Encryption key: `REDACTED` (hardcoded in source)

---

## Docker Registry
- **Registry:** `gitlab-srv.legacysite.com:4567/swi/coma_server:backend`
- **Base Image:** `node:20-bullseye-slim`
- **Network Proxy:** `webproxy.legacysite.com:8080`

---

## CI/CD Details
- **GitLab Runner:** SIRC LSF queue
- **Docker Host:** REDACTED
- **Build:** Manual deployment trigger