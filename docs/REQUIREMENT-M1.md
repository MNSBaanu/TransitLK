# SRMSS — System, Non-Functional, Domain and Hidden Requirements (REQUIREMENT-M1)

**Product:** TransitLK — Smart Route Management and Scheduling System

---

## 1. System requirements

Detailed descriptions of the system's functions, services, and operational constraints that define what should be implemented.

### 1.1 Application and deployment

- SRMSS shall be a web-based application accessible through a browser so depot staff do not install a separate desktop program on each computer.
- The system shall use a centralized server model so routes, schedules, vehicles, drivers, fuel logs, maintenance records, and reports remain synchronized for all authorised users.
- The system shall be deployable in a secure hosting environment (cloud, on-premise, or hybrid) to support growth across multiple depots.

### 1.2 Application server

- The server shall support concurrent use by administrators, transport schedulers, fleet managers, depot managers, and drivers.
- The server shall handle active sessions, dashboard loading, schedule conflict validation, and report generation under expected load.
- The server shall support backup and recovery of operational data.

### 1.3 Data storage

- The system shall maintain a central store for users, administrators, depots, routes, schedules, buses, drivers, fuel logs, and maintenance records.
- Related records shall remain linked so reports and screens show consistent information.
- Invalid or incomplete data shall be rejected before acceptance.
- Frequently used lookups shall remain efficient as data volume grows.
- Historical schedules and logs shall be retained for long-term reference.

### 1.4 Client platform

**Server**

- A stable server-grade operating system with security updates, suitable for hosting the application and database.

**Office users (administrator, transport scheduler, fleet manager, depot manager)**

- A modern desktop or laptop with a current web browser, keyboard, and pointer device.

**Drivers**

- A smartphone or tablet with a mobile browser for viewing assigned trips.

### 1.5 Browser

- The application shall run on modern browsers such as Chrome, Edge, or Firefox.
- The browser shall support interactive web pages for forms, tables, dashboards, and timetables.
- Production use shall employ HTTPS to protect sign-in and operational data.
- The interface shall be usable on office monitors and smaller mobile screens.

### 1.6 Network

- Reliable connectivity between client devices and the hosted system during depot operating hours.
- Sufficient bandwidth for dashboard refresh, report downloads, and map-based route viewing.
- Encrypted communication for access from multiple office or remote locations.
- Low enough latency for responsive saving of trips and conflict checking.

### 1.7 Security

- SSL/TLS encryption for all production traffic.
- Sign-in required for every user; deactivated depot staff cannot access the system.
- Role-based access so each role reaches only permitted modules.
- Traceability of schedule changes through recorded adjustment history.
- Regular patching of server and application components.

### 1.8 External map service

- Optional online map service (e.g. Google Maps) for visual route planning and stop selection when internet access is available.
- Core scheduling and record-keeping shall remain available if maps are unavailable.

### 1.9 Maintenance and support

- Application and database updates with limited downtime.
- Backup, patching, and rollback capability after failed releases.
- Monitoring of service health, storage, and errors by technical administrators.
- Architecture that allows future extensions (e.g. live tracking, notifications) without replacing the whole platform.

### 1.10 Hardware

- Server or database hosting with adequate storage and separate backup capability.
- Office computers for administrative and planning staff.
- Mobile device for drivers viewing duties.
- Stable internet or organisational network connection.
- Power backup (UPS) recommended for local office equipment.
- Printer optional for timetables and reports where hard copies are required.

---

## 2. Non-functional requirements

Constraints on the services or functions offered by the system, including performance, reliability, security, usability, and other quality attributes.

### 2.1 Performance

- Route planning, schedule saving, conflict checking, and dashboard refresh shall be responsive enough for day-to-day depot decisions.
- Weekly and monthly reporting and PDF or CSV export shall complete within acceptable time during routine and peak use.

### 2.2 Flexibility

- Schedules shall be adjustable for emergencies, maintenance, absence, and obstructions without breaking the planning process.
- Routes and fleet status shall reflect changing operations while preserving history.

### 2.3 Reliability

- Routes, schedules, fuel logs, maintenance entries, and report figures shall be accurate and consistent from a single central store.
- Validation rules shall prevent invalid assignments such as double-booked buses or drivers.

### 2.4 Usability

- Depot staff and managers with mixed technical experience shall use the system through clear navigation and role-based menus.
- On-screen terminology shall match depot practice (route, trip, fleet, depot).
- Map-assisted planning shall assist users without blocking manual route entry.

### 2.5 Scalability

- The system shall support growth in routes, vehicles, users, depots, and historical records without a full redesign.

### 2.6 Security

- Only authenticated users shall access the system; each role shall see only permitted functions.
- Passwords shall be stored securely and production traffic shall be encrypted.

### 2.7 Testing

- Each implemented module shall be tested before release using structured test cases (e.g. black-box testing against role permissions and expected inputs/outputs, and white-box testing of validation and conflict rules where appropriate).
- Tests shall cover sign-in, role-based access, route and schedule workflows, fleet and maintenance logging, dashboard figures, and report export.
- Failed tests shall be recorded and corrected before the module is accepted for coursework submission.

---

## 3. Domain requirements

Requirements and constraints that originate from the system's operational domain and must be satisfied for the system to function correctly.

- A route shall include start point, end point, intermediary stops, and distance.
- Only active routes shall be used when building new trips.
- Scheduling shall prevent overlapping use of the same bus or driver on the same day.
- Trip planning shall respect vehicle availability (including maintenance) and driver availability and working hours.
- Each vehicle shall have registration, capacity, and status suitable for assignment.
- Each driver shall have licence information (including optional expiry date) and availability suitable for assignment; expired licences shall not be assigned once enforcement is enabled.
- Fuel consumption and maintenance work shall be recorded per vehicle.
- The depot dashboard shall show operational trip status and fleet summaries for managers.
- Timetable approval shall follow depot authority: planners prepare; managers approve or return with reason.
- Reports shall support analysis of completion rates, delays, cancellations, route performance, and fuel trends.
- Changes to live trips shall remain traceable for operational review.
- Cancelled and past trips shall remain available for audit and performance review.

---

## 4. Hidden requirements

Assumed requirements that are not explicitly stated by stakeholders but are necessary for the effective, secure, and reliable operation of the system.

### 4.1 Ease of adoption by non-technical users

- Clerks, supervisors, and managers accustomed to manual registers or spreadsheets shall learn the system without specialist IT training.
- Screens shall use everyday transport language rather than technical jargon.

### 4.2 Minimal training requirement

- Route entry, scheduling, assignments, fuel logging, and maintenance logging shall follow short, repeatable workflows.
- Each role shall open on a sensible home screen suited to that role’s duties.

### 4.3 Data migration from manual records

- Existing paper or spreadsheet data for routes, vehicles, drivers, and schedules shall eventually be transferable without full manual re-entry.
- In the current release, depot staff enter data through the application forms; bulk spreadsheet import by users is planned for a later phase.
- Any imported or migrated data shall be validated for duplicates and errors before entering live use.

### 4.4 Historical record retention

- Old schedules, cancelled trips, maintenance logs, and inactive routes shall remain available for audits, disputes, and planning reviews.
- Deactivating a user or route shall not erase historical records tied to that entity.

### 4.5 Role separation and operational authority

**Superadministrator**

- Governs platform administrators, depot registry, and network-level reporting.

**Administrator**

- Manages depot staff accounts and depot operational modules.

**Transport scheduler**

- Prepares routes and timetables and submits them for approval.

**Fleet manager**

- Maintains vehicle and driver records, fuel logs, and maintenance logs.

**Depot manager**

- Supervises operations via the dashboard, approves or rejects timetables, and uses analytics.

**Driver**

- Views assigned duties only; does not alter depot-wide schedules.

- The chain of command (prepare → approve → operate) shall be reflected in permissions and the trip approval workflow.
