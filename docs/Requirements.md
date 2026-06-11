# SRMSS — System, Non-Functional, Domain and Hidden Requirements (REQUIREMENT-M1)

**Product:** TransitLK — Smart Route Management and Scheduling System

---

## 1. System requirements

Infrastructure, platform, and environmental constraints that TransitLK (SRMSS) needs to operate correctly. The coursework build runs as a **local MERN application** for development and demonstration; the requirements below also describe the **intended production-ready** deployment model.

| # | Category |
|---|----------|
| 1.1 | Application deployment environment |
| 1.2 | Server requirements |
| 1.3 | Database requirements |
| 1.4 | Operating system requirements |
| 1.5 | Browser requirements |
| 1.6 | Network requirements |
| 1.7 | Client device requirements |
| 1.8 | Security infrastructure requirements |
| 1.9 | Map and external service requirements |
| 1.10 | Performance support requirements |
| 1.11 | Maintenance and support requirements |

### 1.1 Application deployment environment

- SRMSS shall be a **web-based application** accessible through modern browsers without installing a separate desktop client on each workstation.
- The system shall use a **centralised server model** (Express API + MongoDB) so routes, schedules, fleet, fuel logs, maintenance records, and reports stay synchronised for all authorised users.
- The architecture shall support **centralised deployment** for consistent data management across depot offices.
- The system shall be **deployable on cloud, on-premise, or hybrid** hosting when moved beyond the local development environment.
- For coursework delivery, the system shall run on the developer machine (Node.js server, MongoDB, React/Vite client); live cloud hosting is excluded from the current release.

### 1.2 Server requirements

- The application server shall support **concurrent access** by administrators, transport schedulers, fleet managers, depot managers, and drivers.
- The server shall provide adequate **processing power, memory, and storage** for API requests, JWT sessions, schedule conflict validation, dashboard aggregation, and report generation.
- The server shall expose a **REST API** (Express on Node.js 18+) consumed by the React frontend.
- The server shall support **backup and disaster recovery** procedures for operational data in a production environment.
- Minimum development setup: Node.js 18+, npm, and a running Express instance (default port 5000).

### 1.3 Database requirements

- The system shall use **MongoDB** as the central data store for users, depots, routes, schedules, buses, drivers, fuel logs, maintenance records, and notifications.
- The database shall store **operational and historical** records (e.g. past trips, adjustment history, logs) for reporting and audit.
- The database shall support **document relationships, indexing, and optimised queries** so list screens and reports remain efficient as data volume grows.
- The database shall support **backup, restoration, and archival** of depot data in a production environment.
- Invalid or incomplete records shall be **rejected at the API layer** before persistence.

### 1.4 Operating system requirements

**Server**

- A secure, stable **server-grade operating system** (e.g. Windows Server, Linux) with regular security updates, suitable for hosting Node.js and MongoDB.

**Client**

- Modern **desktop or mobile operating systems** (Windows, macOS, Android, iOS) that support current web browsers.
- The OS shall provide networking, authentication integration where required, and access to security updates.

### 1.5 Browser requirements

- The application shall be compatible with **Chrome, Edge, Firefox**, and other modern browsers (current stable versions).
- Browsers shall support **HTML5, CSS3, and JavaScript** for interactive forms, tables, dashboards, and timetables.
- **HTTPS** shall be used in production to protect sign-in credentials and operational data.
- The interface shall display correctly on standard office monitors and smaller mobile screens used by drivers.

### 1.6 Network requirements

- Client devices shall have **reliable and secure connectivity** to the application server during depot operating hours.
- The network shall provide **sufficient bandwidth** for dashboard refresh, report downloads (PDF/CSV), and map-based route viewing.
- Communication between client and server shall be **encrypted** (HTTPS/TLS) in production.
- Network latency shall remain **low enough** for responsive trip saving, conflict checking, and approval workflows.

### 1.7 Client device requirements

**Administrative and planning users** (administrator, transport scheduler, fleet manager, depot manager)

- **Desktop or laptop** with a current web browser, keyboard, and pointer device.
- Adequate memory and storage for browser-based dashboards and reports.

**Drivers**

- **Smartphone or tablet** with a mobile browser for viewing assigned trips (My Trips).
- Adequate input capability for trip status updates and issue reporting.

**Optional**

- Printer for hard-copy timetables or reports where required.
- UPS recommended for local office equipment in on-premise deployments.

### 1.8 Security infrastructure requirements

- **SSL/TLS encryption** shall protect all production traffic between browsers and the API.
- **Authentication** (email/password, JWT session) shall be required for every user; deactivated accounts shall be denied access.
- **Role-based access control (RBAC)** shall restrict UI modules and API endpoints by role (superadministrator, administrator, transport scheduler, fleet manager, depot manager, driver).
- Passwords shall be stored using **secure hashing** (bcrypt).
- **Audit traceability** shall be supported through schedule adjustment history and operational logs.
- Server and dependency **security updates** shall be applied regularly in production.

### 1.9 Map and external service requirements

- The system shall support integration with **map services and external APIs** (e.g. Google Maps for route planning, stop selection, and distance).
- Map integration shall be **optional**; manual coordinate and stop entry shall remain available when the map service or API key is unavailable.
- **Core scheduling, fleet, and record-keeping** shall continue to function without external map services.
- External links (e.g. fuel price references) shall open in a separate context and shall not block core depot workflows if unreachable.

### 1.10 Performance support requirements

- The system shall handle **simultaneous users** and day-to-day depot activities (planning, approvals, fleet updates, reporting) without unacceptable delay.
- The architecture shall support **future growth** in users, routes, vehicles, depots, and historical records through modular MERN APIs and MongoDB indexing.
- The system shall use **validation and conflict-detection** at the server to prevent overlapping bus or driver assignments.
- List views, dashboards, and exports shall use **efficient queries and client-side filtering** where appropriate to maintain responsiveness.

### 1.11 Maintenance and support requirements

- The system shall support **application updates, database backups, recovery, and rollback** procedures in production.
- Administrators shall be able to **monitor** service health, storage use, and errors through server and database tooling.
- The **modular three-tier design** (React client, Express API, MongoDB) shall allow future enhancements—additional modules, depots, notifications, or live tracking—with minimal restructuring of the core platform.
- Development and testing shall be supported through **version control (GitHub)**, local environment configuration (`.env`), and API verification (e.g. Postman).

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
