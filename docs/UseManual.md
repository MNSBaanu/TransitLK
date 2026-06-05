# TransitLK User Manual

**Smart Route Management and Scheduling System (SRMSS)**

| | |
|---|---|
| **Product** | TransitLK |
| **Audience** | Depot administrators, planners, fleet staff, managers, and drivers |
| **Access** | Web browser (no desktop installation required) |

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Getting started](#2-getting-started)
3. [Navigation and access](#3-navigation-and-access)
4. [Module guides](#4-module-guides)
5. [Common workflows](#5-common-workflows)
6. [Tips and limitations](#6-tips-and-limitations)
7. [Troubleshooting](#7-troubleshooting)
8. [Glossary](#8-glossary)
9. [Related documentation](#9-related-documentation)

---

## 1. Introduction

TransitLK is a web-based system for public transport depots. It supports day-to-day operations in one place:

- Route planning with map-assisted stop entry
- Daily, weekly, and monthly timetables
- Fleet and driver records
- Fuel and maintenance logging
- Operational dashboard and analytics reports

Each user signs in with an assigned role. The system shows only the functions relevant to that role.

---

## 2. Getting started

### 2.1 System requirements

| User | Device | Browser |
|------|--------|---------|
| Office staff | Desktop or laptop | Chrome, Edge, or Firefox (current version) |
| Drivers | Smartphone or tablet | Mobile browser |

A stable internet connection is required. Map-based route planning needs internet access; scheduling and record-keeping work without maps.

### 2.2 Signing in

1. Open the TransitLK web address provided by your organisation.
2. Enter your **email** and **password**.
3. Click **Sign in**.

You are taken to the home screen for your role. If sign-in fails, check your details or contact your administrator. Deactivated staff accounts cannot access the system.

### 2.3 Signing out

Use the account menu at the top of the screen to sign out when you finish your session.

---

## 3. Navigation and access

### 3.1 Main menu

The side menu lists the modules available to your role. Pages you are not permitted to use are hidden or blocked.

### 3.2 Access by role

| Menu | Super-administrator | Administrator | Transport scheduler | Fleet manager | Depot manager | Driver |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | | ✓ | | | ✓ | |
| Admins | ✓ | | | | | |
| Depots | ✓ | | | | | |
| Routes | | ✓ | ✓ | | | |
| Schedules | | ✓ | ✓ | | ✓ | |
| Fleet & Drivers | | ✓ | | ✓ | | |
| Users | | ✓ | | | | |
| Maintenance | | ✓ | | ✓ | | |
| Analytics | ✓ | ✓ | ✓ | | ✓ | |
| My trips | | | | | | ✓ |

### 3.3 Home screen after sign-in

| Role | Home screen |
|------|-------------|
| Superadministrator | Admins |
| Administrator | Dashboard |
| Transport scheduler | Routes |
| Fleet manager | Fleet & Drivers |
| Depot manager | Dashboard |
| Driver | My trips |

---

## 4. Module guides

### 4.1 Dashboard

**Users:** Administrator, Depot manager

The dashboard is the depot operations overview. Key figures and the trip list refresh automatically during the day.

**Summary information**

- Active routes, buses available, drivers on duty, trip completion rate
- Recent trips: route, driver, vehicle, status, departure time
- Bus availability by service type (express, ordinary, semi-luxury)
- Maintenance alerts and fleet summary

**Trip statuses**

| Status | Description |
|--------|-------------|
| Scheduled | Approved and awaiting departure |
| On-time | Running to plan |
| Delayed | Behind schedule |
| Completed | Trip finished |
| Cancelled | Trip will not run |

---

### 4.2 Routes

**Users:** Administrator, Transport scheduler

Create and maintain the route catalogue.

**View and search**

1. Open **Routes**.
2. Search by route name or number.
3. Open a route to view details, or select **Edit** to change it.

**Create a route**

1. Select **Add route**.
2. Enter route number, name, start and end points, distance (km), and service type.
3. Add stops as required. Use map search on location fields where available.
4. Set status to **Draft** while preparing, or **Active** when ready for timetables.
5. Save.

Only **active** routes can be used when creating new trips.

**Assign bus and driver**

1. Open **Assign fleet** on the route.
2. Select a bus and driver. The system warns if capacity, service type, availability, or working hours do not match.

**Deactivate or delete**

- Set status to **Inactive** when a route is no longer operated. History is retained.
- **Delete** is only allowed when no trips are linked to the route.

---

### 4.3 Schedules

**Users:** Administrator, Transport scheduler, Depot manager

Plan trips, build timetables, manage approval, and adjust operations.

**Views**

- **Daily** — timeline for one date
- **Weekly** — trips across the week
- **Monthly** — calendar overview; select a day for the daily view

Use the date controls to change the period shown.

**Add a single trip**

1. Open **Schedules** and select the date.
2. Select **Add schedule**.
3. Choose route, date, departure and arrival times, bus, and driver.
4. Optionally select **Repeat for full week** to copy the same trip across the week.
5. Resolve any conflict messages before saving. New trips are saved as **draft**.

**Create a timetable (bulk)**

1. Select **Create timetable**.
2. Choose **daily**, **weekly**, or **monthly** period.
3. Set times, bus, and driver for each route included.
4. Review conflict feedback and correct overlaps.
5. Save. Trips are created as **drafts**.

**Submit for approval** *(Transport scheduler)*

1. Open a draft trip or timetable.
2. Select **Submit for approval**. Status becomes **pending**.

**Approve or reject** *(Depot manager, Administrator)*

1. Open **Schedules** when pending items are shown.
2. Confirm the plan is conflict-free.
3. **Approve** to release for operations, or **Reject** with a reason for the scheduler.

**Adjust a trip**

1. Select a trip on the timetable.
2. Change times, bus, driver, or status as needed.
3. Choose an adjustment reason: normal, emergency, maintenance, absence, or obstruction.
4. Add **notes** when required (emergency, maintenance, absence, obstruction).
5. Save. All changes are stored in adjustment history.

**Remove drafts**

Delete draft entries that are no longer needed before approval.

---

### 4.4 Fleet & Drivers

**Users:** Administrator, Fleet manager

Manage buses and drivers in one workspace (**Buses** and **Drivers** tabs).

**Buses**

1. Add a bus: registration, capacity, mileage, service type, depot, status.
2. Edit or delete records when permitted.
3. Update status manually:
   - **Available** — ready for use
   - **In-service** — on the road
   - **Maintenance** — off the road

**Drivers**

1. Add a driver: name, licence number, contact, working hours, optional licence expiry.
2. View, edit, or delete records when permitted.
3. Status (available, on-leave, off-duty) affects trip assignment.

Drivers with login credentials use **My trips** to view their duties.

---

### 4.5 Maintenance

**Users:** Administrator, Fleet manager

Record fuel and workshop activity per vehicle.

**Log activity**

1. Open **Maintenance**.
2. Select **Log new activity**.
3. Choose **Maintenance** or **Fuel**.
4. Complete the form and save.

| Type | Fields |
|------|--------|
| Maintenance | Bus, service date, description, cost |
| Fuel | Bus, date, litres, amount |

**Manage entries**

- Switch between **Maintenance** and **Fuel** tabs.
- Search by bus registration or description.
- Edit or delete entries when corrections are needed.

Summary cards show fuel volume, spend, job count, and maintenance cost.

---

### 4.6 Analytics

**Users:** Superadministrator, Administrator, Transport scheduler, Depot manager

Review performance and export reports.

**On-screen reports**

1. Open **Analytics**.
2. Select **Weekly** or **Monthly**, or set a custom date range.
3. Review:
   - Trip completion rate
   - Route performance
   - Operational insights
   - Fuel consumption trends

Superadministrators can view network-wide figures across depots.

**Export**

- **PDF** — formatted report for meetings and management review
- **CSV** — data for spreadsheet analysis

---

### 4.7 Users

**Users:** Administrator

Manage depot staff: transport scheduler, fleet manager, and depot manager.

1. Open **Users**.
2. Select **Add user**.
3. Enter name, email, password, role, and depot.
4. Save.

You may edit accounts, deactivate users (blocks sign-in), or remove accounts. Each row shows which modules that role can access.

---

### 4.8 Admins

**Users:** Superadministrator

Manage platform administrator accounts.

1. Open **Admins**.
2. Add, edit, or remove administrator records.
3. Assign a depot to depot-level administrators where required.

---

### 4.9 Depots

**Users:** Superadministrator

Maintain the depot register.

1. Open **Depots**.
2. Add or edit a depot: code, name, region, location, and contact numbers.
3. Save.

---

### 4.10 My trips

**Users:** Driver

View assigned trips only.

1. Sign in with your driver account.
2. Open **My trips**.
3. Review route, date, times, bus, and status for each duty.

This screen is optimised for mobile use. Drivers cannot change or approve schedules here.

---

## 5. Common workflows

### New service setup

| Step | Role | Action |
|------|------|--------|
| 1 | Fleet manager | Register bus and driver; set bus to available |
| 2 | Transport scheduler | Create active route; assign fleet |
| 3 | Transport scheduler | Build timetable; resolve conflicts; submit for approval |
| 4 | Depot manager | Approve timetable |
| 5 | Driver | View duties on My trips |

### Bus breakdown during operations

| Step | Role | Action |
|------|------|--------|
| 1 | Fleet manager | Set bus to maintenance; log maintenance if needed |
| 2 | Scheduler or depot manager | Adjust affected trip; change bus or driver; add reason and notes |

### Weekly performance review

| Step | Role | Action |
|------|------|--------|
| 1 | Depot manager or administrator | Open Analytics; select weekly period |
| 2 | — | Review completion and route performance |
| 3 | — | Export PDF or CSV for the depot meeting |

---

## 6. Tips and limitations

| Topic | Note |
|-------|------|
| Conflicts | Resolve all conflict messages before submitting or approving timetables |
| Working hours | Use format `HH:MM - HH:MM` on driver records |
| Licence expiry | Expiry date is recorded; contact fleet staff if a licence needs updating |
| Maps | Enter locations manually if map search is unavailable |
| Passwords | Contact your administrator to reset a forgotten password |
| Trip status | Bus status is updated on the Fleet screen, not automatically when a trip is assigned |

---

## 7. Troubleshooting

| Issue | Suggested action |
|-------|----------------|
| Cannot sign in | Verify email and password; confirm your account is active |
| Missing menu item | Your role may not have access; contact your administrator |
| Cannot delete route | Trips are still linked; update or remove those schedules first |
| Cannot save schedule | Read conflict messages; check bus status, driver availability, and times |
| Empty dashboard | Add routes, fleet, and schedules first |
| Export fails | Confirm the date range contains data; try again or contact support |
| Page will not load | Check your internet connection; contact your administrator if the problem continues |

---

## 8. Glossary

| Term | Definition |
|------|------------|
| Route | Defined journey with start, end, stops, and distance |
| Trip | One scheduled bus run on a route for a specific date and time |
| Timetable | A group of trips planned for a day, week, or month |
| Draft | Trip prepared but not yet submitted for approval |
| Pending | Timetable submitted and awaiting manager decision |
| Depot | Transport station operating routes and fleet |
| Service type | Express, ordinary, or semi-luxury classification |
| Adjustment history | Log of changes to a trip, including reason and notes |

---

## 9. Related documentation

| Document | Description |
|----------|-------------|
| [DOCUMENT.md](./DOCUMENT.md) | Project case study and key features |
| [REQUIREMENT-M.md](./REQUIREMENT-M.md) | Functional requirements by module |
| [REQUIREMENT-M1.md](./REQUIREMENT-M1.md) | System and non-functional requirements |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture |

---

*End of user manual*
