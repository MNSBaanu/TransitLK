# SRMSS — Functional Requirements (REQUIREMENT-M)

**Product:** TransitLK — Smart Route Management and Scheduling System (SRMSS)

This document describes the functional requirements of TransitLK — a web-based platform for digitalizing public transport depot operations in Sri Lanka. Requirements are grouped by module. Each point states what the system shall do, including validation rules and access restrictions where they apply.

---

## Authentication

TransitLK uses a single secure entry point for every actor in the system. All depot staff, administrators, and drivers authenticate before accessing their permitted modules.

- The system shall provide one shared login page for superadministrator, administrator, transport scheduler, fleet manager, depot manager, and driver accounts.
- Users shall sign in using a registered email address and password.
- The system shall reject login attempts where email or password is missing and shall prompt the user to complete both fields.
- The system shall verify credentials against the correct account store: platform administrators in `admins`, depot staff (scheduler, fleet manager, depot manager) in `users`, and drivers in `drivers`.
- On successful authentication, the system shall issue a JWT security token and return the signed-in user’s display name, role, and assigned depot (where the role requires a depot).
- On failed authentication, the system shall display a general message such as “Invalid email or password” and shall not indicate whether the email address exists in the system.
- Inactive depot staff accounts (`isActive: false`) shall be denied login even when the password is correct, so former or suspended staff cannot access operational data.
- Drivers without a configured portal password shall not be able to sign in until credentials are set by the fleet manager.
- After login, the system shall attach the JWT to every API request using the `Authorization: Bearer` header so the server can identify the user on each action.
- Protected API endpoints shall require a valid token; only the login endpoint and server health check may be called without authentication.
- The system shall store the session token in the browser so returning users with a still-valid token remain signed in without re-entering credentials.
- Unauthenticated users attempting to open any application page shall be redirected to the login screen.
- All passwords shall be stored using bcrypt one-way hashing; plain-text passwords shall never be saved in the database or returned in API responses.

---

## User Management

Depot administrators are responsible for provisioning and maintaining staff accounts for their depot. This module controls who can access scheduling, fleet, and management functions.

**Roles:** Administrator only.

- The administrator shall create new depot staff accounts for the roles transport scheduler, fleet manager, and depot manager.
- Each new staff account shall capture the staff member’s full name, work email, initial password (minimum six characters), assigned role, and linked depot.
- Staff account creation shall be rejected when depot assignment is missing, because every operational staff member must belong to a depot.
- Staff account creation shall be blocked when the email address is already registered to another staff or administrator account.
- The administrator shall update existing staff records, including name, role, depot assignment, and whether the account is active or inactive.
- Staff members who leave the depot or are temporarily suspended shall be deactivated rather than deleted immediately, preserving audit history linked to that user.
- The administrator may permanently remove staff accounts when they are no longer needed and no operational dependency blocks deletion.
- Inactive accounts shall be unable to sign in and shall have no access to any TransitLK module.
- The administrator shall view a searchable list of all depot staff showing each person’s name, email, role, depot, and active status.

---

## Administrator Registry

The superadministrator governs platform-level administrator accounts that manage individual depots across the TransitLK network.

**Roles:** Superadministrator only.

- The superadministrator shall register new platform administrator accounts with name, email, and password so each depot can have its own operational lead.
- Administrator account creation shall be rejected when the email address is already in use.
- The superadministrator shall edit administrator profile details when contact information or access needs to change.
- The superadministrator shall remove administrator accounts that are no longer required on the platform.
- Administrator accounts shall remain separate from depot staff accounts and shall authenticate through the `admins` collection, reflecting their higher platform scope.

---

## Depot Management

TransitLK is designed to support multiple public transport depots across Sri Lanka. The depot registry is the foundation for assigning staff, buses, and drivers to the correct operational location.

**Roles:** Superadministrator only.

- The superadministrator shall register each depot with a unique depot code (stored uppercase), depot name, region, physical location, and optional direct, mobile, or general contact numbers.
- Depot registration shall fail when depot code, depot name, or region is missing.
- Depot registration shall be rejected when the depot code already exists on the platform.
- The superadministrator shall update depot details when names, regions, locations, or contacts change.
- The superadministrator shall remove depot records that are no longer part of the network when safe to do so.
- Each depot staff user, bus, and driver record shall be linkable to exactly one depot through `depotId`, enabling depot-scoped operations as the platform grows island-wide.

---

## Route Planning

The route planning module replaces manual route registers and map sketches used in depots. Transport schedulers and administrators define every bus service path — where it starts, where it ends, which stops it serves, and how far it runs — before trips are scheduled.

**Roles:** Administrator, Transport scheduler.

- The user shall create a route record containing route name, optional route number, textual start point and end point, optional via description, list of intermediary stops, total distance in kilometres, and service type.
- Service type shall be limited to **express**, **ordinary**, or **semi-luxury**, matching common Sri Lankan public transport service categories.
- Route lifecycle status shall be **draft** (being prepared), **active** (available for scheduling), or **inactive** (discontinued but retained for history).
- Only routes with status **active** shall be offered when the transport scheduler creates new timetable trips.
- The user shall capture geographic coordinates (latitude, longitude, and address label) for the start location, end location, and each intermediary stop so the route can be drawn accurately on a map.
- The user shall view and edit the route visually on Google Maps integrated in the TransitLK interface, selecting or adjusting stops directly on the map rather than typing coordinates manually.
- The user may assign a default bus and default driver to a route to speed up repeated trip planning for regular services.
- Route save shall be rejected when a bus is selected without a driver, or a driver without a bus, because fleet assignment must be complete when either field is used.
- Bus assignment shall confirm the bus exists, is not in maintenance, has a compatible service type for the route, and belongs to the same depot as the route when depot scoping applies.
- Driver assignment shall confirm the driver exists, has status **available** (not on-leave or off-duty), is within declared working hours, and belongs to the same depot as the route when depot scoping applies.
- The system shall display a clear warning and block save when the assigned bus or driver fails any eligibility rule.
- The user shall browse, search, and filter the full route catalogue to find and open existing services for editing.
- The user shall update route details at any time; the same validation rules apply when editing as when creating.
- Permanently withdrawn bus services shall be set to **inactive** so they no longer appear in new schedules while historical trips and reports remain intact.
- Route deletion shall be blocked while one or more schedule/trip records are linked to that route.
- Route save shall be rejected when route name, start point, end point, or distance is missing.
- Route numbers shall be unique within each depot; duplicate route numbers for the same depot shall be rejected.

---

## Schedule Management

Schedule management is the core operational module of TransitLK. It replaces paper timetables and spreadsheet planning with a digital timetable that supports daily, weekly, and monthly views, automatic conflict detection, manager approval, and live trip status tracking throughout the working day.

**Roles:** Transport scheduler (create and edit), Depot manager and Administrator (approve and adjust), Driver (view own duties only).

### Trip creation and timetables

- The transport scheduler shall plan each trip by selecting an active route, calendar trip date, departure time, arrival time (both in HH:mm format), assigned bus, and assigned driver.
- Trip save shall be rejected when any required field is missing.
- Trip save shall be rejected when departure time is equal to or after arrival time on the same day.
- Trip save shall be rejected when times are not in valid HH:mm format.
- The user shall switch between **day**, **week**, and **month** timetable views to plan services at different planning horizons.
- Week and month views shall present trips in a Gantt-style visual grid so schedulers can see how routes, buses, and drivers are distributed across time slots and spot gaps or overloads quickly.
- The transport scheduler shall generate multiple trips in one operation across a selected date range, reducing manual effort for regular repeating services.
- The transport scheduler shall apply a weekly repeat pattern when building recurring timetables for services that run on the same days each week.
- Trips in **draft** or **pending** status may be removed by the transport scheduler when plans change before approval.
- Trips that are already approved or in live operational status shall be changed through the adjustment workflow rather than simple deletion.

### Conflict detection

TransitLK shall prevent the operational failures that occur when manual scheduling double-books a bus, a driver, or a route.

- The system shall run automatic conflict and eligibility checks before any trip is saved, submitted, or approved.
- The system shall block save and show a bus conflict message when the same bus is already assigned to another trip on the same calendar day with overlapping departure and arrival times.
- The system shall block save and show a driver conflict message when the same driver is already assigned to another overlapping trip on the same day.
- The system shall block save and show a route conflict message when the same route is double-booked on the same day with overlapping times.
- Trip assignment shall be rejected when the selected bus has status **maintenance**.
- Trip assignment shall be rejected when the selected bus status is neither **available** nor **in-service**.
- Trip assignment shall be rejected when the selected driver has status **on-leave** or **off-duty**.
- Trip assignment shall be rejected when the departure time falls outside the driver’s declared working hours.
- Trip assignment shall be rejected when the linked route is not **active**.
- Cross-depot assignment shall be rejected when bus or driver depot does not match the route’s depot and depot identifiers are set.
- The system shall return an explicit message identifying the affected bus, driver, route, date, and conflicting record whenever a conflict or eligibility failure occurs.

### Approval workflow

Depot authority requires that timetables prepared by schedulers are reviewed by management before they become operational. TransitLK enforces a prepare → submit → approve chain.

- New trips created by the transport scheduler shall start with status **draft**, meaning they are not yet visible to drivers or treated as live services.
- Draft trips that pass conflict checks may be submitted by the transport scheduler for managerial approval; upon submit, status becomes **pending** and the submission timestamp is recorded.
- Submit shall be rejected for trips that are not in **draft** status.
- Submit shall be blocked while conflicts remain unresolved.
- Pending trips that are still conflict-free may be approved by the depot manager or administrator; upon approval, status becomes **approved**, the approver is recorded, and any prior rejection reason is cleared.
- Approval shall be rejected for trips that are not in **pending** status.
- Approval shall be blocked when new conflicts arise between submit and approve.
- The depot manager or administrator may reject a pending timetable with a mandatory written reason; status returns to **draft** so the scheduler can revise and resubmit.
- Reject shall fail when no rejection reason is provided.
- Trips in approved or subsequent operational status (scheduled, on-time, delayed, completed) shall appear in the assigned driver’s My Trips view.
- Trips in draft or pending status shall not be visible to drivers.

### Trip status and operational adjustments

During the working day, depots must respond to delays, breakdowns, staff absence, and road obstructions. TransitLK supports live trip adjustments with full accountability.

- Live trip status shall progress through operational values including **scheduled**, **on-time**, **delayed**, **completed**, and **cancelled** so managers can monitor service performance on the dashboard and in reports.
- The transport scheduler, depot manager, or administrator shall adjust approved or live trips to reflect delays, cancellations, bus replacements, or driver replacements as circumstances change.
- Adjustments classified as emergency, maintenance, absence, or obstruction shall require a written note; the adjustment shall be rejected when the note is missing.
- Cancelled trips may skip bus and driver conflict re-validation; active trips shall undergo full eligibility and conflict checks on every update.
- Every change to a trip field after creation shall append an entry to the trip’s adjustment history recording the date/time, acting user, reason, notes, and the previous and new value of each changed field.
- Trip dates shall be stored and queried as calendar days (YYYY-MM-DD) so weekly, monthly, and custom-period reports align with how depot staff plan timetables.

### Driver view within scheduling

- Drivers shall see only trips where they are the assigned `driverId` on the schedules API and My Trips screen.
- Each trip shown to a driver shall include route name, trip date, departure and arrival times, assigned bus registration number, and current trip status.
- Drivers shall have read-only access and shall not create, edit, submit, approve, reject, or delete any timetable entry.

---

## Vehicle (Bus) Management

The fleet module maintains the register of every bus operated from the depot — its registration, capacity, mileage, service category, and current availability — so schedulers assign the correct vehicle to each route and trip.

**Roles:** Fleet manager, Administrator.

- The fleet manager shall register each bus with registration number, passenger seating capacity, current mileage in kilometres, service type (express / ordinary / semi-luxury), assigned depot, and operational status.
- Bus registration shall fail when registration number or capacity is missing, or when capacity is less than one.
- Bus registration shall be rejected when the registration number already exists on another bus.
- Bus operational status shall be **available** (ready for assignment), **in-service** (committed to operations), or **maintenance** (off the road for workshop work).
- The fleet manager shall update bus details and change status as fleet conditions change during the day.
- Buses no longer in the fleet and not referenced by active schedules may be removed by the fleet manager.
- Buses in **maintenance** status shall not appear as valid choices when creating or updating schedule trips.
- Setting a bus to **maintenance** from the Fleet screen shall immediately make that vehicle unavailable for scheduling.
- The fleet manager shall open a bus profile and review its linked maintenance and workshop history without leaving the fleet module.

---

## Driver Management

Driver records hold the staffing information schedulers need to assign duties legally and safely: identity, licence, contact, working hours, availability, and optional portal login for My Trips.

**Roles:** Fleet manager, Administrator.

- The fleet manager shall register each driver with full name, contact number, unique licence number, optional licence expiry date, declared working hours (shift window), operational status, and assigned depot.
- Driver registration shall be rejected when name or licence number is missing, or when the licence number already exists.
- Driver status shall be **available** (fit for duty), **on-leave** (approved absence), or **off-duty** (not working that period).
- The fleet manager shall update driver details and change status when drivers return from leave, finish a shift pattern, or become unavailable.
- Drivers using My Trips shall have a unique email and password (minimum six characters) configured on their record by the fleet manager.
- Driver portal setup shall be rejected when the email is already used by another driver account.
- Driver removal may be restricted while the driver is linked to active approved schedules.
- Drivers with status **on-leave** or **off-duty** shall not be offered for new trip assignment.
- Assignment shall be rejected when driver status is **available** but the planned departure time falls outside declared `workingHours`.
- Licence expiry dates shall be recorded; expired licences shall support blocking assignment when licence enforcement is enabled.
- Transport schedulers shall see whether each driver is eligible before confirming trip assignment.

---

## Fuel and Maintenance Logging

Fuel and maintenance logging digitalizes the workshop and fuel records traditionally kept in separate ledgers. Each entry is tied to a specific bus so managers can analyse cost, consumption, and vehicle reliability over time.

**Roles:** Fleet manager, Administrator.

### Fuel logs

- The fleet manager shall record each fuel purchase or refill against a bus, capturing fuel date, quantity in litres, and cost in currency.
- Fuel log save shall be rejected when bus, date, litres, or cost is missing.
- The fleet manager shall correct or remove fuel entries when a figure was recorded in error.
- Fuel entries shall be displayed in their own list view, separate from maintenance jobs, so operational fuel spend is not confused with workshop repair cost.

### Maintenance logs

- The fleet manager shall log each maintenance or repair job against a bus with service date, description of work performed, and cost.
- Maintenance log save shall be rejected when bus, service date, description, or cost is missing.
- The fleet manager shall correct or remove maintenance entries when records need updating.
- Maintenance jobs shall be displayed in a dedicated list, separate from fuel logs.

### Links to fleet and scheduling

- Buses placed in **maintenance** status shall not be assignable to new trips until returned to available or in-service status.
- Analytics for a reporting period shall include fuel consumption trends, maintenance spend, and high-usage or high-cost vehicle indicators when fuel and maintenance records exist.
- Transport schedulers and depot managers shall view summary fuel and maintenance figures in analytics where their role permits.

---

## Dashboard

The depot dashboard gives administrators and depot managers a single operational picture at the start of the day and during service hours — replacing the need to open routes, fleet, and schedule screens separately to understand current depot health.

**Roles:** Administrator, Depot manager.

- The dashboard shall present a centralized summary of depot operations on one screen updated from the live database.
- The dashboard shall show how many routes are currently **active** and available for service.
- The dashboard shall display bus totals split by **available**, **in-service**, and **maintenance**, and further breakdown by service type (express, ordinary, semi-luxury) where applicable.
- The dashboard shall display driver totals split by **available**, **on-leave**, and **off-duty** so managers know staffing capacity.
- Buses in maintenance shall be highlighted on the dashboard together with recent workshop entries explaining why they are off the road.
- The dashboard shall list the most recent operational trips showing route name, assigned bus registration, assigned driver name, departure time, and current trip status.
- Trip status on the dashboard shall use colour-coded labels for **scheduled**, **on-time**, **delayed**, **completed**, and **cancelled** so managers can spot problems quickly during peak hours.
- KPI summary cards shall show total operational trips, number completed, and trip completion rate as a percentage when operational trips exist in the current data set.
- The dashboard shall automatically refresh key counts and the recent trips list at intervals during the working day so figures stay current without manual page reload.
- The dashboard shall rely on database records only; live GPS vehicle tracking is not required for this module.

---

## Reporting and Analytics

Reporting and analytics turn day-to-day operational data into management insight — trip performance, route reliability, fuel efficiency, and maintenance spend — and support export for depot meetings, audits, and further analysis.

**Roles:** Superadministrator, Administrator, Transport scheduler, Depot manager.

### On-screen analytics

- The user shall choose a reporting period as **weekly**, **monthly**, or a **custom** start-and-end date range.
- Custom date range selection shall require both start date and end date.
- Weekly and monthly periods shall be calculated from an anchor end date when no explicit start date is given.
- For the selected period, analytics shall calculate and display trip completion rates showing what proportion of planned services were completed successfully.
- Analytics shall evaluate route performance including delays, cancellations, and routes flagged as at-risk based on operational patterns in the period.
- Analytics shall chart fuel consumption trends per vehicle and across the fleet so unusually high consumption can be investigated.
- Analytics shall summarise fleet utilisation and total maintenance cost to support budget and sustainability review.
- Summary KPI cards and short narrative insights shall appear on screen so managers do not need to build spreadsheets manually to understand performance.

### Export

- The user shall download a formatted PDF operations report for the selected period suitable for printing or emailing to management.
- The PDF report shall include the period label, headline KPIs, a route performance table, and fuel trend summary.
- Administrators and depot managers shall export trip and operational data as CSV for analysis in Excel or other tools.
- Transport schedulers shall be able to generate PDF reports for periods they are permitted to view.

### Network-wide and depot-scoped views

- Superadministrators shall view analytics aggregated across all depots registered on the platform for island-wide oversight.
- Depot-level roles shall view analytics limited to that depot’s routes, fleet, schedules, and logs.

---

## System-Wide Access Control

TransitLK serves multiple roles with different responsibilities. Access control ensures each person sees only the modules and data appropriate to their job, both in the browser interface and on the server API.

| Role | Permitted modules |
|------|-------------------|
| Superadministrator | Administrator Management, Depot Management, Global Analytics |
| Administrator | Dashboard, Routes, Schedules, Fleet & Drivers, Users, Maintenance, Analytics |
| Transport scheduler | Routes, Schedules, Analytics |
| Fleet manager | Fleet & Drivers, Maintenance |
| Depot manager | Dashboard, Schedules (including approval), Analytics |
| Driver | My Trips |

- Modules not permitted for a role shall not appear in the sidebar navigation.
- Direct URL access to a restricted module shall be blocked in the browser and rejected by the API.
- After successful login, each role shall land on its primary workspace: superadministrator on Administrator Management; administrator and depot manager on Dashboard; transport scheduler on Routes; fleet manager on Fleet & Drivers; driver on My Trips.
- Every trip field change after approval shall be permanently recorded in adjustment history with the acting user, timestamp, reason, notes, and old versus new values.
- Deactivated user accounts, inactive routes, and cancelled trips shall remain in the database for audit trails, dispute resolution, and long-term performance reporting.
- The system shall maintain three separate account types — platform administrators, depot staff, and drivers — each with its own authentication path and permission set, reflecting the operational chain of command in a public transport depot.

---

## My Trips (Driver Portal)

My Trips is the driver-facing module of TransitLK. It gives each driver a clear, mobile-friendly view of their own upcoming and recent duties without exposing wider depot data they do not need.

**Roles:** Driver only.

- The driver shall sign in through the shared login page using the email and password configured on their driver record by the fleet manager.
- Signed-in drivers shall see only trips assigned to their own `driverId`; trips belonging to other drivers shall never appear in the list.
- Each listed trip shall show the route name, start and end points, trip date, departure and arrival times, assigned bus registration number, and current operational status.
- The screen layout shall remain readable on a smartphone or tablet browser so drivers can check duties without a desktop computer.
- Drivers shall not have buttons or API access to create, edit, submit, approve, reject, or delete timetable data.
- Trips in **draft** or **pending** status shall not appear in My Trips.
- Trips in **approved**, **scheduled**, **on-time**, **delayed**, or **completed** status shall be visible so the driver knows where to be, when, and in which vehicle.

---

*End of REQUIREMENT-M*
