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

- Create, modify, and manage routes with a defined start point, end point, intermediary stops, and total distance (kilometres).
- Set route names, service type (express, ordinary, semi-luxury), and draft or active status so only operational routes are used in timetables.
- Assign buses and drivers to specific routes based on vehicle capacity, availability, service type, and driver working hours; the system warns when a bus or driver does not meet the rules.
- Use visual route mapping through online map services (e.g. Google Maps) to see the path clearly and pick stops on the map when the service is configured.
- Search and review the route catalogue, edit existing routes, and cannot delete a route when trips already depend on it.
- Mark routes inactive when they are no longer run, while history remains available for records and reports.

---

### 2. Schedule management module

**Transport scheduler**

- Create daily, weekly, and monthly timetables, with each trip having a chosen route, calendar date, departure time, arrival time, bus, and driver.
- Build timetables in a visual grid (including Gantt-style views) for day, week, and month planning.
- Receive automatic detection and prevention of overlapping or conflicting schedules when planning trips (same bus or driver double-booked, invalid times, bus in maintenance, driver unavailable), with clear messages to correct plans before publication.
- Prepare timetables as drafts and submit them for depot approval.
- Plan trips in bulk across a date range (including repeat-for-week on single entries and multi-route timetable creation), with warnings when individual trips cannot be placed.
- Remove draft or unneeded schedule entries when plans change before they go live.
- Adjust schedules for emergencies, maintenance work, or unexpected events (including delay, cancellation, bus or driver change), with notes where required and a recorded history of changes.

**Depot manager and administrator**

- Approve submitted timetables only when plans are still conflict-free, or return work to the scheduler with a stated reason.
- Track trip status through the working day (e.g. scheduled, on-time, delayed, completed, cancelled) for depot visibility and reporting.
- Adjust schedules for emergencies, maintenance work, or unexpected events, with notes where required and a recorded history of changes.

**Driver**

- View approved and scheduled trips assigned to them through the My trips area (read-only).

---

### 3. Depot management dashboard module

**Administrator and depot manager**

- Use a centralized control panel showing active routes, buses available or in maintenance, drivers on duty, and recent trips.
- See trip status such as on-time, delayed, scheduled, or completed, with colour cues for operational visibility during the day.
- View summary statistics on total active routes, trip completion rate, and how buses are distributed across available, in-service, and maintenance states.
- Receive highlights of recent maintenance-related situations when a bus is in the workshop.
- Rely on automatic periodic refresh of key figures and the trip list so the dashboard stays current during the working day (without live vehicle tracking).

---

### 4. Fuel and maintenance log module

**Fleet manager and administrator**

- Maintain a record of fuel consumption per vehicle (date, litres, cost), supporting identification of high-usage vehicles and inefficient patterns when used with reporting.
- Log routine and corrective maintenance activities (service date, description, cost per bus), so each vehicle’s workshop history is kept in one place.
- Edit or remove fuel and maintenance entries when corrections are needed.
- Review fuel entries and maintenance jobs separately in the workspace.

**Fleet manager**

- Set bus status on the Fleet screen when a vehicle is off the road, in line with maintenance records.

**Administrator, depot manager, and transport scheduler**

- Access fuel and maintenance summaries through analytics to support cost-effective and more sustainable operations (where their role permits).

---

### 5. Driver and vehicle management database module

**Fleet manager and administrator**

- Store comprehensive driver details, including name, contact information, licence number, optional licence expiry, working hours, status (available, on-leave, off-duty), depot, and optional login for the driver portal.
- Maintain a database of vehicles, including registration number, seating capacity, mileage, service type, depot, and status (available, in-service, maintenance).
- Remove bus or driver records that are no longer required, subject to system rules when linked data exists.
- Keep registration and licence numbers unique when creating or updating records.
- Review maintenance history per vehicle together with the fuel and maintenance log.

**Transport scheduler and administrator**

- See whether a driver is eligible for assignment (available and within working hours) before trips are confirmed.
- See who and what is assigned to each service through route and trip planning linked to drivers and buses.

---

### 6. Reporting and analytics module

**Superadministrator, administrator, transport scheduler, and depot manager**

- View automated weekly and monthly reports (and custom date ranges) on trip completion rates, route performance (delays, cancellations, risk indicators), and fuel consumption trends.
- Download exportable reports in PDF and CSV for management review, sustainability reporting, depot meetings, and further analysis in spreadsheets.

**Administrator and depot manager**

- Monitor summary KPIs and narrative insights on screen without building spreadsheets manually.
- Export trip data for further analysis in external tools.
- Use data-driven insights into operational efficiency, including which routes are performing well or need attention.

**Superadministrator**

- View network-wide analytics across depots where the platform scope applies.

---

## Supporting modules

### Authentication

**All users (superadministrator, administrator, transport scheduler, fleet manager, depot manager, driver)**

- Sign in with email and password; the system recognises administrators, depot staff, and drivers in turn.
- Receive a general error message when credentials are wrong, without revealing whether the email exists.
- See name, role, and depot (where relevant) in the application after sign-in, with session restored when they return.

**Deactivated depot staff (transport scheduler, fleet manager, depot manager)**

- Cannot sign in while their account is marked inactive.

**Administrator**

- Create depot staff accounts with role and depot assignment.

---

### Users and access

**Administrator**

- Manage depot staff accounts (transport scheduler, fleet manager, depot manager): create, edit, deactivate, or remove, with role and depot assignment.
- See which parts of the system each staff role may use.

---

### Administrator and depot registry

**Superadministrator**

- Maintain platform administrator accounts.
- Maintain the register of depots (code, name, region, location) for multi-depot growth.

---

### My trips (driver portal)

**Driver**

- See only their own assigned trips with route, times, bus, and status, on a layout suited to mobile use.
- Cannot change or approve schedules from this area.

---

### Cross-cutting (all modules)

**All roles**

- May only open modules allowed for their role and are directed to their home area after login.
- Have account passwords protected by the system.

**Transport scheduler, depot manager, and administrator**

- Have trip schedule changes recorded with history when they edit timetables; trip dates align to calendar days for planning and reports.

---

## Planned later (not in the current system)

**Administrator and other users**

- Password reset and stronger sign-in options.

**Transport scheduler and depot manager**

- In-app alerts when timetables conflict or need approval.

**Superadministrator and administrator**

- Organisation-wide audit log beyond trip adjustment history.

**Driver**

- Confirm trips and report issues from the phone.

**Depot manager and depot staff**

- Strict “one depot only” data views everywhere island-wide.

**Transport scheduler**

- Import routes from spreadsheets.

**Fleet manager**

- Automatic bus status change when a trip is assigned (today status is set manually on the Fleet screen).
- Create or reset driver portal login credentials from the Fleet screen (driver accounts are supported in the system; staff UI for this is not yet provided).

**Transport scheduler and fleet manager**

- Automatic rejection of trip or route assignment when a driver’s licence is past its expiry date (expiry is recorded today but not yet enforced when scheduling).

---

*End of REQUIREMENT-M*
