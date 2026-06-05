# SRMSS — Functional Requirements (REQUIREMENT-M)

**Product:** TransitLK — Smart Route Management and Scheduling System

This document lists what the system must do, organised by module. Each bullet is a functional requirement the system shall satisfy.

---

## Authentication

- The system shall provide one login page for all user types: superadministrator, administrator, transport scheduler, fleet manager, depot manager, and driver.
- Users shall sign in with email and password.
- The system shall check credentials against the correct account collection: `admins` for administrators, `users` for depot staff, and `drivers` for drivers.
- On successful login, the system shall issue a JWT token and return the user’s name, role, and depot (where applicable).
- On failed login, the system shall show a general error message (e.g. “Invalid credentials”) and shall not reveal whether the email exists.
- The system shall reject login for depot staff accounts marked inactive (`isActive: false`).
- The system shall send the JWT in the `Authorization: Bearer` header on every API request.
- All API endpoints except login and health check shall require a valid JWT.
- The system shall persist the session in the browser so returning users remain signed in when the token is still valid.
- The system shall redirect unauthenticated users to the login page.
- Passwords shall be hashed with bcrypt before storage; plain-text passwords shall never be stored or returned in API responses.

---

## User Management

**Roles:** Administrator only.

- The administrator shall create depot staff accounts for transport scheduler, fleet manager, and depot manager roles.
- Each staff account shall include: full name, email, password (minimum 6 characters), role, and assigned depot.
- The administrator shall edit staff name, role, depot assignment, and active/inactive status.
- The administrator shall deactivate a staff account instead of deleting it when the person leaves the depot.
- The administrator shall permanently remove staff accounts when appropriate.
- The system shall enforce unique email addresses across all staff accounts.
- Inactive staff shall be blocked at login and shall not access any module.
- The administrator shall view a list of all depot staff with their role and depot.

---

## Administrator Registry

**Roles:** Superadministrator only.

- The superadministrator shall create platform administrator accounts with name, email, and password.
- The superadministrator shall edit administrator details.
- The superadministrator shall remove administrator accounts when no longer required.
- The system shall enforce unique email addresses for administrator accounts.
- Administrator accounts are separate from depot staff accounts and use the `admins` collection.

---

## Depot Management

**Roles:** Superadministrator only.

- The superadministrator shall register depots with: depot code (unique, uppercase), depot name, region, location, and optional contact numbers.
- The superadministrator shall edit existing depot records.
- The superadministrator shall remove depot records when no longer required.
- The system shall enforce unique depot codes across the platform.
- Each depot staff user, bus, and driver record shall be assignable to one depot via `depotId`.
- Depot records shall support multi-depot operations across Sri Lanka.

---

## Route Planning

**Roles:** Administrator, Transport scheduler.

- The user shall create a route with: route name, optional route number, start point, end point, optional via description, intermediary stops, total distance (km), and service type.
- Service type shall be one of: express, ordinary, or semi-luxury.
- Route status shall be one of: draft, active, or inactive.
- Only routes with status **active** shall appear when creating new schedule trips.
- The user shall store map coordinates for start point, end point, and each stop (latitude, longitude, address/name).
- The user shall view the route on Google Maps and pick or adjust stops on the map.
- The user shall assign an optional default bus and default driver to a route.
- When assigning a bus or driver, the system shall validate: vehicle availability and service type match; driver availability, working hours, and off-duty/on-leave status.
- The system shall warn the user when a bus or driver does not meet assignment rules.
- The user shall search and filter the route catalogue.
- The user shall edit existing route details.
- The user shall set a route to **inactive** when the service is discontinued (history preserved).
- The system shall block deletion of any route linked to existing schedule records.
- A route cannot be saved as active without a valid start point, end point, and distance.
- Route number shall be unique per depot when provided.

---

## Schedule Management

**Roles:** Transport scheduler (create/edit), Depot manager and Administrator (approve/adjust), Driver (view own trips only).

### Trip creation and timetables

- The transport scheduler shall create a trip with: route, trip date, departure time (HH:mm), arrival time (HH:mm), assigned bus, and assigned driver.
- Departure time shall be before arrival time on the same calendar day.
- The user shall view timetables in **day**, **week**, and **month** views.
- The week and month views shall include a Gantt-style grid showing trips across routes and time slots.
- The transport scheduler shall create multiple trips in one action across a date range.
- The transport scheduler shall repeat a trip pattern weekly when bulk planning.
- The transport scheduler shall delete draft or unneeded trips before they are approved.

### Conflict detection

- Before saving or submitting a trip, the system shall check for conflicts and block invalid assignments.
- The system shall detect **bus overlap**: the same bus assigned to two trips on the same day with overlapping departure–arrival times.
- The system shall detect **driver overlap**: the same driver assigned to two trips on the same day with overlapping times.
- The system shall detect **route overlap**: the same route double-booked on the same day with overlapping times.
- The system shall reject trips where the assigned bus has status **maintenance**.
- The system shall reject trips where the assigned driver has status **on-leave** or **off-duty**.
- The system shall reject trips on **inactive** routes.
- The system shall return clear conflict messages identifying the bus, driver, route, date, and conflicting trip.

### Approval workflow

- New trips shall start with status **draft**.
- The transport scheduler shall submit draft trips for approval; status changes to **pending**.
- The depot manager or administrator shall **approve** pending trips when still conflict-free; status changes to **approved** then **scheduled**.
- The depot manager or administrator shall **reject** pending trips with a written rejection reason; the scheduler can revise and resubmit.
- Only approved/scheduled trips shall be visible to the assigned driver in My Trips.

### Trip status and adjustments

- Operational trip status shall include: scheduled, on-time, delayed, completed, and cancelled.
- The transport scheduler, depot manager, or administrator shall adjust live trips for: delay, cancellation, bus change, or driver change.
- Adjustments for emergency, maintenance, absence, or obstruction shall require a written note.
- Every adjustment shall be stored in an adjustment history log with: timestamp, user, reason, notes, and field-level before/after values.
- Trip dates shall be stored and queried as calendar days (YYYY-MM-DD) for consistent planning and reporting.

### Driver view

- The driver shall view only trips assigned to them in My Trips (read-only).
- Each driver trip shall show: route name, trip date, departure and arrival times, bus registration, and current status.
- The driver shall not create, edit, approve, or delete any schedule from My Trips.

---

## Vehicle (Bus) Management

**Roles:** Fleet manager, Administrator.

- The fleet manager shall register a bus with: registration number (unique), seating capacity, mileage (km), service type (express / ordinary / semi-luxury), assigned depot, and status.
- Bus status shall be one of: **available**, **in-service**, or **maintenance**.
- The fleet manager shall edit bus details and update status at any time.
- The fleet manager shall remove buses that are no longer in the fleet when not referenced by active schedules.
- The system shall enforce unique registration numbers across all buses.
- Buses with status **maintenance** shall not be selectable when creating or adjusting schedule trips.
- The fleet manager shall view each bus’s linked maintenance history from the fleet screen.
- The fleet manager shall set a bus to **maintenance** status directly from the Fleet screen; this shall immediately affect schedule assignment availability.

---

## Driver Management

**Roles:** Fleet manager, Administrator.

- The fleet manager shall register a driver with: full name, contact number, licence number (unique), optional licence expiry date, working hours (e.g. shift window), status, and assigned depot.
- Driver status shall be one of: **available**, **on-leave**, or **off-duty**.
- The fleet manager shall edit driver details and update status.
- The fleet manager shall enable driver portal access by setting a unique email and password (minimum 6 characters) on the driver record.
- The fleet manager shall remove driver records not referenced by active schedules.
- The system shall enforce unique licence numbers across all drivers.
- Drivers with status **on-leave** or **off-duty** shall not be assignable to new trips.
- Transport schedulers shall see whether a driver is eligible (available and within working hours) before confirming trip assignment.
- Licence expiry date shall be recorded; the system shall support future enforcement blocking expired licences from assignment.

---

## Fuel and Maintenance Logging

**Roles:** Fleet manager, Administrator.

### Fuel logs

- The fleet manager shall record fuel consumption per bus with: fuel date, litres used, and cost (amount).
- The fleet manager shall edit or delete fuel log entries when corrections are needed.
- Fuel logs shall be listed separately from maintenance records.

### Maintenance logs

- The fleet manager shall record maintenance work per bus with: service date, description of work, and cost.
- The fleet manager shall edit or delete maintenance entries when corrections are needed.
- Maintenance records shall be listed separately from fuel logs.

### Integration with fleet and scheduling

- Setting a bus to **maintenance** on the Fleet screen shall prevent that bus from being assigned to new trips.
- Maintenance and fuel data shall be available to the analytics and reporting module for cost and efficiency analysis.
- Transport schedulers and depot managers shall view fuel and maintenance summaries in analytics where their role permits.

---

## Dashboard

**Roles:** Administrator, Depot manager.

- The dashboard shall display a summary of current depot operations on one screen.
- The dashboard shall show the count of **active routes**.
- The dashboard shall show bus totals broken down by status: available, in-service, and maintenance.
- The dashboard shall show driver totals broken down by status: available, on-leave, and off-duty.
- The dashboard shall list recent trips with route name, bus, driver, departure time, and trip status.
- Trip status shall use colour-coded labels: scheduled, on-time, delayed, completed, cancelled.
- The dashboard shall show KPI cards including: total operational trips, completed trip count, and trip completion rate.
- The dashboard shall highlight buses currently in maintenance with recent workshop entries.
- The dashboard shall refresh key figures and the recent trips list automatically at intervals during the working day.
- The dashboard shall not require live GPS tracking; data is refreshed from the central database.

---

## Reporting and Analytics

**Roles:** Superadministrator, Administrator, Transport scheduler, Depot manager.

### On-screen analytics

- The user shall select a reporting period: weekly, monthly, or custom date range.
- Analytics shall show trip completion rates for the selected period.
- Analytics shall show route performance including delays, cancellations, and at-risk routes.
- Analytics shall show fuel consumption trends per vehicle and across the fleet.
- Analytics shall show fleet utilisation and maintenance cost summaries.
- KPI cards and narrative insights shall be displayed on screen without requiring manual spreadsheet work.

### Export

- The user shall download an operations report as a **PDF** file for the selected period.
- The administrator and depot manager shall export trip and operational data as **CSV** for further analysis.
- PDF reports shall include period label, summary KPIs, route performance table, and fuel trends.

### Network-wide view

- The superadministrator shall view analytics aggregated across all depots on the platform.
- Depot-level roles shall view analytics scoped to their operational data.

---

## System-Wide Access Control

- Each role shall only access modules permitted for that role:

| Role | Permitted modules |
|------|-------------------|
| Superadministrator | Administrator Management, Depot Management, Global Analytics |
| Administrator | Dashboard, Routes, Schedules, Fleet & Drivers, Users, Maintenance, Analytics |
| Transport scheduler | Routes, Schedules, Analytics |
| Fleet manager | Fleet & Drivers, Maintenance |
| Depot manager | Dashboard, Schedules, Analytics |
| Driver | My Trips |

- After login, each role shall be redirected to its home screen: superadministrator → Admins; administrator and depot manager → Dashboard; transport scheduler → Routes; fleet manager → Fleet; driver → My Trips.
- The navigation menu shall show only modules the signed-in role may access.
- Direct URL access to a restricted module shall be blocked in the browser and rejected by the API.
- Schedule adjustments shall always be recorded with a full change history (who changed what, when, and why).
- Deactivated users, inactive routes, and cancelled trips shall remain in the database for audit, reporting, and historical reference.
- The system shall separate administrator accounts, depot staff accounts, and driver accounts with distinct permissions.

---

## My Trips (Driver Portal)

**Roles:** Driver only.

- The driver shall sign in with their driver portal email and password.
- The driver shall see only trips assigned to them — no other driver’s trips and no depot-wide data.
- Each trip shall display: route name, start and end points, trip date, departure and arrival times, assigned bus registration number, and current trip status.
- The layout shall be readable on a smartphone or tablet browser.
- The driver shall not create, edit, approve, reject, or delete any trip from My Trips.
- Only trips with approved or operational status (scheduled, on-time, delayed, completed) shall appear in the driver’s list.

---

*End of REQUIREMENT-M*
