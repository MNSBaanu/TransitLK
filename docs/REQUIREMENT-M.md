# SRMSS — Module-Based Functional Requirements (REQUIREMENT-M)

**Product:** TransitLK — Smart Route Management and Scheduling System

This document describes what the system must do, organised by **module**. Within each module, requirements are grouped **by role** so each role is named once, with its functions listed underneath.

---

## Overview — Who uses which module

| Role | Main responsibility | Modules |
|------|---------------------|---------|
| **Superadministrator** | Platform and depots island-wide | Administrator accounts, Depots, Analytics |
| **Administrator** | Full depot operations | Dashboard, Routes, Schedules, Fleet & Drivers, Users, Maintenance, Analytics |
| **Transport scheduler** | Routes and timetables | Routes, Schedules, Analytics |
| **Fleet manager** | Vehicles, drivers, fuel and workshop | Fleet & Drivers, Maintenance |
| **Depot manager** | Oversight and approval | Dashboard, Schedules, Analytics |
| **Driver** | Own trips only | My trips |

---

## Key features and functions

### 1. Route planning module

**Administrator and transport scheduler**

- Create, modify, and manage routes with a defined start point, end point, intermediary stops, and total distance (kilometres). This gives the depot a structured record of every service path operated, including how far each route runs and which locations it serves along the way.
- Set route names, service type (express, ordinary, semi-luxury), and draft or active status so only operational routes are used in timetables. Keeping routes in draft until finalised prevents unfinished entries from appearing in trip planning and causing scheduling errors.
- Assign buses and drivers to specific routes based on vehicle capacity, availability, service type, and driver working hours; the system warns when a bus or driver does not meet the rules. This automated validation removes the risk of assigning an unsuitable vehicle or an off-duty driver to a live service.
- Use visual route mapping through online map services (e.g. Google Maps) to see the path clearly and pick stops on the map when the service is configured. A map view lets planners verify the route geography and place stops at accurate real-world positions rather than entering coordinates manually.
- Search and review the route catalogue, edit existing routes, and cannot delete a route when trips already depend on it. Blocking deletion when a route is in use protects historical schedule records and prevents data inconsistency across related modules.
- Mark routes inactive when they are no longer run, while history remains available for records and reports. Deactivating rather than deleting preserves trip and performance data tied to that route for auditing and analytics purposes.

---

### 2. Schedule management module

**Transport scheduler**

- Create daily, weekly, and monthly timetables, with each trip having a chosen route, calendar date, departure time, arrival time, bus, and driver. A complete trip record gives the depot a clear picture of every planned service and who and what is responsible for it.
- Build timetables in a visual grid (including Gantt-style views) for day, week, and month planning. Visual planning tools let schedulers spot gaps, overlaps, and imbalances at a glance instead of scanning through lists of raw data.
- Receive automatic detection and prevention of overlapping or conflicting schedules when planning trips (same bus or driver double-booked, invalid times, bus in maintenance, driver unavailable), with clear messages to correct plans before publication. Conflict detection at entry time prevents operational failures such as a driver being on two routes simultaneously or a bus being dispatched while it is still being serviced.
- Prepare timetables as drafts and submit them for depot approval. A draft-to-approval workflow ensures that no untested timetable reaches drivers and buses without a responsible manager reviewing and confirming it first.
- Plan trips in bulk across a date range (including repeat-for-week on single entries and multi-route timetable creation), with warnings when individual trips cannot be placed. Bulk creation dramatically reduces the manual effort needed to plan regular services that repeat on the same pattern each week.
- Remove draft or unneeded schedule entries when plans change before they go live. Allowing deletion of drafts keeps the planning workspace clean and avoids confusion between live and abandoned entries.
- Adjust schedules for emergencies, maintenance work, or unexpected events (including delay, cancellation, bus or driver change), with notes where required and a recorded history of changes. A full adjustment trail ensures that any deviation from the original plan is documented with a reason, supporting accountability and future review.

**Depot manager and administrator**

- Approve submitted timetables only when plans are still conflict-free, or return work to the scheduler with a stated reason. A gated approval step adds a management check before schedules become operational, reducing the chance of poorly planned services reaching the road.
- Track trip status through the working day (e.g. scheduled, on-time, delayed, completed, cancelled) for depot visibility and reporting. Live status tracking gives managers immediate awareness of service performance without relying on phone calls or manual updates.
- Adjust schedules for emergencies, maintenance work, or unexpected events, with notes where required and a recorded history of changes. Senior roles retain the ability to intervene directly when circumstances on the ground require an immediate schedule change.

**Driver**

- View approved and scheduled trips assigned to them through the My trips area (read-only). Drivers see only their own duty roster, giving them clear visibility of where they need to be and when, without access to the broader operational data that is not relevant to their role.

---

### 3. Depot management dashboard module

**Administrator and depot manager**

- Use a centralized control panel showing active routes, buses available or in maintenance, drivers on duty, and recent trips. A single overview page removes the need to navigate across multiple modules to understand the current state of depot operations at a glance.
- See trip status such as on-time, delayed, scheduled, or completed, with colour cues for operational visibility during the day. Colour-coded statuses allow managers to identify problem trips immediately and decide whether intervention is needed, especially during busy operational periods.
- View summary statistics on total active routes, trip completion rate, and how buses are distributed across available, in-service, and maintenance states. High-level metrics give depot leadership a quick understanding of how efficiently the fleet and schedule are performing at any point in the day.
- Receive highlights of recent maintenance-related situations when a bus is in the workshop. Maintenance alerts on the dashboard surface critical vehicle availability issues that could affect trip planning and driver assignments if not addressed promptly.
- Rely on automatic periodic refresh of key figures and the trip list so the dashboard stays current during the working day (without live vehicle tracking). Automatic data refresh at regular intervals means managers always see up-to-date information without needing to manually reload the page.

---

### 4. Fuel and maintenance log module

**Fleet manager and administrator**

- Maintain a record of fuel consumption per vehicle (date, litres, cost), supporting identification of high-usage vehicles and inefficient patterns when used with reporting. Tracking fuel per vehicle over time enables the depot to spot buses consuming more than expected and take corrective action such as mechanical inspection or route reassignment.
- Log routine and corrective maintenance activities (service date, description, cost per bus), so each vehicle's workshop history is kept in one place. A complete service history per bus supports better planning of future maintenance, reduces unexpected breakdowns, and provides evidence for warranty or compliance purposes.
- Edit or remove fuel and maintenance entries when corrections are needed. The ability to correct records ensures data accuracy when an entry is made in error, without permanently corrupting the historical log.
- Review fuel entries and maintenance jobs separately in the workspace. Separating the two log types into distinct views prevents confusion between operational fuel costs and workshop service costs when reviewing records.

**Fleet manager**

- Set bus status on the Fleet screen when a vehicle is off the road, in line with maintenance records. Manually updating a bus status to maintenance ensures the scheduling module immediately treats that vehicle as unavailable and prevents it from being assigned to a new trip while it is being serviced.

**Administrator, depot manager, and transport scheduler**

- Access fuel and maintenance summaries through analytics to support cost-effective and more sustainable operations (where their role permits). Providing summary data to planning and management roles enables informed decisions about route efficiency, fleet replacement, and budget allocation.

---

### 5. Driver and vehicle management database module

**Fleet manager and administrator**

- Store comprehensive driver details, including name, contact information, licence number, optional licence expiry, working hours, status (available, on-leave, off-duty), depot, and optional login for the driver portal. Centralising driver records in one place gives fleet managers and administrators a reliable single source of truth for staffing decisions and compliance checks.
- Maintain a database of vehicles, including registration number, seating capacity, mileage, service type, depot, and status (available, in-service, maintenance). A structured vehicle database allows the fleet team to manage asset utilisation, monitor vehicle age and mileage, and ensure the right type of bus is available for each route category.
- Remove bus or driver records that are no longer required, subject to system rules when linked data exists. Protecting against deletion when a driver or bus is referenced by existing schedules or logs prevents data integrity issues that would leave broken references in trip and maintenance records.
- Keep registration and licence numbers unique when creating or updating records. Uniqueness enforcement at the database level prevents accidental duplicate entries that could result in the same physical vehicle or driver being recorded twice under slightly different details.
- Review maintenance history per vehicle together with the fuel and maintenance log. Linking vehicle profiles to their service records gives fleet managers a combined view of usage, costs, and workshop activity without switching between unrelated screens.

**Transport scheduler and administrator**

- See whether a driver is eligible for assignment (available and within working hours) before trips are confirmed. Eligibility checks at point of assignment prevent planners from inadvertently committing a driver who is on leave, off-duty, or outside their approved shift window.
- See who and what is assigned to each service through route and trip planning linked to drivers and buses. Visibility into current assignments helps schedulers avoid double-booking and understand workload distribution across the driver and fleet pool.

---

### 6. Reporting and analytics module

**Superadministrator, administrator, transport scheduler, and depot manager**

- View automated weekly and monthly reports (and custom date ranges) on trip completion rates, route performance (delays, cancellations, risk indicators), and fuel consumption trends. Automated report generation removes the manual effort of compiling data from multiple sources and provides consistent, time-stamped snapshots of operational performance.
- Download exportable reports in PDF and CSV for management review, sustainability reporting, depot meetings, and further analysis in spreadsheets. Exportable formats allow reports to be shared with stakeholders who do not have system access and to be used in external presentations, audits, or funding applications.

**Administrator and depot manager**

- Monitor summary KPIs and narrative insights on screen without building spreadsheets manually. On-screen dashboards and summaries give busy managers actionable performance data quickly, reducing reliance on time-consuming manual data extraction.
- Export trip data for further analysis in external tools. Raw data exports give analysts and administrators the flexibility to run custom calculations or visualisations beyond what the built-in reports provide.
- Use data-driven insights into operational efficiency, including which routes are performing well or need attention. Identifying underperforming routes from real operational data allows the depot to prioritise improvements, reallocate resources, or escalate issues to management with evidence.

**Superadministrator**

- View network-wide analytics across depots where the platform scope applies. A cross-depot view enables platform-level oversight of the entire transport network, supporting national-level planning, resource allocation decisions, and policy compliance monitoring.

---

## Supporting modules

### Authentication

**All users (superadministrator, administrator, transport scheduler, fleet manager, depot manager, driver)**

- Sign in with email and password; the system recognises administrators, depot staff, and drivers in turn. A single login entry point that handles multiple account types gives all users the same straightforward experience regardless of their role.
- Receive a general error message when credentials are wrong, without revealing whether the email exists. Providing a non-specific error response is a security measure that prevents attackers from using the login form to discover which email addresses are registered in the system.
- See name, role, and depot (where relevant) in the application after sign-in, with session restored when they return. Displaying identity details after login confirms the correct account is active and reduces the chance of a user unknowingly working under the wrong role or depot.

**Deactivated depot staff (transport scheduler, fleet manager, depot manager)**

- Cannot sign in while their account is marked inactive. Blocking login for deactivated accounts ensures that staff who have left the depot or had their access suspended cannot reach any operational or sensitive data.

**Administrator**

- Create depot staff accounts with role and depot assignment. Administrators are responsible for provisioning access for their own depot, ensuring each staff member gets exactly the permissions their role requires and no more.

---

### Users and access

**Administrator**

- Manage depot staff accounts (transport scheduler, fleet manager, depot manager): create, edit, deactivate, or remove, with role and depot assignment. Full account lifecycle management allows the administrator to keep the user list accurate as staff join, change roles, or leave the depot.
- See which parts of the system each staff role may use. A clear reference of role permissions helps administrators understand what each person can and cannot do, supporting correct role assignment and reducing access-related mistakes.

---

### Administrator and depot registry

**Superadministrator**

- Maintain platform administrator accounts. The superadministrator is the highest authority in the system and is responsible for creating and managing administrator accounts across all depots on the platform.
- Maintain the register of depots (code, name, region, location) for multi-depot growth. A central depot registry underpins the entire multi-depot architecture, allowing new depots to be added to the platform without system changes and ensuring all data is correctly scoped to the right depot.

---

### My trips (driver portal)

**Driver**

- See only their own assigned trips with route, times, bus, and status, on a layout suited to mobile use. A focused, read-only trip view gives drivers exactly the information they need for their shift — where to be, when, and in which vehicle — without exposing operational data that is not relevant to them.
- Cannot change or approve schedules from this area. Restricting drivers to read-only access ensures that schedule integrity is maintained by authorised planning and management roles only.

---

### Cross-cutting (all modules)

**All roles**

- May only open modules allowed for their role and are directed to their home area after login. Role-based navigation prevents users from accidentally or deliberately accessing modules outside their responsibility, maintaining data security and operational separation between roles.
- Have account passwords protected by the system. Passwords are stored using a one-way hashing algorithm (bcrypt), meaning that even if the database were compromised, plain-text passwords could not be recovered.

**Transport scheduler, depot manager, and administrator**

- Have trip schedule changes recorded with history when they edit timetables; trip dates align to calendar days for planning and reports. An immutable audit trail of schedule modifications provides accountability and supports investigations when operational issues need to be traced back to a specific change.

---

## Planned later (not in the current system)

**Administrator and other users**

- Password reset and stronger sign-in options. A self-service password reset flow and optional multi-factor authentication will be added in a future release to improve account security and reduce dependency on administrator intervention for credential issues.

**Transport scheduler and depot manager**

- In-app alerts when timetables conflict or need approval. Real-time notifications will prompt schedulers and managers to act on pending conflicts or approval requests without having to check the system manually.

**Superadministrator and administrator**

- Organisation-wide audit log beyond trip adjustment history. A full system audit trail covering permission changes, account actions, and data edits will provide complete operational accountability across the platform.

**Driver**

- Confirm trips and report issues from the phone. A future enhancement will allow drivers to acknowledge their assigned trips and flag problems (such as vehicle faults or delays) directly from the driver portal.

**Depot manager and depot staff**

- Strict "one depot only" data views everywhere island-wide. Once multi-depot scoping is fully enforced across all queries and views, each depot's staff will only ever see data belonging to their own depot.

**Transport scheduler**

- Import routes from spreadsheets. A bulk import feature will allow transport schedulers to migrate existing route data from spreadsheet records into the system without manual re-entry.

**Fleet manager**

- Automatic bus status change when a trip is assigned (today status is set manually on the Fleet screen). Automating bus status transitions based on schedule events will reduce manual effort and ensure the fleet view accurately reflects real-time vehicle commitments.
- Create or reset driver portal login credentials from the Fleet screen. A dedicated credential management UI within the Fleet module will allow fleet managers to set up or reset driver login details without requiring administrator involvement.

**Transport scheduler and fleet manager**

- Automatic rejection of trip or route assignment when a driver's licence is past its expiry date (expiry is recorded today but not yet enforced when scheduling). Enforcing licence validity at the point of assignment will prevent non-compliant drivers from being rostered onto live services.

---

*End of REQUIREMENT-M*
