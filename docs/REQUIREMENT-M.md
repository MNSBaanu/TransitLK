# SRMSS — Module-Based Functional Requirements (REQUIREMENT-M)

**Product:** TransitLK — Smart Route Management and Scheduling System

This document describes what the system must do, organised by **module**. Each requirement states **which role** performs or benefits from the function.

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

- Enables **administrators** and **transport schedulers** to create, modify, and manage routes with a defined start point, end point, intermediary stops, and total distance (kilometres).
- Allows **administrators** and **transport schedulers** to set route names, service type (express, ordinary, semi-luxury), and draft or active status so only operational routes are used in timetables.
- Enables **administrators** and **transport schedulers** to assign buses and drivers to specific routes based on vehicle capacity, availability, service type, and driver working hours; the system warns them when a bus or driver does not meet the rules.
- Provides **administrators** and **transport schedulers** with visual route mapping through online map services (e.g. Google Maps), so depot officers can see the path clearly and pick stops on the map when the service is configured.
- Allows **administrators** and **transport schedulers** to search and review the route catalogue, edit existing routes, and prevents them from deleting a route when trips already depend on it.
- Enables **administrators** and **transport schedulers** to mark routes inactive when they are no longer run, while history remains available for records and reports.

---

### 2. Schedule management module

- Enables **transport schedulers** to create daily, weekly, and monthly timetables, with each trip having a chosen route, calendar date, departure time, arrival time, bus, and driver.
- Automatically detects and prevents overlapping or conflicting schedules when **transport schedulers** plan trips (same bus or driver double-booked, invalid times, bus in maintenance, driver unavailable), with clear messages so they can correct plans before publication.
- Enables **transport schedulers** to prepare timetables as drafts and submit them for approval; **depot managers** and **administrators** may approve only when plans are still conflict-free, or return work to the scheduler with a stated reason.
- Enables **transport schedulers**, **depot managers**, and **administrators** to adjust schedules for emergencies, maintenance work, or unexpected events (including delay, cancellation, bus or driver change), with notes where required and a recorded history of who changed what and why.
- Allows **depot managers** and **administrators** to track trip status through the working day (e.g. scheduled, on-time, delayed, completed, cancelled) for depot visibility and reporting.
- Enables **transport schedulers** to plan trips in bulk across a date range, with warnings when individual trips cannot be placed.
- Allows **drivers** to view approved and scheduled trips assigned to them through the My trips area (read-only).

---

### 3. Depot management dashboard module

- Provides **administrators** and **depot managers** with a centralized control panel showing active routes, buses available or in maintenance, drivers on duty, and recent trips.
- Displays trip status such as on-time, delayed, scheduled, or completed to **administrators** and **depot managers**, with colour cues for operational visibility during the day.
- Shows **administrators** and **depot managers** summary statistics on total active routes, trip completion rate, and how buses are distributed across available, in-service, and maintenance states.
- Highlights recent maintenance-related situations to **administrators** and **depot managers** when a bus is in the workshop, so they can act quickly.
- Keeps the dashboard current for **administrators** and **depot managers** through automatic refresh of key figures and the trip list.

---

### 4. Fuel and maintenance log module

- Enables **fleet managers** and **administrators** to maintain a record of fuel consumption per vehicle (date, litres, cost), supporting identification of high-usage vehicles and inefficient patterns when used with reporting.
- Enables **fleet managers** and **administrators** to log routine and corrective maintenance activities (service date, description, cost per bus), so each vehicle’s workshop history is kept in one place.
- Allows **fleet managers** and **administrators** to review fuel entries and maintenance jobs separately in the workspace.
- Expects **fleet managers** to set bus status on the Fleet screen when a vehicle is off the road, in line with maintenance records.
- Provides **administrators**, **depot managers**, and **transport schedulers** (where permitted) with fuel and maintenance summaries through analytics to support cost-effective and more sustainable operations.

---

### 5. Driver and vehicle management database module

- Enables **fleet managers** and **administrators** to store comprehensive driver details, including name, contact information, licence number, optional licence expiry, working hours, status (available, on-leave, off-duty), depot, and optional login for the driver portal.
- Shows **transport schedulers** and **administrators** whether a driver is eligible for assignment (available and within working hours) before trips are confirmed.
- Enables **fleet managers** and **administrators** to maintain a database of vehicles, including registration number, seating capacity, mileage, service type, depot, and status (available, in-service, maintenance).
- Requires **fleet managers** and **administrators** to keep registration and licence numbers unique when creating or updating records.
- Allows **transport schedulers** and **administrators** to see who and what is assigned to each service through route and trip planning linked to drivers and buses.
- Enables **fleet managers** and **administrators** to review maintenance history per vehicle together with the fuel and maintenance log.

---

### 6. Reporting and analytics module

- Generates automated weekly and monthly views (and custom date ranges) for **superadministrators**, **administrators**, **transport schedulers**, and **depot managers** on trip completion rates, route performance (delays, cancellations, risk indicators), and fuel consumption trends.
- Presents summary KPIs and narrative insights on screen so **administrators** and **depot managers** can monitor efficiency without building spreadsheets manually.
- Enables **superadministrators**, **administrators**, **transport schedulers**, and **depot managers** to download exportable reports in PDF for management review, sustainability reporting, and depot meetings.
- Allows **administrators** and **depot managers** to export trip data for further analysis in external tools.
- Supports **administrators** and **depot managers** with data-driven insights into operational efficiency, including which routes are performing well or need attention.
- Allows **superadministrators** to view network-wide analytics across depots where the platform scope applies.

---

## Supporting modules

### Authentication

- Enables all users (**superadministrator**, **administrator**, **transport scheduler**, **fleet manager**, **depot manager**, **driver**) to sign in with email and password; the system recognises administrators, depot staff, and drivers in turn.
- Shows a general error message to any user who enters wrong credentials, without revealing whether the email exists.
- Prevents deactivated depot staff (**transport scheduler**, **fleet manager**, **depot manager**) from signing in.
- Displays each signed-in user’s name, role, and depot (where relevant) in the application and restores their session when they return.
- Enables **administrators** to create depot staff accounts with role and depot assignment.

### Users and access

- Enables **administrators** to manage depot staff accounts (**transport scheduler**, **fleet manager**, **depot manager**): create, edit, deactivate, or remove, with role and depot assignment.
- Shows **administrators** which parts of the system each staff role may use.

### Administrator and depot registry

- Enables **superadministrators** to maintain platform administrator accounts and the register of depots (code, name, region, location) for multi-depot growth.

### My trips (driver portal)

- Enables **drivers** to see only their own assigned trips with route, times, bus, and status, on a layout suited to mobile use, without ability to change schedules.

### Cross-cutting (all modules)

- Restricts each role to the modules they are allowed to use and directs them to their home area after login.
- Records trip changes for **transport schedulers**, **depot managers**, and **administrators** who edit schedules, with trip dates aligned to calendar days for planning and reports.
- Protects account passwords for all user types.

---

## Planned later (not in the current system)

- Password reset and stronger sign-in options for **administrators** and other users  
- In-app alerts for **transport schedulers** and **depot managers** when timetables conflict or need approval  
- Organisation-wide audit log for **superadministrators** and **administrators** beyond trip adjustment history  
- **Drivers** confirming trips and reporting issues from the phone  
- Strict “one depot only” data views for **depot managers** and staff everywhere island-wide  
- **Transport schedulers** importing routes from spreadsheets  
- Automatic bus status change when a trip is assigned (today **fleet managers** set status manually)

---

*End of REQUIREMENT-M*
