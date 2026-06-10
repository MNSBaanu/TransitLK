# TransitLK — Test Cases

**Product:** Smart Route Management and Scheduling System (SRMSS)  
**Reference:** [`DOCUMENT.md`](./DOCUMENT.md) (6 main modules), [`REQUIREMENT-M.md`](./REQUIREMENT-M.md), [`Testing.md`](./Testing.md)  
**Test accounts:** See [`Summary.md`](./Summary.md) — default password `password123`

---

## Table conventions

| Column | Description |
|--------|-------------|
| **TC ID** | Unique test case identifier |
| **Test Case** | What is being verified |
| **Role** | User role required to execute the test |
| **Preconditions** | System state before the test |
| **Test Steps** | Actions performed by the tester |
| **Expected Result** | Correct system behaviour |
| **Type** | Black Box (BB) or White Box (WB) |
| **Priority** | High (H), Medium (M), Low (L) |

---

## 1. Login & Authentication

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| AUTH-001 | Valid login — Administrator | Administrator | Server running; account exists | 1. Open `/login` 2. Enter `admin@transitlk.lk` / `password123` 3. Submit | JWT issued; user redirected to Dashboard; sidebar shows permitted modules only | BB | H |
| AUTH-002 | Valid login — Transport Scheduler | Transport Scheduler | Account exists | Login with `scheduler@transitlk.lk` | Redirect to Routes; Schedules and Analytics visible; Dashboard hidden | BB | H |
| AUTH-003 | Valid login — Fleet Manager | Fleet Manager | Account exists | Login with `fleet@transitlk.lk` | Redirect to Fleet & Drivers; Maintenance visible | BB | H |
| AUTH-004 | Valid login — Depot Manager | Depot Manager | Account exists | Login with `depot@transitlk.lk` | Redirect to Dashboard; Schedules (approval) and Analytics visible | BB | H |
| AUTH-005 | Valid login — Driver | Driver | Driver has portal password set | Login with `driver@transitlk.lk` | Redirect to My Trips only | BB | H |
| AUTH-006 | Valid login — Superadministrator | Superadministrator | Account exists | Login with `superadmin@transitlk.lk` | Redirect to Administrator Management | BB | H |
| AUTH-007 | Invalid password | Any | Account exists | Enter valid email with wrong password | `401` / “Invalid email or password”; no token; remain on login page | BB | H |
| AUTH-008 | Missing email or password | Any | None | Submit with empty email or empty password | Validation error; login blocked | BB | H |
| AUTH-009 | Inactive staff account | Transport Scheduler | Staff account `isActive: false` | Login with correct credentials | `403` / account deactivated message; access denied | BB | H |
| AUTH-010 | Driver without portal password | Driver | Driver record has no password | Attempt login | Login rejected until fleet manager sets credentials | BB | M |
| AUTH-011 | Unauthenticated page access | None | Not logged in | Navigate directly to `/schedules` | Redirect to `/login` | BB | H |
| AUTH-012 | JWT attached to API requests | Administrator | Logged in | Call `GET /api/schedules` via UI or Postman with token | `200`; data returned | WB | H |
| AUTH-013 | API call without token | None | No token | `GET /api/schedules` without `Authorization` header | `401 Unauthorized` | WB | H |
| AUTH-014 | Session persistence | Administrator | Valid token in browser | Refresh page or reopen app within token lifetime | User remains signed in | BB | M |
| AUTH-015 | Logout / expired token | Administrator | Token removed or expired | Access protected page or API | Redirect to login; `401` on API | BB | M |

---

## 2. User Management

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| UM-001 | View staff list | Administrator | Logged in as administrator | Open Users page | Searchable list shows name, email, role, depot, active status | BB | H |
| UM-002 | Create staff — Transport Scheduler | Administrator | Valid depot exists | Create user with name, email, password (≥6 chars), role, depot | Account saved; appears in list; user can log in | BB | H |
| UM-003 | Create staff — Fleet Manager | Administrator | Valid depot exists | Create fleet manager account | Account created with correct role and depot link | BB | H |
| UM-004 | Create staff — Depot Manager | Administrator | Valid depot exists | Create depot manager account | Account created; can approve schedules after login | BB | H |
| UM-005 | Reject create without depot | Administrator | None | Submit new user without `depotId` | Save rejected with validation message | BB | H |
| UM-006 | Reject duplicate email | Administrator | Email already registered | Create user with existing email | Save rejected; duplicate email error | BB | H |
| UM-007 | Reject password under 6 characters | Administrator | None | Create user with 5-character password | Validation error | BB | M |
| UM-008 | Update staff details | Administrator | Staff account exists | Change name, role, or depot | Changes saved and reflected in list | BB | H |
| UM-009 | Deactivate staff account | Administrator | Active staff exists | Set `isActive` to false | Account marked inactive; login blocked (AUTH-009) | BB | H |
| UM-010 | Reactivate staff account | Administrator | Inactive staff exists | Set `isActive` to true | User can log in again | BB | M |
| UM-011 | Delete staff account | Administrator | No blocking dependency | Delete staff record | Record removed from list | BB | M |
| UM-012 | Non-administrator access denied | Transport Scheduler | Logged in as scheduler | Open `/users` via URL | Page blocked; API returns `403` | BB | H |
| UM-013 | Search staff by name/email | Administrator | Multiple staff exist | Enter search term | List filters to matching records | BB | L |

---

## 3. Depot Management

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| DEP-001 | View depot list | Superadministrator | Logged in | Open Depots page | All registered depots listed with code, name, region | BB | H |
| DEP-002 | Create depot — valid data | Superadministrator | Unique depot code | Enter code, name, region, location, contacts; save | Depot saved; code stored uppercase | BB | H |
| DEP-003 | Reject missing required fields | Superadministrator | None | Submit without code, name, or region | Validation error; save blocked | BB | H |
| DEP-004 | Reject duplicate depot code | Superadministrator | Depot code already exists | Create depot with same code | Duplicate code rejected | BB | H |
| DEP-005 | Update depot details | Superadministrator | Depot exists | Edit name, region, location, or contacts | Changes persisted | BB | H |
| DEP-006 | Delete depot | Superadministrator | No dependent records blocking delete | Delete depot | Record removed when safe | BB | M |
| DEP-007 | Depot dropdown for staff creation | Administrator | Depots exist | Open Users → create form | Depot dropdown populated from registry | BB | M |
| DEP-008 | Non-superadmin write access denied | Administrator | Logged in as admin | Attempt `POST /api/depots` | `403 Forbidden` | WB | H |
| DEP-009 | Authenticated read depots | Administrator | Logged in | `GET /api/depots` | `200`; depot list returned for dropdowns | BB | M |

---

## 4. Administrator Management

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| ADM-001 | View administrator list | Superadministrator | Logged in | Open Admins page | Platform administrators listed | BB | H |
| ADM-002 | Register new administrator | Superadministrator | Unique email | Enter name, email, password; save | Admin account created in `admins` collection | BB | H |
| ADM-003 | Reject duplicate admin email | Superadministrator | Email in use | Create admin with existing email | Save rejected | BB | H |
| ADM-004 | Update administrator profile | Superadministrator | Admin exists | Edit name or email | Changes saved | BB | M |
| ADM-005 | Delete administrator | Superadministrator | Admin not required | Delete admin account | Record removed | BB | M |
| ADM-006 | Administrator login path | Administrator | Admin account exists | Login via shared login page | Authenticated via `admins` store; depot-scoped access | BB | H |
| ADM-007 | Non-superadmin access denied | Administrator | Logged in as depot admin | Open `/admins` or call `GET /api/admins` | UI and API access denied (`403`) | BB | H |
| ADM-008 | Admin separate from staff accounts | Superadministrator | Both account types exist | Compare admin vs staff login | Each authenticates from correct collection with correct permissions | WB | M |

---

## 5. Route Planning Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| RT-001 | View route catalogue | Transport Scheduler | Routes exist | Open Routes page | Routes listed with name, endpoints, distance, status | BB | H |
| RT-002 | Create route — valid | Transport Scheduler | Active bus and driver available | Enter name, start/end, distance, service type, stops; save as draft | Route saved with status draft | BB | H |
| RT-003 | Activate route | Administrator | Complete route exists | Set status to active | Route available in timetable creation | BB | H |
| RT-004 | Reject save without required fields | Transport Scheduler | None | Omit name, start, end, or distance | Validation error | BB | H |
| RT-005 | Reject duplicate route number (same depot) | Transport Scheduler | Route number exists | Create route with duplicate `routeNo` | Duplicate rejected | BB | M |
| RT-006 | Assign bus without driver | Transport Scheduler | Bus selected | Save with bus only, no driver | Save blocked — complete assignment required | BB | H |
| RT-007 | Assign driver without bus | Transport Scheduler | Driver selected | Save with driver only, no bus | Save blocked | BB | H |
| RT-008 | Reject bus in maintenance | Transport Scheduler | Bus status = maintenance | Assign maintenance bus to route | Warning shown; save blocked | BB | H |
| RT-009 | Reject incompatible service type | Transport Scheduler | Express bus, ordinary route | Assign mismatched bus | Eligibility warning; save blocked | BB | H |
| RT-010 | Reject driver off-duty / on-leave | Transport Scheduler | Driver unavailable | Assign off-duty driver | Save blocked with clear message | BB | H |
| RT-011 | Reject driver outside working hours | Transport Scheduler | Driver shift 08:00–17:00 | Plan trip departure outside window | Assignment rejected | WB | H |
| RT-012 | Add intermediary stops | Transport Scheduler | Route form open | Add multiple stops with coordinates | Stops saved; visible on map | BB | M |
| RT-013 | Map integration — view route | Transport Scheduler | Route has coordinates | Open route on Google Maps | Start, end, and stops plotted | BB | M |
| RT-014 | Search and filter routes | Transport Scheduler | Multiple routes | Filter by status or search by name | List updates correctly | BB | M |
| RT-015 | Set route inactive | Administrator | Route exists | Change status to inactive | Route hidden from new timetable rows | BB | H |
| RT-016 | Block delete with linked schedules | Administrator | Schedules linked to route | Attempt delete | `409` / deletion blocked | BB | H |
| RT-017 | Depot manager read-only access | Depot Manager | Logged in | Open Routes via URL | Access denied — scheduler/admin only | BB | H |

---

## 6. Schedule Management Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| SCH-001 | Daily timetable view | Transport Scheduler | Trips exist for date | Open Schedules → Daily view | Trips for selected date shown per route | BB | H |
| SCH-002 | Weekly timetable view | Transport Scheduler | Trips in week | Switch to Weekly view | 7-day grid with trips per route | BB | H |
| SCH-003 | Monthly timetable view | Transport Scheduler | Trips in month | Switch to Monthly view | Month overview; click day opens daily view | BB | H |
| SCH-004 | Date navigation — previous day | Transport Scheduler | Daily view on 10 Jun | Click previous date | Moves to 9 Jun (one day only) | BB | H |
| SCH-005 | Date navigation — next day | Transport Scheduler | Daily view | Click next date | Moves forward one day | BB | H |
| SCH-006 | Create single trip (draft) | Transport Scheduler | Active route, bus, driver | Set date, times, resources; save draft | Trip saved with status draft | BB | H |
| SCH-007 | Create timetable (bulk) | Transport Scheduler | Active routes selected | Create daily/weekly/monthly timetable | Multiple trips created in one save | BB | H |
| SCH-008 | Reject missing required fields | Transport Scheduler | None | Save trip without route, bus, driver, or times | `400` validation error | BB | H |
| SCH-009 | Reject invalid time range | Transport Scheduler | None | Departure ≥ arrival on same day | Save blocked | WB | H |
| SCH-010 | Reject invalid HH:mm format | Transport Scheduler | None | Enter `25:99` as time | Format validation error | WB | M |
| SCH-011 | Bus conflict detection | Transport Scheduler | Bus already booked overlapping | Assign same bus same day overlapping times | `409` conflict; message names bus and trip | WB | H |
| SCH-012 | Driver conflict detection | Transport Scheduler | Driver already booked | Overlapping driver assignment | `409` conflict with driver detail | WB | H |
| SCH-013 | Route conflict detection | Transport Scheduler | Route double-booked | Overlapping times on same route | `409` route conflict | WB | H |
| SCH-014 | Reject inactive route for trip | Transport Scheduler | Route status inactive | Select inactive route in timetable | Trip save blocked | BB | H |
| SCH-015 | Submit draft for approval | Transport Scheduler | Conflict-free draft | Submit trip | Status → pending; timestamp recorded | BB | H |
| SCH-016 | Block submit with conflicts | Transport Scheduler | Draft has conflicts | Attempt submit | Submit rejected | BB | H |
| SCH-017 | Approve pending trip | Depot Manager | Pending, conflict-free | Approve trip | Status → approved; visible to driver | BB | H |
| SCH-018 | Reject pending trip | Depot Manager | Pending trip | Reject with reason | Status → draft; reason stored | BB | H |
| SCH-019 | Reject approval without reason | Depot Manager | Pending trip | Reject with empty reason | Rejection blocked | BB | H |
| SCH-020 | Adjust live trip — emergency | Depot Manager | Approved trip | Change bus/time with emergency note | Update saved; history entry created | BB | H |
| SCH-021 | Adjust without required note | Depot Manager | Emergency adjustment | Save without notes | Adjustment rejected | BB | H |
| SCH-022 | Trip status transition | Depot Manager | Approved trip | Set status on-time → delayed → completed | Status updates; reflected on dashboard | BB | H |
| SCH-023 | Adjustment history audit trail | Administrator | Trip adjusted | Open trip details | History shows user, time, old/new values | BB | M |
| SCH-024 | Delete draft/pending trip | Transport Scheduler | Draft or pending | Delete trip | Trip removed | BB | M |
| SCH-025 | Block delete approved trip | Transport Scheduler | Approved trip | Attempt delete | Deletion blocked; use adjustment workflow | BB | H |
| SCH-026 | Gantt-style time grid | Transport Scheduler | Multiple trips same day | Open daily Gantt view | Trips positioned by departure/arrival | BB | M |
| SCH-027 | Scheduler cannot approve | Transport Scheduler | Pending trip exists | Attempt approve | Action unavailable / `403` | BB | H |
| SCH-028 | Depot manager cannot create timetable | Depot Manager | Logged in | Attempt create timetable | Action unavailable / `403` | BB | H |

---

## 7. Depot Management Dashboard Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| DASH-001 | Load dashboard summary | Administrator | Operational data exists | Open Dashboard | Summary cards and lists load without error | BB | H |
| DASH-002 | Active routes count | Administrator | Active and draft routes | View route KPI | Count matches active routes in database | BB | H |
| DASH-003 | Bus status breakdown | Administrator | Buses in mixed statuses | View fleet summary | Totals split: available, in-service, maintenance | BB | H |
| DASH-004 | Driver status breakdown | Administrator | Drivers in mixed statuses | View driver summary | Totals split: available, on-leave, off-duty | BB | H |
| DASH-005 | Maintenance highlight | Administrator | Bus in maintenance with log | View dashboard alerts | Maintenance bus highlighted with recent workshop info | BB | M |
| DASH-006 | Recent trips list | Depot Manager | Trips today | View recent trips panel | Shows route, bus reg, driver, time, status | BB | H |
| DASH-007 | Colour-coded trip status | Depot Manager | Trips in varied statuses | View status labels | scheduled, on-time, delayed, completed, cancelled visually distinct | BB | M |
| DASH-008 | Trip completion KPI | Administrator | Completed and total trips | View completion rate card | Percentage calculated correctly | BB | H |
| DASH-009 | Auto-refresh during session | Depot Manager | Dashboard open | Wait for refresh interval | Counts update without manual reload | BB | M |
| DASH-010 | Scheduler access denied | Transport Scheduler | Logged in | Open `/dashboard` | Access blocked | BB | H |
| DASH-011 | Dashboard API integration | Administrator | Server running | `GET /api/dashboard` with token | `200`; JSON summary returned | WB | M |

---

## 8. Fuel and Maintenance Log Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| FM-001 | View fuel logs list | Fleet Manager | Fuel records exist | Open Maintenance → Fuel tab | Fuel entries listed separately from maintenance | BB | H |
| FM-002 | Create fuel log — valid | Fleet Manager | Bus exists | Enter bus, date, litres, cost; save | Entry saved and appears in list | BB | H |
| FM-003 | Reject fuel log missing fields | Fleet Manager | None | Omit bus, date, litres, or cost | Validation error | BB | H |
| FM-004 | Edit fuel log | Fleet Manager | Fuel entry exists | Update litres or cost | Changes saved | BB | M |
| FM-005 | Delete fuel log | Fleet Manager | Entry exists | Delete record | Entry removed | BB | M |
| FM-006 | View maintenance logs list | Fleet Manager | Maintenance records exist | Open Maintenance → Maintenance tab | Workshop jobs listed separately | BB | H |
| FM-007 | Create maintenance log — valid | Fleet Manager | Bus exists | Enter bus, service date, description, cost | Entry saved | BB | H |
| FM-008 | Reject maintenance missing fields | Fleet Manager | None | Omit required field | Save blocked | BB | H |
| FM-009 | Edit maintenance log | Fleet Manager | Entry exists | Update description or cost | Changes saved | BB | M |
| FM-010 | Delete maintenance log | Fleet Manager | Entry exists | Delete entry | Record removed | BB | M |
| FM-011 | Bus to maintenance blocks scheduling | Fleet Manager | Bus available | Set bus status to maintenance from Fleet | Bus not selectable in new timetable trips | BB | H |
| FM-012 | Fuel/maintenance report for period | Fleet Manager | Logs in date range | Generate report `from`–`to` | Summary totals returned | BB | M |
| FM-013 | Export maintenance report CSV | Fleet Manager | Data in range | Download CSV | File downloads with correct columns | BB | M |
| FM-014 | Scheduler access denied | Transport Scheduler | Logged in | Open Maintenance module | Access blocked | BB | H |

---

## 9. Driver and Vehicle Management Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| FLEET-001 | View bus fleet list | Fleet Manager | Buses registered | Open Fleet & Drivers → Buses | Registration, capacity, mileage, status shown | BB | H |
| FLEET-002 | Register bus — valid | Fleet Manager | Unique reg number | Enter reg, capacity ≥1, mileage, service type, depot | Bus saved with status available | BB | H |
| FLEET-003 | Reject bus missing reg or capacity | Fleet Manager | None | Omit reg number or capacity | Validation error | BB | H |
| FLEET-004 | Reject duplicate registration number | Fleet Manager | Reg exists | Create bus with same reg | Duplicate rejected | BB | H |
| FLEET-005 | Reject capacity less than 1 | Fleet Manager | None | Enter capacity 0 | Validation error | BB | M |
| FLEET-006 | Update bus status | Fleet Manager | Bus exists | Change available → in-service → maintenance | Status updated; scheduling rules follow status | BB | H |
| FLEET-007 | Delete bus (no dependencies) | Fleet Manager | No active schedules | Delete bus | Bus removed | BB | M |
| FLEET-008 | View bus maintenance history | Fleet Manager | Maintenance logs linked | Open bus profile | Linked workshop history visible | BB | M |
| FLEET-009 | View driver list | Fleet Manager | Drivers registered | Open Fleet & Drivers → Drivers | Name, licence, status, working hours shown | BB | H |
| FLEET-010 | Register driver — valid | Fleet Manager | Unique licence | Enter name, licence, contact, hours, depot | Driver saved as available | BB | H |
| FLEET-011 | Reject driver missing name/licence | Fleet Manager | None | Omit name or licence | Validation error | BB | H |
| FLEET-012 | Reject duplicate licence number | Fleet Manager | Licence exists | Create driver with same licence | Duplicate rejected | BB | H |
| FLEET-013 | Set driver on-leave / off-duty | Fleet Manager | Driver available | Change status | Driver excluded from new trip assignment | BB | H |
| FLEET-014 | Configure driver portal login | Fleet Manager | Driver exists | Set unique email and password (≥6 chars) | Driver can log in to My Trips | BB | H |
| FLEET-015 | Reject duplicate driver email | Fleet Manager | Email in use | Set email already used | Save rejected | BB | M |
| FLEET-016 | Delete driver with active schedules | Fleet Manager | Driver on approved trips | Attempt delete | Deletion restricted or blocked | BB | M |
| FLEET-017 | Service type filter in assignment | Transport Scheduler | Mixed fleet | Assign bus to express route | Only compatible buses offered | BB | M |

---

## 10. Reporting and Analytics Module

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| RPT-001 | Weekly analytics view | Administrator | Trip data in week | Open Analytics → Weekly period | KPIs and charts load for week | BB | H |
| RPT-002 | Monthly analytics view | Depot Manager | Trip data in month | Select Monthly period | Correct month range applied | BB | H |
| RPT-003 | Custom date range | Transport Scheduler | Data in range | Set custom from/to dates | Analytics scoped to selected range | BB | H |
| RPT-004 | Reject custom range missing dates | Administrator | None | Select custom without end date | Validation error | BB | M |
| RPT-005 | Trip completion rate KPI | Administrator | Mixed trip statuses | View completion card | Rate = completed / total × 100 | BB | H |
| RPT-006 | Route performance table | Depot Manager | Delays/cancellations exist | View route performance section | At-risk routes and metrics shown | BB | M |
| RPT-007 | Fuel consumption trends | Administrator | Fuel logs exist | View fuel trend chart | Per-vehicle and fleet trends displayed | BB | M |
| RPT-008 | Maintenance spend summary | Administrator | Maintenance logs exist | View maintenance KPI | Total cost aggregated for period | BB | M |
| RPT-009 | Export PDF report | Depot Manager | Period selected | Download PDF | PDF includes period, KPIs, route table, fuel summary | BB | H |
| RPT-010 | Export CSV data | Administrator | Period selected | Download CSV | CSV file with trip/operational rows | BB | H |
| RPT-011 | Superadmin network-wide view | Superadministrator | Multiple depots | Open Analytics | Aggregated cross-depot data | BB | M |
| RPT-012 | Depot-scoped analytics | Depot Manager | Logged in | View analytics | Data limited to own depot | BB | H |
| RPT-013 | Fleet manager access denied | Fleet Manager | Logged in | Open `/reports` | Access blocked | BB | H |
| RPT-014 | Analytics API | Administrator | Token valid | `GET /api/reports/dashboard?period=weekly&from=...&to=...` | `200`; JSON analytics payload | WB | M |

---

## 11. My Trips (Driver Portal)

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| MYT-001 | View assigned trips only | Driver | Approved trips for driver | Open My Trips | Only own `driverId` trips listed | BB | H |
| MYT-002 | Trip details displayed | Driver | Trip approved | View trip card | Route, date, times, bus reg, status shown | BB | H |
| MYT-003 | Draft trips hidden | Driver | Draft trip assigned to driver | Open My Trips | Draft trip not visible | BB | H |
| MYT-004 | Pending trips hidden | Driver | Pending trip assigned | Open My Trips | Pending trip not visible | BB | H |
| MYT-005 | Approved trip visible | Driver | Trip approved | Open My Trips | Trip appears with correct details | BB | H |
| MYT-006 | Read-only — no edit controls | Driver | Trip listed | Inspect page | No create/edit/delete/approve buttons | BB | H |
| MYT-007 | Mobile-friendly layout | Driver | Trip exists | Open on phone-sized viewport | Content readable without horizontal scroll | BB | M |
| MYT-008 | Driver API scoping | Driver | Token for driver A | `GET /api/schedules` | Only driver A trips returned | WB | H |
| MYT-009 | Other driver trips not exposed | Driver | Trips for driver B exist | View list as driver A | Driver B trips never shown | BB | H |

---

## 12. System-Wide Access Control (Cross-Module)

| TC ID | Test Case | Role | Preconditions | Test Steps | Expected Result | Type | Priority |
|-------|-----------|------|---------------|------------|-----------------|------|----------|
| RBAC-001 | Sidebar shows permitted modules only | Each role | Logged in | Compare sidebar per role | Only role-allowed links visible | BB | H |
| RBAC-002 | Direct URL blocked in browser | Transport Scheduler | Logged in | Navigate to `/users` | Redirect or access denied page | BB | H |
| RBAC-003 | API role enforcement | Fleet Manager | Token valid | `POST /api/schedules` | `403 Forbidden` | WB | H |
| RBAC-004 | Post-login landing page | Each role | Fresh login | Observe redirect | Matches role home path per requirements | BB | M |
| RBAC-005 | Deactivated route retained in DB | Administrator | Inactive route | Query database / reports | Historical data preserved for audit | WB | L |

---

## 13. Test case summary

| Module | Test cases | High priority |
|--------|:----------:|:-------------:|
| Login & Authentication | 15 | 10 |
| User Management | 13 | 8 |
| Depot Management | 9 | 6 |
| Administrator Management | 8 | 5 |
| Route Planning | 17 | 11 |
| Schedule Management | 28 | 20 |
| Depot Dashboard | 11 | 7 |
| Fuel & Maintenance Log | 14 | 8 |
| Driver & Vehicle Management | 17 | 11 |
| Reporting & Analytics | 14 | 8 |
| My Trips (Driver) | 9 | 8 |
| Cross-module RBAC | 5 | 3 |
| **Total** | **160** | **105** |

---

## 14. API testing (Postman)

Integration tests for the above modules can be executed using the Postman collection:

**File:** [`../Testing/TransitLK.postman_collection.json`](../Testing/TransitLK.postman_collection.json)

| Postman folder | Maps to module |
|----------------|----------------|
| Health | Server smoke test |
| Auth | §1 Login & Authentication |
| Routes | §5 Route Planning |
| Schedules | §6 Schedule Management |
| Buses / Drivers | §9 Driver & Vehicle Management |
| Dashboard | §7 Depot Dashboard |
| Maintenance / Fuel | §8 Fuel & Maintenance |
| Reports | §10 Reporting & Analytics |
| Depots | §3 Depot Management |
| Admins | §4 Administrator Management |
| Users | §2 User Management |

**Recommended order:** Health → Login → module-specific GET requests → create/update flows with valid IDs.

---

*End of document*
