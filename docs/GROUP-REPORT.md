# Cover Page

<!-- Insert: Module name, coursework title, group members (ID, Surname, First name), submission date -->

---

# Acknowledgement

<!-- Insert acknowledgement text -->

---

# Abstract

<!-- 150 – 200 words -->

---

# Table of Contents

<!-- Auto-generate when exporting to Word/PDF, or list sections manually -->

---

# Table of Figures

<!-- List figure numbers and captions -->

---

# Table of Tables

<!-- List table numbers and captions -->

---

# Introduction

## Background of the problem / Project motivation / Objectives and scope

<!-- Insert introduction content -->

---

# Project Planning & Analysis

## Methodology & Justification

Agile methodology is selected for this project because it supports iterative and incremental development, which is suitable for a system with multiple modules such as routing, scheduling, fleet management, and analytics.

Since the project must be completed within a limited timeframe of one month, Agile allows the work to be divided into manageable sprints, ensuring steady progress and better time management. It also enables team members to work on different modules simultaneously, improving collaboration and efficiency.

Additionally, Agile provides flexibility to accommodate changes during development and supports continuous testing, helping to identify and fix issues early. Therefore, Agile is an appropriate choice as it ensures organized development, reduces risks, and improves overall system quality.

## Project timeline

See **[`AGILE-TIMELINE.md`](./AGILE-TIMELINE.md) — Section 1** for the sprint-based timeline (discussion **6 May**, development **7 May – 7 June**, submission **8 June 2026**).

## Work Break-down (Agile Gantt Chart)

> Waterfall-style charts (all design → all backend → all frontend → documentation) are **not** used because the project follows **Agile**.  
> Development Gantt excludes documentation tasks (report, diagram finalization).

See **[`AGILE-TIMELINE.md`](./AGILE-TIMELINE.md) — Sections 4–7** for the Agile Gantt (Mermaid + onlinegantt task list). Export the Mermaid chart or rebuild it in onlinegantt.com.

<!-- Insert exported Agile Gantt image here -->

## Responsibilities

<!-- Insert team responsibilities -->

## Risk Analysis

<!-- Insert risk analysis -->

---

# System/Software requirements analysis and specification

## System Overview

The proposed system is a Smart Route Management and Scheduling System (SRMSS) designed to manage transport operations efficiently. It provides functionalities for route planning, scheduling, fleet management, monitoring, and reporting. The system centralizes operations, reduces manual work, and improves decision-making through real-time data and analytics.

## Stakeholder Analysis

| Stakeholder | Role | Involvement | Responsibilities | System Interaction |
|-------------|------|-------------|------------------|-------------------|
| Admin | System Controller | High | Manage users, monitor system, access all modules | Full system access |
| Transport Scheduler | Planner | High | Create routes, assign schedules | Uses Route & Schedule modules |
| Fleet Manager | Resource Manager | High | Manage drivers, vehicles, maintenance, fuel | Uses Fleet modules |
| Depot Manager | Operations Supervisor | Medium-High | Monitor operations, analyze performance | Uses Dashboard & Reports |
| Drivers | End User | Low | View assigned routes and schedules | Limited (view only) |

---

## Requirements - Version 1

### Functional Requirements (User-wise)

#### Admin

- Create user accounts by entering a full user profile, including username, password, role, depot assignment, and contact information. Account creation must be allowed only when the username is unique, all mandatory fields are filled, the selected role exists, and the target depot is active. After successful creation, the new account must become available for login according to the configured activation policy.
- Edit user accounts when personal details, depot allocation, or access level changes are required. Editing must be allowed only for active accounts or accounts that are not locked for security reasons. Any change to role or depot should be validated against permission rules before saving, and the previous values should remain traceable for audit purposes.
- Deactivate user accounts when an employee leaves the depot, changes role, or no longer requires access. Deactivation must be permitted only if the user is not the only active administrator for the depot and is not currently in the middle of a critical transaction. Once deactivated, the account must stop all login access while preserving historical records created by that user.
- Assign, modify, or revoke permissions for roles based on operational responsibility. Permission changes must be allowed only if the administrator has security authority and the changes do not remove the last remaining access path for essential administrative functions. Any permission update should apply to future access immediately and be recorded in the audit trail.
- Create, edit, and archive master data such as depots, route categories, vehicle types, fuel categories, and maintenance categories. Creation must be allowed only when the new code or name is unique, while editing must be allowed only if the record is not locked by active scheduling or reporting references. Hard deletion should be restricted; instead, records should be archived when historical data depends on them.
- View all operational records across depots, including routes, schedules, assigned buses, assigned drivers, fuel logs, maintenance logs, and trip summaries. Access to this information should be limited to authorized administrative use, and records should be filtered by depot, date range, or operational category to support oversight.
- Generate administrative and system-wide reports such as user activity, schedule changes, route usage, maintenance history, and depot-level summaries. Report generation should be available only when the requested data set is within the user’s access scope and all relevant records have been finalized or approved.
- Manage backup and restore activities for the application database and configuration data. Backup creation should be allowed only when the storage destination is available, while restore should require confirmation and should be restricted to authorized personnel because it affects all operational data.

Enables administrators to create, modify, and manage routes with defined start and end points, intermediary stops, and total distance

#### Transport Scheduler

- Create route schedules for daily, weekly, and monthly operations by selecting a route, date, departure time, arrival time, bus, and driver. Schedule creation must be allowed only when the selected bus is available, the driver has a valid license, and the assignment does not overlap with another active trip. The scheduler should be able to save the schedule as a draft first if approval is required before publication.
- Modify an existing schedule when route timing, vehicle allocation, or driver allocation needs to change. Editing must be permitted only before the trip has started or before the schedule becomes locked by the operational policy. Every edit should trigger a new conflict check so that the revised schedule does not create overlaps, duty-hour violations, or maintenance conflicts.
- Cancel a scheduled trip when service cannot be operated because of maintenance, road closure, lack of staff, or emergency disruption. Cancellation must require a valid reason, and the trip should be marked as cancelled rather than removed if it has already been visible to other users or included in reports.
- Detect and resolve scheduling conflicts involving the same bus, the same driver, or the same route time window. Conflict resolution must be allowed only when the scheduler has permission to override a draft or resubmit the schedule with corrected values. If a conflict is detected, the scheduler should be shown the exact reason so that a suitable replacement can be chosen.
- Assign buses and drivers to planned trips based on availability, capacity, route suitability, and duty limits. Assignment must be blocked if the bus is under maintenance, the driver’s license is expired, or the driver has exceeded permitted working hours. If a replacement is selected, the schedule should be revalidated before saving.
- Reassign an already planned bus or driver when a disruption occurs. Reassignment must be allowed only if the replacement resource is free for the required time slot and does not create a new overlap elsewhere in the timetable. The original assignment should remain traceable so that changes can be reviewed later.
- Publish approved schedules so that operational users can see them. Publication must be allowed only after required reviews are completed and the schedule passes all validation checks. Once published, affected users should receive a change notification if the schedule is later updated.
- View schedule status such as draft, pending approval, approved, active, delayed, completed, or cancelled. Status updates must reflect the actual lifecycle of the trip and should only be changed by users with the required authority or by automated trip events.

#### Fleet Manager

- Register new vehicles with details such as registration number, chassis or fleet number, seating capacity, mileage, depot allocation, and service category. Vehicle registration must be allowed only when the registration number is unique and mandatory identification fields are complete. Once saved, the vehicle should become available for operational tracking and assignment.
- Edit vehicle details when registration data, capacity, depot location, or service information changes. Editing must be allowed only if the vehicle is active or not locked by a disposal process. Fields that affect historical records, such as fleet number or registration identity, should be modified only if policy allows and the change is fully traceable.
- Mark a vehicle as available, unavailable, under maintenance, or out of service. Status changes must be allowed only when the vehicle’s current operational state supports the change. For example, a vehicle should not be marked available if an open maintenance record still exists or if a safety issue has not been cleared.
- Record fuel consumption for a vehicle by capturing the date, quantity, cost, odometer reading, route reference, and remarks. Fuel entry must be allowed only when the vehicle is registered and the odometer reading is not lower than the previous accepted value unless a correction is authorized. Duplicate entries for the same fuel event should be prevented.
- Log preventive and corrective maintenance activities. A maintenance record should be created only when the vehicle exists in the database and the maintenance type, date, and service details are provided. Once a maintenance record is opened, the vehicle should be blocked from route assignment until it is cleared or closed.
- Schedule future servicing or inspections based on mileage, elapsed time, or service history. Scheduling must be allowed only if the vehicle is active and the planned maintenance date does not conflict with an existing service booking. The system should warn the fleet manager if a vehicle is nearing its next maintenance threshold.
- Review maintenance history and fuel trends for a selected vehicle or group of vehicles. Access should be limited to vehicles within the manager’s operational scope, and historical data should remain available even if the vehicle is later archived.
- Prevent route allocation for vehicles that fail compliance checks, have expired inspections, or have unresolved repair records. The vehicle should remain blocked until the compliance issue is cleared and the status is updated by an authorized maintenance action.

#### Depot Manager

- View the full depot operations dashboard showing active buses, available drivers, route status, delayed trips, completed trips, maintenance alerts, and fuel summaries. Access to the dashboard must be limited to the depot under the manager’s control, and data should update based on the latest operational events.
- Approve schedules before they are released for use. Approval must be allowed only when the schedule contains no route conflict, no driver duty-hour violation, and no vehicle allocation problem. If any rule fails, approval should be blocked and the schedule should be returned for correction.
- Reject or return a schedule for revision when planning is incomplete or operationally unsafe. Rejection should require a reason, and the rejected schedule should remain stored so the original draft can be reviewed later. The manager should be able to direct it back to the Transport Scheduler for correction.
- Override a schedule in emergencies such as vehicle failure, accident, severe delay, or service shortage. Override must be allowed only with a recorded justification and only by authorized managerial users. The original plan and the replacement action should both remain visible in the record history.
- Reassign buses or drivers during operational disruptions. Reassignment must be permitted only when the alternative resource is available, compliant, and not already assigned elsewhere. The manager should not be able to force a reassignment that creates another conflict unless emergency override permission is available.
- Monitor trip progress and trip completion status. Monitoring should allow the manager to see whether a trip is on time, delayed, cancelled, or completed, and trip state changes should occur only through valid operational events or authorized updates.
- Review depot-level performance information such as vehicle utilization, route completion rate, fuel efficiency, delay count, and maintenance downtime. Access should be restricted to the depot’s own records unless higher-level authority is granted.
- Receive and act on alerts related to delay, conflict, expired license, overdue maintenance, or underutilized vehicles. Alerts should appear only when predefined operational conditions are triggered, and the manager should be able to acknowledge, escalate, or resolve them.

#### Driver

- View assigned trips, route details, departure time, arrival time, and assigned vehicle information. Access must be limited to the driver’s own duty roster or to assignments explicitly shared by an authorized user.
- View route changes or schedule updates when a trip is rescheduled, cancelled, or reassigned. Notifications should be shown only after the change has been approved, and the driver should be able to see both the new assignment and the reason for change if permitted.
- Acknowledge a trip assignment after reviewing the route and timing. Acknowledgment must be allowed only while the assignment is still active and before the trip is completed or cancelled. The acknowledgment should be recorded with the driver identity and timestamp.
- Report operational issues such as delays, breakdowns, route obstruction, passenger incidents, or inability to continue service. The report must be allowed only for the trip currently assigned to that driver, and the driver should be required to choose an issue type and add remarks before submission.
- View personal duty history and working-hour information. Access should be restricted to the driver’s own records, and the displayed data should reflect approved assignments only.
- Confirm trip completion when the route has ended successfully. Completion confirmation must be allowed only after the trip reaches the final stage and should not be accepted for future or cancelled trips.

---

### System Requirements

#### 1) Application Deployment Environment

- The SRMSS shall be deployed as a web-based application accessible through a browser. This allows depot staff to use the same platform from different office computers without installing a separate desktop application.
- Deployment shall support a centralized server model. This is important because route data, schedules, vehicle records, and reports must remain synchronized across all users and depots.
- The application shall be deployable in a secure hosting environment such as an on-premise server, cloud server, or hybrid setup depending on organizational policy. This gives flexibility for future scaling across multiple depots.

#### 2) Server Requirements

- The application server shall provide sufficient processing power to support concurrent access by administrators, schedulers, fleet managers, depot managers, and drivers. This is necessary because multiple users may create, edit, and view operational data at the same time.
- The server shall provide adequate memory to handle active sessions, dashboard loading, scheduling validation, and report generation. Without enough memory, report processing and dashboard refreshes may become slow.
- The server shall include enough storage capacity for current operational data and historical records. Since schedules, logs, maintenance history, and audit trails accumulate over time, storage must support long-term retention.
- The server shall support secure backup and recovery procedures. This is needed so that critical operational records can be restored after failure, accidental deletion, or corruption.

#### 3) Database Requirements

- The SRMSS shall use a relational database to store users, depots, routes, schedules, vehicles, drivers, fuel logs, maintenance records, and reports. A relational structure is suitable because many of these records are linked through keys and dependencies.
- The database shall support transaction handling so that a schedule save, route update, or vehicle status change is completed fully or not saved at all. This prevents partial updates from creating invalid operational data.
- The database shall support indexing and optimized querying for frequent operations such as searching routes, checking schedule conflicts, and generating reports. This is important because route planning and reporting require fast retrieval.
- The database shall support regular backups, restoration, and long-term archival of historical records. These capabilities are required to preserve audit trails and past operational data.

#### 4) Operating System Requirements

- The server shall run on a stable server-grade operating system that supports web hosting, database services, and secure access control. A server operating system is required because the system must remain reliable under continuous depot usage.
- Client machines shall be able to run a modern operating system capable of executing up-to-date web browsers. This ensures compatibility for depot offices and managerial workstations.
- The chosen operating system environment shall support security updates, user authentication, and network communication. These capabilities are essential for a system that manages sensitive operational records.

#### 5) Browser Requirements

- The application shall be accessible through standard modern browsers such as Chrome, Edge, or Firefox. Browser support is necessary because the system is designed as a web-based platform.
- The browser shall support HTML5, CSS3, and JavaScript-based interaction. These technologies are required for dashboard views, form validation, search, and real-time schedule checking.
- The browser shall support secure communication over HTTPS. This is required to protect login credentials, route data, and operational records during transmission.
- The browser shall display the interface correctly on common screen resolutions used in office environments. This helps ensure usability for scheduling and depot management tasks.

#### 6) Network Requirements

- The network shall provide reliable connectivity between client devices and the application server. Reliable connectivity is necessary because depot operations depend on real-time access to schedules and vehicle data.
- The network shall have sufficient bandwidth to support dashboard loading, report downloads, and map-based route viewing. Large reports and map services need stable data transfer.
- The network shall support secure communication paths, especially if the system is accessed across multiple depots or remote locations. This reduces the risk of unauthorized data interception.
- Network latency shall be low enough to allow responsive interaction during scheduling and operational monitoring. If latency is high, users may experience delays when saving assignments or checking conflicts.

#### 7) Client Device Requirements

- Depot office users shall use desktop or laptop computers with enough processing capacity to run a modern browser smoothly. These tasks include dashboard viewing, schedule entry, and report generation.
- Driver-facing access, if provided, shall work on mobile devices or small-screen browsers. This is important because drivers may need to view schedules or receive updates while on duty.
- Client devices shall have sufficient memory and storage to support normal browser operation without freezing during system use.
- Input devices such as keyboards and mice shall be available for administrative and clerical users, while touch support may be used for mobile access if implemented.

#### 8) Security Infrastructure Requirements

- The deployment environment shall support SSL/TLS encryption for all application traffic. This is necessary to protect user credentials and sensitive depot data.
- The environment shall support role-based access control at application level and secure authentication at login level. This ensures each user sees only the permitted functions.
- The system shall support audit logging and secure log storage. This is important because operational actions such as schedule changes and vehicle status updates must be traceable.
- The environment shall support regular patching and security updates to reduce exposure to vulnerabilities.

#### 9) Map and External Service Requirements

- If route visualization uses an external map service, the environment shall support internet access for map requests. This is needed for visual route planning and stop display.
- The application shall be able to communicate with external APIs securely when route mapping or other integrations are enabled.
- If external services are unavailable, core scheduling and record management shall remain functional. This ensures depot operations continue even if a third-party service fails.

#### 10) Performance Support Requirements

- The deployment environment shall be able to handle simultaneous dashboard access, schedule validation, and report generation without unstable behavior.
- The server resources shall be sized to support growth in users, routes, vehicles, and historical logs.
- The environment shall support caching or optimization mechanisms where needed to improve response times for frequent queries.
- The infrastructure shall be sufficient to prevent bottlenecks during peak operational periods such as morning departures or monthly report preparation.

#### 11) Maintenance and Support Requirements

- The environment shall support application updates without disrupting all users for extended periods.
- The deployment setup shall allow database backups, application patching, and rollback when updates fail.
- The system shall be supportable by technical administrators who can monitor server health, storage usage, and application logs.
- The environment shall be maintainable so that future modules, such as live GPS tracking or SMS notifications, can be added with minimal restructuring.

---

### Hidden

#### 1) Ease of adoption by non-technical users

- The interface should be easy enough for clerks, supervisors, and managers who may still be used to manual records or spreadsheets. This is important because a transport depot environment often includes staff with mixed technical ability, and the system will fail in practice if users cannot learn it quickly.
- Menus, forms, and labels should be familiar to depot staff and reflect real transport terminology. Users should not need to translate system language into operational language before acting on it.

#### 2) Minimal training requirement

- The application should be usable after only short training sessions. Depot operations are time-sensitive, so users cannot spend excessive time learning how to create schedules or update vehicle status.
- Common tasks such as route entry, schedule creation, driver assignment, and maintenance logging should follow a simple, repeatable workflow. This is a hidden requirement because it is not explicitly stated, but it is necessary for the system to be practical.

#### 3) Data migration from manual records

- Existing paper records and spreadsheet data should be transferable into the new system. Since the current process relies heavily on manual record-keeping, the depot will need a way to import old routes, vehicles, drivers, and schedules without re-entering everything from scratch.
- Imported data should be cleaned and validated before being accepted. Hidden problems in old records, such as duplicate vehicle numbers or missing license details, should not damage the new database.

#### 4) Historical record retention

- Old schedules, cancelled trips, maintenance logs, and deleted user activity should remain available for future reference. Transport depots often need historical data for disputes, audits, performance reviews, and planning.
- Records should not disappear just because they are no longer active. This is a hidden requirement because the system must support long-term operational memory, not just current-day work.

#### 5) Role separation and operational authority

- Each user role should only see functions that match its real-world responsibility. Admins manage access, schedulers manage timetables, fleet managers manage vehicles, depot managers supervise operations, and drivers view assigned duties.
- Approval-sensitive actions should require the correct level of authority. For example, a scheduler may prepare a timetable, but a depot manager may need to approve it. This reflects the practical chain of command in depot operations.

---

### Non-Functional Requirements

#### 1. Performance

- **Requirement:**  
  The system should provide fast response times for operations such as route planning, scheduling, and dashboard updates.
- The system handles real-time operations (trip status, scheduling). Slow response can delay decisions and affect transport operations. Therefore, high performance ensures efficient and timely management

#### 2. Flexibility

- **Requirement:**  
  The system should allow easy updates to schedules in case of emergencies, maintenance, or unexpected events.
- The scenario clearly mentions schedule adjustments for emergencies. Transport systems are dynamic and frequently change. Flexibility ensures the system can adapt without breaking workflows

#### 3. Reliability

- **Requirement:**  
  The system must provide accurate and consistent data (routes, schedules, fuel logs, reports).
- Incorrect data can lead to wrong scheduling and resource mismanagement. The dashboard shows real-time statuses, so accuracy is critical. Reliability ensures trustworthy system output.

#### 4. Usability

- **Requirement:**  
  The system should be user-friendly and easy to use for depot staff and managers.
- Users (Depot Manager, Scheduler) may not be highly technical. Complex systems reduce efficiency and increase errors. Good usability ensures smooth operation and user adoption.

#### 5. Scalability

- System should support increasing number of routes, vehicles, and users
- **Why it matters:**  
  Ensures future growth without redesigning the system

#### 6. Security

- Role-based access control and authentication
- **Why it matters:**  
  Prevents unauthorized access to sensitive data

---

### Domain Requirements

- Routes must include start point, end point, stops, and distance
- Scheduling must avoid time conflicts and overlaps
- Vehicles must maintain fuel consumption and maintenance records
- Drivers must have valid license and availability tracking
- Dashboard must display real-time operational status
- Reports must support performance analysis and decision-making

### Domain Requirements

### Hardware Requirements

<!-- Insert hardware requirements content -->

---

# Software design and its specification

## Class Diagram

<!-- Insert Class Diagram -->

## Use Case Diagram

<!-- Insert Use Case Diagram -->

## 3-Tier Architecture Diagram

<!-- Insert 3-Tier Architecture Diagram -->

## interconnection

<!-- Insert interconnection diagram / description -->

## Interface design

<!-- Insert interface design content -->

## User manual

<!-- Insert user manual (summary); full manual in Appendix -->

## ER Diagram

<!-- Insert ER Diagram — see also docs/ER-DIAGRAM.md -->

## Weak Entities

<!-- Insert weak entities analysis -->

## Derived & Multivalued attributes

<!-- Insert derived and multivalued attributes -->

## Sequence Diagram

<!-- Insert Sequence Diagram -->

## State Transition Diagram

<!-- Insert State Transition Diagram -->

---

# Implementation

## Development environment & tools / Implementation of core features

<!-- Insert implementation narrative -->

## Wireframes

### 1. Login

<!-- Insert Login wireframe image(s) -->

### 2. Route Planning Module

<!-- Insert Route Planning wireframe image(s) -->

### 3. Schedule Management

<!-- Insert Schedule Management wireframe image(s) -->

### 4. Depot Management Dashboard

<!-- Insert Depot Management Dashboard wireframe image(s) -->

### 5. Fuel and Maintenance Log

<!-- Insert Fuel and Maintenance Log wireframe image(s) -->

### 6. Driver and Vehicle Management

<!-- Insert Driver and Vehicle Management wireframe image(s) -->

### 7. Reporting and Analytics Module

<!-- Insert Reporting and Analytics wireframe image(s) -->

### 8. Driver Dashboard

<!-- Insert Driver Dashboard wireframe image(s) -->

---

## Tools

### 1. Development environment

- Frontend: React.js
- Backend: Node.js with Express.js
- Database: MongoDB
- ODM: Mongoose
- Code Editor: Visual Studio Code
- API Testing Tool: Postman
- Package Manager: npm
- Environment Configuration: dotenv
- Browser: Google Chrome (DevTools)

### 2. Collaboration & Communication tools

- Version Control: GitHub
- Communication Tools: WhatsApp
- Task Management Tools: Notion
- Design Tools: Figma & Draw.io

## Interfaces & Code snippets

<!-- Insert interfaces and code snippets -->

---

# Testing

## Testing strategy / Test cases & results / Evaluation summary

<!-- Insert testing content -->

---

# Reflection

Chosen methodology/ Challenges faced/Time & task management/ Learning outcomes/ Teamwork experience – 400 words

<!-- Insert individual reflection (400 words) — per student in individual report -->

---

# References

<!-- Insert references -->

---

# Appendix

## User Manual

<!-- Insert full user manual -->

## User Interfaces

<!-- Insert screenshots of implemented UI -->

## Additional UML Diagrams

<!-- Insert additional UML diagrams -->

## Team Contribution

<!-- Insert team contribution table -->
