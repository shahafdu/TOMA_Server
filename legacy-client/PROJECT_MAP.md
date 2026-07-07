# COMA Client - Project Map

## Overview
**COMA (Course Management System)** - An Angular 6 application for managing employee education/training courses.

- **Domain:** https://app.example.com
- **Backend:** https://api.example.com
- **Deployment:** Docker container on port 8080 (production) / 4200 (dev)

---

## Architecture

### Technology Stack
| Layer | Technology |
|-------|------------|
| Frontend | Angular 6.1, TypeScript 2.9, RxJS 6.2 |
| UI Framework | Angular Material, ng-bootstrap |
| Charts | ng2-charts (Chart.js) |
| Build | Angular CLI 6.2.3, Docker multi-stage |
| CI/CD | GitLab CI, Jenkins |
| Testing | Karma, Jasmine, Protractor |

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────┐
│                 docker-host                             │
│  ┌──────────────────────┐  ┌───────────────────────┐    │
│  │   Frontend:8080      │  │   Backend:8080        │    │
│  │   (COMA_Client)      │  │   (backend)           │    │
│  └──────────────────────┘  └───────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Features & Modules

### Core Features
1. **Authentication** - User login with AES encryption
2. **Course Management** - Create, edit, delete courses with scheduling
3. **Employee Management** - View employees, track education hours
4. **Budget Tracking** - Yearly budgets and cost visualization
5. **Hours Reporting** - Monthly/quarterly education hours tracking
6. **Conferences** - Dedicated conference course management
7. **Attendance Tracking** - Mark user attendance per course session
8. **Excel Export** - Export lists to XLSX format

### Routes (Main Navigation)
| Route | Component | Access |
|-------|-----------|--------|
| `/log_in` | LoginFormComponent | Public |
| `/main` | MainComponent | Authenticated |
| `/courses` | CourseListComponent | Authenticated |
| `/courses/:name` | CourseDetailComponent | Authenticated |
| `/edit` | CourseEditComponent | Authenticated |
| `/edit/:name` | CourseEditComponent | Authenticated |
| `/confs` | ConfListComponent | Authenticated |
| `/employees` | EmpListComponent | Authenticated |
| `/employees/:ID` | EmpDetailComponent | Manager/PM role |
| `/budget` | BudgetComponent | Authenticated |
| `/hours` | HoursComponent | Authenticated |
| `/about` | AboutComponent | Authenticated |

### Authorization Levels (`Constants.authorizationLevel2Num`)
| Level  | Value | Description                    |
|--------|-------|--------------------------------|
| `None` | 1     | No access                      |
| `All`  | 2     | Full access (Admin)            |
| `PM`   | 3     | Project Manager - limited view |

---

## Data Models

### User (`IUser`)
```typescript
{
  ID: number              // User ID from backend
  fullName: string        // firstName + ' ' + lastName
  managerID: number
  managerFullName: string
  authorizationId: number // 1=None, 2=All, 3=PM
  email: string
  hours: number           // EducationHours - yearly total
  imageUrl: string        // Avatars from /assets/avatars/
  category: string        // Excludes 'student'/'contractor' from active list
  status: string          // 'working' or other status
  startDate: Date
  endDate: Date
  allCourses: string[]    // All time course names with year suffix
  yearCourses: string[]   // Current year course names
}
```

### Course (`ICourse`)
```typescript
{
  name: string
  lecturer: string
  schedule: CourseDate[]  // Array of session dates
  syllabus: string
  notes: string
  textForMail: string
  totalHours: number
  participants: IUser[]
  price: number
  venue: string
  isIn: boolean           // Internal course
  isMandatory: boolean
  courseType: number
  isConference: boolean
  isAttended: boolean     // Has attendance records
  year: number
  yearInName: number
  creator: string
  isTentative: boolean    // Planned course, not yet scheduled
  participantsAmountEstimated: number
  participantsAmount: number
}
```

---

## Services

| Service | Responsibility |
|---------|----------------|
| `AuthService` | User authentication, session management |
| `EmployeeService` | Employee CRUD, hours tracking, org hierarchy |
| `CourseService` | Course CRUD, scheduling, attendance |
| `NotificationService` | Toast notifications |
| `ConfirmationDialogService` | Modal confirmations |
| `AppConfigService` | Load app-config.json |
| `VersionCheckService` | Client version checking |

### Backend API Endpoints (from services)
- `authorizeUser` - Login
- `getAllUsers` - Employee list
- `getUserDetails/:ID` - Employee details
- `getUserByUserNameDetails/:userName` - Employee by username
- `getManagerDirectEmployees/:ID` - Direct reports
- `getAllUserCourses/:ID` - User's courses
- `getEmployeesCourses/:ID/:year` - Excel export data
- `getAllCoursesData` - All courses
- `getAllCoursesWithAttended` - Course attendance flags
- `getAllCoursesName` - Course name list
- `getCourse/:name` - Single course
- `searchCourses/:term` - Search
- `getCourseExists/:name/:year` - Check duplicate
- `getCourseAttendanceDetailes/:name` - Attendance details
- `getCourseAttendancedList/:name` - Attendance list
- `addCourse/:exists/:startYear/:origYear` - Create/update
- `addUserToCourse/:ID` - Add participant
- `removeUserFromCourse/:ID` - Remove participant
- `setUserAttended/:...` - Mark attendance
- `removeUserAttended/:...` - Unmark attendance
- `addTentativeCourse` - Create tentative
- `removeCourse` - Delete
- `sendInvites` - Send course invitations
- `getYearlyBudget` / `updateYearlyBudget` - Budget management
- `getYearlyTargetHours` / `updateYearlyTargetHours` - Hours target
- `getHoursPrecise`, `getHoursPredicted`, `getHoursTentative` - Monthly analytics
- `getSumEmpPerMonth`, `getSumEmpPerMonthPerManager` - Employee counts
- `getPredictOldYearDataPerMonth`, `getPreciseOldYearDataPerMonth` - Historical data
- `getAmountEmployees/:ID` - Employee count for manager

---

## Security Considerations

### ⚠️ Configuration Notes

1. **Encryption Key:** Use environment variable `ENCRYPTION_KEY` instead of hardcoded value
   - Location: `src/app/services/auth.service.ts`

2. **Production Server URLs:** Configure via environment variables
   - Frontend: Set `COMA_BACKEND_HOST` in `.env`
   - Avatars: Use local `/assets/avatars/` directory

3. **Docker Registry:** Configure `REGISTRY_CREDENTIALS` in CI/CD environment

4. **Proxy Configuration:** Configure via build args for your environment

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/urls.ts` | Backend endpoints configuration |
| `src/app/services/*.ts` | API communication layer |
| `src/app/models/*.ts` | Type definitions |
| `src/assets/app-config.json` | Application configuration |
| `src/app/common/constants.ts` | Regex patterns, authorization levels |
| `src/app/auth.guard.ts` | Route authentication |
| `src/app/auth-mngr.guard.ts` | Manager-level access control |
| `src/app/pending-changes.guard.ts` | Prevent unsaved navigation |

---

## Infrastructure

### Docker Configuration
- **Builder:** `node:20-bullseye-slim`
- **Production:** `httpd` (Apache)
- **Port Mapping:** 8080 (prod) / 3008 (dev container)

### CI/CD Pipeline
```
GitLab CI → docker runner
  ├── Build stage: docker-compose build
  └── Deploy stage: docker-compose up -d (manual trigger)
```

---

## External Dependencies

### Avatar Server
- **URL:** `/assets/avatars/{userName}.jpg` (local path)
- Used for employee profile images in `EmployeeService.getUserImageFullPath()`

### Export Functionality
- Uses `xlsx` library for Excel exports
- Generates reports for: employee courses, course attendance lists