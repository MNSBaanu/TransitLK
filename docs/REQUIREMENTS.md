# SRMSS — Software Requirements Specification

**Smart Route Management and Scheduling System (SRMSS)** for Public Transport Depots

| Document | Version 1 |
|----------|-----------|
| Module | CS6003 – Advanced Software Engineering (Coursework-1) |
| Status | Draft |
| Companion | [`REQUIREMENT-M.md`](./REQUIREMENT-M.md) — module-based requirements with implementation status |

---

## Table of contents

1. [Actors and role mapping](#actors-and-role-mapping)
2. [Functional requirements (user-wise)](#functional-requirements-user-wise)
3. [System requirements](#system-requirements)
4. [Hidden requirements](#hidden-requirements)
5. [Non-functional requirements](#non-functional-requirements)
6. [Domain requirements](#domain-requirements)
7. [Hardware requirements](#hardware-requirements)

---

## Actors and role mapping

The system defines five operational actors. These refine the coursework brief’s high-level access groups (administrators, supervisors, operational staff).

| Actor | Primary responsibility | Maps to coursework access group |
|-------|------------------------|--------------------------------|
| **Admin** | Users, permissions, master data, system-wide oversight | Administrator |
| **Transport Scheduler** | Routes, timetables, assignments, conflict resolution | Operational staff |
| **Fleet Manager** | Vehicles, fuel, maintenance, compliance | Operational staff |
| **Depot Manager** | Dashboard, approvals, overrides, depot performance | Supervisor |
| **Driver** | Assigned trips, acknowledgments, issue reporting | Operational (field) |

> **Implementation note:** The MERN prototype may use simplified JWT roles (`admin`, `supervisor`, `staff`) while this document defines logical actors for analysis, use cases, and RBAC design.

---

## Functional requirements (user-wise)

### Admin

| ID | Requirement |
|----|-------------|
| ADM-01 | **Create user accounts** by entering a full user profile, including username, password, role, depot assignment, and contact information. Account creation must be allowed only when the username is unique, all mandatory fields are filled, the selected role exists, and the target depot is active. After successful creation, the new account must become available for login according to the configured activation policy. |
| ADM-02 | **Edit user accounts** when personal details, depot allocation, or access level changes are required. Editing must be allowed only for active accounts or accounts that are not locked for security reasons. Any change to role or depot should be validated against permission rules before saving, and the previous values should remain traceable for audit purposes. |
| ADM-03 | **Deactivate user accounts** when an employee leaves the depot, changes role, or no longer requires access. Deactivation must be permitted only if the user is not the only active administrator for the depot and is not currently in the middle of a critical transaction. Once deactivated, the account must stop all login access while preserving historical records created by that user. |
| ADM-04 | **Assign, modify, or revoke permissions** for roles based on operational responsibility. Permission changes must be allowed only if the administrator has security authority and the changes do not remove the last remaining access path for essential administrative functions. Any permission update should apply to future access immediately and be recorded in the audit trail. |
| ADM-05 | **Create, edit, and archive master data** such as depots, route categories, vehicle types, fuel categories, and maintenance categories. Creation must be allowed only when the new code or name is unique, while editing must be allowed only if the record is not locked by active scheduling or reporting references. Hard deletion should be restricted; instead, records should be archived when historical data depends on them. |
| ADM-06 | **View all operational records** across depots, including routes, schedules, assigned buses, assigned drivers, fuel logs, maintenance logs, and trip summaries. Access to this information should be limited to authorized administrative use, and records should be filtered by depot, date range, or operational category to support oversight. |
| ADM-07 | **Generate administrative and system-wide reports** such as user activity, schedule changes, route usage, maintenance history, and depot-level summaries. Report generation should be available only when the requested data set is within the user’s access scope and all relevant records have been finalized or approved. |
| ADM-08 | **Manage backup and restore activities** for the application database and configuration data. Backup creation should be allowed only when the storage destination is available, while restore should require confirmation and should be restricted to authorized personnel because it affects all operational data. |

---

### Transport Scheduler

| ID | Requirement |
|----|-------------|
| SCH-01 | **Create route schedules** for daily, weekly, and monthly operations by selecting a route, date, departure time, arrival time, bus, and driver. Schedule creation must be allowed only when the selected bus is available, the driver has a valid license, and the assignment does not overlap with another active trip. The scheduler should be able to save the schedule as a draft first if approval is required before publication. |
| SCH-02 | **Modify an existing schedule** when route timing, vehicle allocation, or driver allocation needs to change. Editing must be permitted only before the trip has started or before the schedule becomes locked by the operational policy. Every edit should trigger a new conflict check so that the revised schedule does not create overlaps, duty-hour violations, or maintenance conflicts. |
| SCH-03 | **Cancel a scheduled trip** when service cannot be operated because of maintenance, road closure, lack of staff, or emergency disruption. Cancellation must require a valid reason, and the trip should be marked as cancelled rather than removed if it has already been visible to other users or included in reports. |
| SCH-04 | **Detect and resolve scheduling conflicts** involving the same bus, the same driver, or the same route time window. Conflict resolution must be allowed only when the scheduler has permission to override a draft or resubmit the schedule with corrected values. If a conflict is detected, the scheduler should be shown the exact reason so that a suitable replacement can be chosen. |
| SCH-05 | **Assign buses and drivers** to planned trips based on availability, capacity, route suitability, and duty limits. Assignment must be blocked if the bus is under maintenance, the driver’s license is expired, or the driver has exceeded permitted working hours. If a replacement is selected, the schedule should be revalidated before saving. |
| SCH-06 | **Reassign** an already planned bus or driver when a disruption occurs. Reassignment must be allowed only if the replacement resource is free for the required time slot and does not create a new overlap elsewhere in the timetable. The original assignment should remain traceable so that changes can be reviewed later. |
| SCH-07 | **Publish approved schedules** so that operational users can see them. Publication must be allowed only after required reviews are completed and the schedule passes all validation checks. Once published, affected users should receive a change notification if the schedule is later updated. |
| SCH-08 | **View schedule status** such as draft, pending approval, approved, active, delayed, completed, or cancelled. Status updates must reflect the actual lifecycle of the trip and should only be changed by users with the required authority or by automated trip events. |

---

### Fleet Manager

| ID | Requirement |
|----|-------------|
| FLT-01 | **Register new vehicles** with details such as registration number, chassis or fleet number, seating capacity, mileage, depot allocation, and service category. Vehicle registration must be allowed only when the registration number is unique and mandatory identification fields are complete. Once saved, the vehicle should become available for operational tracking and assignment. |
| FLT-02 | **Edit vehicle details** when registration data, capacity, depot location, or service information changes. Editing must be allowed only if the vehicle is active or not locked by a disposal process. Fields that affect historical records, such as fleet number or registration identity, should be modified only if policy allows and the change is fully traceable. |
| FLT-03 | **Mark vehicle status** as available, unavailable, under maintenance, or out of service. Status changes must be allowed only when the vehicle’s current operational state supports the change. For example, a vehicle should not be marked available if an open maintenance record still exists or if a safety issue has not been cleared. |
| FLT-04 | **Record fuel consumption** for a vehicle by capturing the date, quantity, cost, odometer reading, route reference, and remarks. Fuel entry must be allowed only when the vehicle is registered and the odometer reading is not lower than the previous accepted value unless a correction is authorized. Duplicate entries for the same fuel event should be prevented. |
| FLT-05 | **Log preventive and corrective maintenance** activities. A maintenance record should be created only when the vehicle exists in the database and the maintenance type, date, and service details are provided. Once a maintenance record is opened, the vehicle should be blocked from route assignment until it is cleared or closed. |
| FLT-06 | **Schedule future servicing or inspections** based on mileage, elapsed time, or service history. Scheduling must be allowed only if the vehicle is active and the planned maintenance date does not conflict with an existing service booking. The system should warn the fleet manager if a vehicle is nearing its next maintenance threshold. |
| FLT-07 | **Review maintenance history and fuel trends** for a selected vehicle or group of vehicles. Access should be limited to vehicles within the manager’s operational scope, and historical data should remain available even if the vehicle is later archived. |
| FLT-08 | **Prevent route allocation** for vehicles that fail compliance checks, have expired inspections, or have unresolved repair records. The vehicle should remain blocked until the compliance issue is cleared and the status is updated by an authorized maintenance action. |

---

### Depot Manager

| ID | Requirement |
|----|-------------|
| DMG-01 | **View the full depot operations dashboard** showing active buses, available drivers, route status, delayed trips, completed trips, maintenance alerts, and fuel summaries. Access to the dashboard must be limited to the depot under the manager’s control, and data should update based on the latest operational events. |
| DMG-02 | **Approve schedules** before they are released for use. Approval must be allowed only when the schedule contains no route conflict, no driver duty-hour violation, and no vehicle allocation problem. If any rule fails, approval should be blocked and the schedule should be returned for correction. |
| DMG-03 | **Reject or return a schedule** for revision when planning is incomplete or operationally unsafe. Rejection should require a reason, and the rejected schedule should remain stored so the original draft can be reviewed later. The manager should be able to direct it back to the Transport Scheduler for correction. |
| DMG-04 | **Override a schedule in emergencies** such as vehicle failure, accident, severe delay, or service shortage. Override must be allowed only with a recorded justification and only by authorized managerial users. The original plan and the replacement action should both remain visible in the record history. |
| DMG-05 | **Reassign buses or drivers** during operational disruptions. Reassignment must be permitted only when the alternative resource is available, compliant, and not already assigned elsewhere. The manager should not be able to force a reassignment that creates another conflict unless emergency override permission is available. |
| DMG-06 | **Monitor trip progress and completion status**. Monitoring should allow the manager to see whether a trip is on time, delayed, cancelled, or completed, and trip state changes should occur only through valid operational events or authorized updates. |
| DMG-07 | **Review depot-level performance information** such as vehicle utilization, route completion rate, fuel efficiency, delay count, and maintenance downtime. Access should be restricted to the depot’s own records unless higher-level authority is granted. |
| DMG-08 | **Receive and act on alerts** related to delay, conflict, expired license, overdue maintenance, or underutilized vehicles. Alerts should appear only when predefined operational conditions are triggered, and the manager should be able to acknowledge, escalate, or resolve them. |

---

### Driver

| ID | Requirement |
|----|-------------|
| DRV-01 | **View assigned trips**, route details, departure time, arrival time, and assigned vehicle information. Access must be limited to the driver’s own duty roster or to assignments explicitly shared by an authorized user. |
| DRV-02 | **View route changes or schedule updates** when a trip is rescheduled, cancelled, or reassigned. Notifications should be shown only after the change has been approved, and the driver should be able to see both the new assignment and the reason for change if permitted. |
| DRV-03 | **Acknowledge a trip assignment** after reviewing the route and timing. Acknowledgment must be allowed only while the assignment is still active and before the trip is completed or cancelled. The acknowledgment should be recorded with the driver identity and timestamp. |
| DRV-04 | **Report operational issues** such as delays, breakdowns, route obstruction, passenger incidents, or inability to continue service. The report must be allowed only for the trip currently assigned to that driver, and the driver should be required to choose an issue type and add remarks before submission. |
| DRV-05 | **View personal duty history and working-hour information**. Access should be restricted to the driver’s own records, and the displayed data should reflect approved assignments only. |
| DRV-06 | **Confirm trip completion** when the route has ended successfully. Completion confirmation must be allowed only after the trip reaches the final stage and should not be accepted for future or cancelled trips. |

---

## System requirements

### 1. Application deployment environment

- The SRMSS shall be deployed as a **web-based application** accessible through a browser. This allows depot staff to use the same platform from different office computers without installing a separate desktop application.
- Deployment shall support a **centralized server model**. Route data, schedules, vehicle records, and reports must remain synchronized across all users and depots.
- The application shall be deployable in a **secure hosting environment** (on-premise server, cloud server, or hybrid setup) depending on organizational policy, to support scaling across multiple depots.

### 2. Server requirements

- The application server shall provide sufficient **processing power** for concurrent access by administrators, schedulers, fleet managers, depot managers, and drivers.
- The server shall provide adequate **memory** for active sessions, dashboard loading, scheduling validation, and report generation.
- The server shall include sufficient **storage** for current operational data and historical records (schedules, logs, maintenance history, audit trails).
- The server shall support **secure backup and recovery** procedures.

### 3. Database requirements

- The SRMSS shall use a **relational database** to store users, depots, routes, schedules, vehicles, drivers, fuel logs, maintenance records, and reports (linked records via keys and dependencies).
- The database shall support **transaction handling** so schedule saves, route updates, or vehicle status changes complete fully or not at all.
- The database shall support **indexing and optimized querying** for route search, conflict checks, and report generation.
- The database shall support **regular backups, restoration, and long-term archival** of historical records and audit trails.

> **Implementation note:** The TransitLK prototype uses **MongoDB** (document store). The coursework design may specify relational storage; align the final report diagram with the chosen deployment or document this as a design trade-off.

### 4. Operating system requirements

- The server shall run on a **stable server-grade operating system** supporting web hosting, database services, and secure access control.
- Client machines shall run a **modern OS** capable of up-to-date web browsers.
- The environment shall support **security updates**, user authentication, and network communication.

### 5. Browser requirements

- The application shall be accessible through **modern browsers** (e.g. Chrome, Edge, Firefox).
- The browser shall support **HTML5, CSS3, and JavaScript** for dashboards, forms, validation, and schedule checking.
- The browser shall support **HTTPS** for secure transmission of credentials and operational data.
- The interface shall display correctly on **common office screen resolutions**.

### 6. Network requirements

- The network shall provide **reliable connectivity** between clients and the application server.
- The network shall have sufficient **bandwidth** for dashboards, report downloads, and map-based route viewing.
- The network shall support **secure communication paths** for multi-depot or remote access.
- **Network latency** shall be low enough for responsive scheduling and operational monitoring.

### 7. Client device requirements

- Depot office users shall use **desktop or laptop** computers with sufficient capacity for browser-based scheduling and reporting.
- **Driver-facing access**, if provided, shall work on mobile devices or small-screen browsers.
- Client devices shall have sufficient memory and storage for stable browser operation.
- **Keyboard and mouse** for administrative users; **touch support** optional for mobile driver access.

### 8. Security infrastructure requirements

- The deployment environment shall support **SSL/TLS encryption** for all application traffic.
- The environment shall support **role-based access control** and secure authentication at login.
- The system shall support **audit logging** and secure log storage.
- The environment shall support **regular patching** and security updates.

### 9. Map and external service requirements

- If route visualization uses an external map service, the environment shall support **internet access** for map requests.
- The application shall communicate with **external APIs securely** when integrations are enabled.
- If external services are unavailable, **core scheduling and record management** shall remain functional.

### 10. Performance support requirements

- The deployment environment shall handle simultaneous dashboard access, schedule validation, and report generation without unstable behavior.
- Server resources shall be sized for growth in users, routes, vehicles, and historical logs.
- The environment may support **caching or optimization** for frequent queries.
- Infrastructure shall prevent bottlenecks during peak periods (e.g. morning departures, monthly reporting).

### 11. Maintenance and support requirements

- The environment shall support **application updates** without extended disruption for all users.
- The deployment setup shall allow **database backups, patching, and rollback** on failed updates.
- The system shall be **supportable** by technical administrators monitoring server health, storage, and logs.
- The environment shall allow future modules (e.g. live GPS, SMS notifications) with minimal restructuring.

---

## Hidden requirements

Requirements implied by depot practice but not always stated explicitly in the case study.

### 1. Ease of adoption by non-technical users

- The interface should be easy enough for clerks, supervisors, and managers accustomed to manual records or spreadsheets.
- Menus, forms, and labels should use **familiar transport terminology** so users do not translate system language before acting.

### 2. Minimal training requirement

- The application should be usable after **short training sessions**.
- Common tasks (route entry, schedule creation, driver assignment, maintenance logging) should follow a **simple, repeatable workflow**.

### 3. Data migration from manual records

- Existing **paper records and spreadsheet data** should be transferable into the system.
- Imported data should be **cleaned and validated** before acceptance (e.g. duplicate vehicle numbers, missing license details).

### 4. Historical record retention

- Old schedules, cancelled trips, maintenance logs, and user activity should remain available for **disputes, audits, performance reviews, and planning**.
- Records should not disappear when no longer active; the system must support **long-term operational memory**.

### 5. Role separation and operational authority

- Each user role should only see functions matching **real-world responsibility** (admin → access; scheduler → timetables; fleet manager → vehicles; depot manager → supervision; driver → assigned duties).
- **Approval-sensitive actions** require the correct authority (e.g. scheduler prepares timetable; depot manager approves), reflecting depot chain of command.

---

## Non-functional requirements

| ID | Category | Requirement | Rationale |
|----|----------|-------------|-----------|
| NFR-01 | **Performance** | The system should provide fast response times for route planning, scheduling, and dashboard updates. | Real-time trip status and scheduling affect operational decisions; slow response delays depot actions. |
| NFR-02 | **Flexibility** | The system should allow easy schedule updates for emergencies, maintenance, or unexpected events. | Transport operations are dynamic; the case study requires schedule adjustments without breaking workflows. |
| NFR-03 | **Reliability** | The system must provide accurate and consistent data (routes, schedules, fuel logs, reports). | Incorrect data causes wrong scheduling and resource mismanagement; dashboard statuses must be trustworthy. |
| NFR-04 | **Usability** | The system should be user-friendly for depot staff and managers. | Users may not be highly technical; poor usability increases errors and reduces adoption. |
| NFR-05 | **Scalability** | The system should support increasing numbers of routes, vehicles, and users. | Supports future growth without full system redesign. |
| NFR-06 | **Security** | Role-based access control and authentication. | Prevents unauthorized access to sensitive operational and personal data. |

---

## Domain requirements

Business rules derived from public transport depot operations and the SRMSS case study.

| ID | Requirement |
|----|-------------|
| DOM-01 | Routes must include **start point, end point, stops, and distance**. |
| DOM-02 | Scheduling must **avoid time conflicts and overlaps** (bus, driver, route window). |
| DOM-03 | Vehicles must maintain **fuel consumption and maintenance records**. |
| DOM-04 | Drivers must have **valid license** and **availability / working-hours** tracking. |
| DOM-05 | Dashboard must display **real-time operational status** (e.g. on-time, delayed, completed). |
| DOM-06 | Reports must support **performance analysis and decision-making** (exportable where required). |

---

## Hardware requirements

| Component | Requirement |
|-----------|-------------|
| **Application server** | Multi-core CPU, sufficient RAM for concurrent users, sessions, validation, and reporting; disk storage for operational and historical data and backups. |
| **Database server** | Storage and I/O suitable for transactional writes, indexed queries, and backup retention (may be co-located with app server in small deployments). |
| **Client workstations** | Desktop or laptop with modern browser, keyboard/mouse, display suitable for scheduling and dashboard use. |
| **Driver devices (optional)** | Smartphone or tablet with mobile browser and network connectivity for roster and notifications. |
| **Network** | Stable LAN/WAN or internet with bandwidth for HTTPS, dashboards, reports, and optional map API calls. |

---

*End of Requirements — Version 1*
