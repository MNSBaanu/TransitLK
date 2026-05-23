# SRMSS — Module-Based Requirements (REQUIREMENT-M)

## Cross-cutting (MOD-XCUT)

| ID | Requirement |
|----|-------------|
| MOD-XCUT-01 | The system shall authenticate users via email and password and issue a JWT valid for a bounded session (e.g. 7 days). |
| MOD-XCUT-02 | Every protected API route and client page shall enforce role-based access so users cannot open modules outside their role. |
| MOD-XCUT-03 | The client shall redirect unauthenticated users to `/login` and return authenticated users to a role-specific home path after login. |
| MOD-XCUT-04 | Deactivated staff accounts (`isActive: false`) shall be blocked at login with a clear message. |
| MOD-XCUT-05 | The workspace shall use consistent module layout (header, tables, modals) and transport-domain terminology. |
| MOD-XCUT-06 | Operational changes that affect schedules (bus/driver reassignment) shall be traceable via adjustment history on schedule records. |
| MOD-XCUT-07 | The system shall support in-app notifications/messages for depot alerts (conflicts, delays). |
| MOD-XCUT-08 | An audit trail shall record permission changes, schedule approvals, and critical overrides with user identity and timestamp. |
| MOD-XCUT-09 | All date/time displays shall use depot-local conventions; API shall store trip dates in unambiguous form (ISO date). |
| MOD-XCUT-10 | Sensitive configuration (JWT secret, Mongo URI, map API keys) shall not be committed to source control. |

## Authentication (MOD-AUTH)

| ID | Requirement |
|----|-------------|
| MOD-AUTH-01 | The login module shall accept email and password and resolve accounts from admins, users (staff), then drivers collections. |
| MOD-AUTH-02 | On successful login, the module shall return user profile fields (name, email, role, depot link, driver id if applicable) and a JWT. |
| MOD-AUTH-03 | The module shall expose `GET /api/auth/me` for session refresh and profile display in the shell UI. |
| MOD-AUTH-04 | Staff self-registration via `POST /api/auth/register` shall be restricted to administrators only. |
| MOD-AUTH-05 | Login failures shall not reveal whether the email exists (generic “invalid email or password”). |
| MOD-AUTH-06 | Passwords shall be stored hashed (bcrypt) with minimum length policy (≥ 6 characters). |
| MOD-AUTH-07 | The module shall support password reset / account recovery via email or admin reset. |
| MOD-AUTH-08 | Optional multi-factor authentication for administrator accounts in production deployments. |

## Depot dashboard (MOD-DSH)

| ID | Requirement |
|----|-------------|
| MOD-DSH-01 | The dashboard shall summarise active routes, fleet availability, driver availability, and today’s trips for the depot. |
| MOD-DSH-02 | Trip rows shall show operational status: scheduled, on-time, delayed, completed, cancelled. |
| MOD-DSH-03 | The dashboard shall surface maintenance alerts (vehicles under maintenance or overdue service). |
| MOD-DSH-04 | The dashboard shall show fuel summary indicators (recent consumption trend or anomaly flags). |
| MOD-DSH-05 | Summary statistics shall include trip completion rate and vehicle utilisation for the selected period. |
| MOD-DSH-06 | Data shall auto-refresh periodically (e.g. every 30 seconds) without full page reload. |
| MOD-DSH-07 | Depot managers shall see only data for their assigned depot when multi-depot mode is enabled. |
| MOD-DSH-08 | Administrators shall access a system-wide dashboard aggregating all depots. |
| MOD-DSH-09 | The dashboard API shall be served from a stable endpoint (`GET /api/reports/dashboard` or dedicated `/api/dashboard`). |

## Route planning (MOD-RTE)

| ID | Requirement |
|----|-------------|
| MOD-RTE-01 | Users shall create routes with route name, start point, end point, distance (km), and ordered intermediary stops. |
| MOD-RTE-02 | Routes shall support geocoded locations (lat/lng, address) for start, end, and stop points for map display. |
| MOD-RTE-03 | The module shall integrate Google Maps (or equivalent) in the browser for route visualisation and point selection. |
| MOD-RTE-04 | Users shall edit existing routes when not blocked by active published schedules. |
| MOD-RTE-05 | Users shall delete or archive routes; historical schedules referencing the route must remain readable. |
| MOD-RTE-06 | Each route shall record service type (e.g. ordinary, semi-luxury, luxury) where applicable for assignment rules. |
| MOD-RTE-07 | The route list shall support search/filter by name, endpoints, or service type. |
| MOD-RTE-08 | From the route module, authorised users shall assign default bus and driver to a route where business rules allow. |
| MOD-RTE-09 | Route records shall optionally link to a depotId when multi-depot scoping is enabled. |
| MOD-RTE-10 | Import routes from spreadsheet with validation (duplicate names, missing distance). |

## Schedule management (MOD-SCH)

| ID | Requirement |
|----|-------------|
| MOD-SCH-01 | Users shall create schedules with route, trip date, departure/arrival times, bus, and driver. |
| MOD-SCH-02 | The module shall support daily trip planning; weekly/monthly timetable templates are desirable. |
| MOD-SCH-03 | On save, the system shall detect conflicts: same bus overlapping, same driver overlapping, invalid working hours. |
| MOD-SCH-04 | Conflict results shall list actionable reasons so the scheduler can correct assignments. |
| MOD-SCH-05 | Schedules shall follow a lifecycle: draft → pending → approved → scheduled → on-time / delayed / completed / cancelled. |
| MOD-SCH-06 | Schedulers shall submit draft schedules for approval. |
| MOD-SCH-07 | Depot managers (or admins) shall approve pending schedules only when conflict-free. |
| MOD-SCH-08 | Depot managers shall reject pending schedules with a mandatory reason; record remains for audit. |
| MOD-SCH-09 | Authorised users shall edit schedules before trip start subject to re-validation. |
| MOD-SCH-10 | Users shall cancel trips with reason; cancelled trips remain visible in history. |
| MOD-SCH-11 | Reassignment of bus or driver on an existing schedule shall re-run conflict checks and append adjustment history. |
| MOD-SCH-12 | Emergency override by depot manager shall require justification and preserve original assignment in history. |
| MOD-SCH-13 | Assignment shall be blocked if bus status is maintenance or driver is unavailable / off-duty. |
| MOD-SCH-14 | Assignment shall be blocked if driver license expiry date is in the past. |
| MOD-SCH-15 | Published/approved schedule changes shall trigger notifications to affected drivers. |
| MOD-SCH-16 | Bulk timetable conflict check across a date range. |
| MOD-SCH-17 | Schedule list shall support date-range filter and search. |

## Fleet & drivers (MOD-FLT)

| ID | Requirement |
|----|-------------|
| MOD-FLT-01 | The module shall provide a Fleet Inventory tab to register buses: registration number, capacity, mileage, depot, service type, status. |
| MOD-FLT-02 | Bus registration numbers shall be unique within the system. |
| MOD-FLT-03 | Users shall update bus details and set status: available, in-service, maintenance. |
| MOD-FLT-04 | The module shall provide a Driver Personnel tab for driver name, license number, contact, working hours, status. |
| MOD-FLT-05 | Driver license numbers shall be unique. |
| MOD-FLT-06 | Users shall create and edit driver records and optional login credentials (email/password) for the driver portal. |
| MOD-FLT-07 | Driver status shall include available, on-leave, off-duty and affect schedule assignment. |
| MOD-FLT-08 | Vehicles and drivers shall support optional depotId assignment. |
| MOD-FLT-09 | The module shall display fleet health summaries (counts by status). |
| MOD-FLT-10 | License validity/expiry date shall be stored and surfaced before assignment. |
| MOD-FLT-11 | Vehicles failing compliance (expired inspection, open critical maintenance) shall be blocked from schedule assignment. |
| MOD-FLT-12 | Paginated lists and modal forms for add/edit with validation errors shown inline. |
| MOD-FLT-13 | Legacy `/drivers` URL shall redirect to Fleet & Drivers unified page. |

## Users & access (MOD-USR)

| ID | Requirement |
|----|-------------|
| MOD-USR-01 | Only administrators shall access the Users module. |
| MOD-USR-02 | The module shall list workspace accounts: administrators and staff (scheduler, fleet manager, depot manager). |
| MOD-USR-03 | Administrators shall create staff users with name, email, password, role, optional depot. |
| MOD-USR-04 | Administrators shall edit staff details, role, depot, and active flag; optional password reset on save. |
| MOD-USR-05 | Administrators shall deactivate staff to revoke login without deleting history. |
| MOD-USR-06 | Administrators shall remove staff accounts when appropriate. |
| MOD-USR-07 | The UI shall display system access modules per role. |
| MOD-USR-08 | Permission model is role-based (fixed role → module set). |
| MOD-USR-09 | Administrator accounts shall be view-only in this module. |
| MOD-USR-10 | Email addresses shall be unique across admins, staff, and drivers. |
| MOD-USR-11 | The module shall not create or list driver operational accounts (drivers are managed under Fleet & Drivers). |
| MOD-USR-12 | Administrators shall be able to create additional administrator accounts. |
| MOD-USR-13 | Audit log of role/permission changes. |

## Maintenance & fuel (MOD-MNT)

| ID | Requirement |
|----|-------------|
| MOD-MNT-01 | Users shall log maintenance events per bus: date, description/service type, cost. |
| MOD-MNT-02 | Users shall log fuel entries per bus: date, liters, amount, optional odometer. |
| MOD-MNT-03 | When maintenance is open, the bus status should reflect maintenance and block new schedule assignment. |
| MOD-MNT-04 | Fuel entries shall reject odometer lower than previous unless override authorised. |
| MOD-MNT-05 | Users shall schedule future servicing based on mileage or date thresholds with reminders. |
| MOD-MNT-06 | The module shall present maintenance history and fuel trend per vehicle. |
| MOD-MNT-07 | Summary fuel report endpoint for analytics integration. |
| MOD-MNT-08 | Duplicate fuel events for same bus/date shall be prevented or warned. |
| MOD-MNT-09 | Transport schedulers may have read access to maintenance status for planning. |

## Analytics & reporting (MOD-ANL)

| ID | Requirement |
|----|-------------|
| MOD-ANL-01 | The module shall provide trip completion rate for a selected date range. |
| MOD-ANL-02 | The module shall provide route performance metrics (trips per route, delays, cancellations). |
| MOD-ANL-03 | The module shall provide fuel consumption trends over time. |
| MOD-ANL-04 | Users shall filter reports by week, month, or custom date range. |
| MOD-ANL-05 | Users shall export CSV of report data. |
| MOD-ANL-06 | Users shall export PDF for management review. |
| MOD-ANL-07 | Administrators shall access user activity / system audit reports. |
| MOD-ANL-08 | Depot-level performance data shall respect depot scope when multi-depot is active. |
| MOD-ANL-09 | Reports shall use finalized or approved trip data where policy requires. |
| MOD-ANL-10 | Vehicle utilisation and maintenance downtime summaries. |

## My trips — driver portal (MOD-TRP)

| ID | Requirement |
|----|-------------|
| MOD-TRP-01 | Drivers shall sign in and land on My trips. |
| MOD-TRP-02 | The module shall list assigned trips for the logged-in driver only. |
| MOD-TRP-03 | Each trip shall show route name, date, times, vehicle, and status. |
| MOD-TRP-04 | Drivers shall see schedule updates (reschedule/cancel) after approval. |
| MOD-TRP-05 | Drivers shall acknowledge assignment before trip start. |
| MOD-TRP-06 | Drivers shall report issues (delay, breakdown, obstruction) with type and remarks. |
| MOD-TRP-07 | Drivers shall view duty history and working-hour summary. |
| MOD-TRP-08 | Drivers shall confirm trip completion when service ends. |
| MOD-TRP-09 | Mobile-friendly layout for smartphone browsers. |

## Multi-depot & master data (MOD-MDP)

| ID | Requirement |
|----|-------------|
| MOD-MDP-01 | The system shall maintain a Depot master entity (name, location). |
| MOD-MDP-02 | Staff users, buses, and drivers may reference depotId. |
| MOD-MDP-03 | Routes and schedules shall reference depotId and API shall filter by caller’s depot. |
| MOD-MDP-04 | Depot managers shall see dashboard, schedules (approve), and analytics scoped to their depot only. |
| MOD-MDP-05 | Administrators shall manage depots via CRUD. |
| MOD-MDP-06 | Master data categories (route categories, vehicle types, fuel types) shall be configurable. |
| MOD-MDP-07 | Data migration import from spreadsheets with validation. |
| MOD-MDP-08 | Seed script for default depot for demos. |

## System & infrastructure (MOD-SYS)

| ID | Requirement |
|----|-------------|
| MOD-SYS-01 | Web application accessible via modern browsers over HTTPS in production. |
| MOD-SYS-02 | Three-tier deployment: React client, Express API, MongoDB database. |
| MOD-SYS-03 | Centralised server model synchronising data for all depot users. |
| MOD-SYS-04 | Database transactions for critical writes (schedule save, status updates). |
| MOD-SYS-05 | Indexed queries for routes, schedules, and reports. |
| MOD-SYS-06 | Backup and restore of database and configuration by administrators. |
| MOD-SYS-07 | Hosting on Vercel (client) and Render (API) or equivalent with env-based config. |
| MOD-SYS-08 | Google Maps API used from client; core scheduling works if maps unavailable. |
| MOD-SYS-09 | Performance sizing for concurrent schedulers, dashboard polling, and report export. |
| MOD-SYS-10 | Application updates with minimal downtime; rollback support. |
