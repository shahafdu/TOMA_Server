# emma.users Table Schema

## Overview
The `emma.users` table stores employee information for the EMMA (Employee Management) system. This documentation is derived from codebase analysis of queries, updates, and data access patterns.

## Table Name
`emma.users`

## Fields

Based on codebase analysis, the following fields are used in the `emma.users` table:

### Primary Fields

| Column | Type | Description |
|--------|------|-------------|
| `ID` | VARCHAR | Employee ID (primary identifier, cannot be null) |
| `sircID` | VARCHAR | SIRC identifier for employee |
| `genNum` | VARCHAR | Generation number (used as alternative identifier) |
| `userName` | VARCHAR | Username/login for the employee |
| `firstName` | VARCHAR | Employee's first name |
| `lastName` | VARCHAR | Employee's last name |
| `fullName` | VARCHAR | Full name (firstName + lastName) |
| `email` | VARCHAR | Primary email address |
| `privateEmail` | VARCHAR | Private email address |

### Employment Details

| Column | Type | Description |
|--------|------|-------------|
| `workTitle` | VARCHAR | Job title/position |
| `category` | VARCHAR | Employee category (e.g., "SIRC", "Contractor") |
| `status` | VARCHAR | Employment status: "working", "left", "deleted" |
| `CL` | VARCHAR | Cost Center Location code |
| `TB` | VARCHAR | [Purpose inferred from field name] |
| `costCenter` | VARCHAR | Cost center code |
| `jobProfileID` | VARCHAR | Job profile identifier |
| `jobFamilyGroup` | VARCHAR | Job family group |
| `jobFamily` | VARCHAR | Job family |
| `timeType` | VARCHAR | Time type classification |
| `baseDateForPromotion` | DATE | Base date for promotion calculations |

### Management/Organization

| Column | Type | Description |
|--------|------|-------------|
| `managerID` | VARCHAR | References ID of the employee's manager |
| `managerSircID` | VARCHAR | References sircID of the employee's manager |
| `teamName` | VARCHAR | Team/department name (often stored with parentheses prefix) |
| `rank` | INT | Employee rank level (1-8): None(1), PM(2), TL(3), Leading Engineer(4), SVP(5), VP(6), Director(7), Tech Lead(8) |
| `isCommon` | INT/TINYINT | Flag for common/shared resources |

### Dates

| Column | Type | Description |
|--------|------|-------------|
| `startDate` | DATETIME | Employment start date |
| `startDate2` | DATETIME | Second start date (used for re-hired employees) |
| `endDate` | DATETIME | Employment end date |
| `endDate2` | DATETIME | Second end date (used for re-hired employees) |
| `birthday` | DATETIME | Employee birthday |
| `statusCahngeDate` | DATETIME | Date of status change |
| `workstationSetup` | DATETIME | Workstation setup date |
| `disabledAccountDate` | DATETIME | Date when account was disabled |

### System/Authentication

| Column | Type | Description |
|--------|------|-------------|
| `AuthorizationID` | INT | Authorization level (1 or higher grants access) |
| `knoxID` | VARCHAR | Knox identifier |

## Related Tables

- `emma.new_user_it` - IT requirements for new employees (linked by ID)
- `emma.users_log` - Audit log of user changes
- `emma.portal_view` - Portal view of employee data
- `emma.covid19` - COVID-19 tracking data (linked by ID)
- `emma.auto_mail_exception_list` - Email exceptions list
- `emma.dept_name_to_code` - Department name to code mapping
- `emma.autoEmmaUsersBeckup` - Backup table for users

## Indexes and Keys

Based on query patterns, the following are likely indexed:
- `ID` (primary lookup key)
- `genNum` (alternative lookup key)
- `userName` (used in authentication)

## Status Values

- `working` - Active employee
- `left` - Former employee
- `deleted` - Deleted/archived employee (ID suffixed with timestamp)

## Notes

1. The table uses MySQL/MariaDB syntax (backticks for column escaping)
2. `teamName` is often stored in format `(TeamName)` in codebase
3. `genNum` leading zeros are stripped in queries
4. Manager can be referenced via `managerID` (ID) or `managerSircID` (sircID)
5. Date fields are normalized to noon timestamp (hour 13) to avoid timezone date drift

## Source Files
- `emma-server.js` - Main API server with queries
- `autoSyncFromWorkDayNewEmp.js` - Workday sync (new employees)
- `updateEmmaWithWorkdayData.js` - Workday sync (updates)
- `org_chart/emma.py` - Python dataclass definition