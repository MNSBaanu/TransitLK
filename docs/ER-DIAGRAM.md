# TransitLK — Entity-Relationship (ER) Diagram

> **SRMSS** — Smart Route Management and Scheduling System for Public Transport Depots  
> This document describes the current ER model used for database design and implementation.

---

## Overview

The system models depot operations: depots employ drivers and manage buses; routes are planned by admins; schedules assign buses and drivers to routes on specific dates; fuel and maintenance are logged per bus. Users authenticate via a shared `User` entity linked to `Admin`.

---

## Entities and Attributes

### Depot

| Attribute   | Key | Description                    |
|------------|-----|--------------------------------|
| `depot_id` | PK  | Unique depot identifier        |
| `depot_name` |   | Name of the depot              |
| `location` |     | Depot location                 |
| `Contact_no` |   | Contact telephone number       |

### Driver

| Attribute      | Key | Description                    |
|---------------|-----|--------------------------------|
| `driver_id`   | PK  | Unique driver identifier       |
| `name`        |     | Driver full name               |
| `license_no`  |     | Driving licence number         |
| `Contact_no`  |     | Contact telephone number       |
| `working_hours` |   | Working hours / shift info     |

### Bus

| Attribute    | Key | Description                    |
|-------------|-----|--------------------------------|
| `bus_id`    | PK  | Unique bus identifier          |
| `reg_number`|     | Vehicle registration number    |
| `capacity`  |     | Seating capacity               |
| `mileage`   |     | Current mileage                |
| `status`    |     | e.g. available, in service     |
| `service_type` |  | e.g. express, ordinary, semi-luxury |
| `depot_id`  | FK  | Depot that manages this bus    |

### FuelLog

| Attribute   | Key | Description                    |
|------------|-----|--------------------------------|
| `fuel_id`  | PK  | Unique fuel log identifier     |
| `bus_id`   | FK  | Bus that was refuelled         |
| `fuel_date`|     | Date of fuel entry             |
| `liters`   |     | Fuel quantity (litres)         |
| `amount`   |     | Cost of fuel                   |

### Maintenance

| Attribute      | Key | Description                    |
|---------------|-----|--------------------------------|
| `maintain_id` | PK  | Unique maintenance record ID   |
| `bus_id`      | FK  | Bus serviced                   |
| `service_date`|     | Date of service                |
| `description` |   | Work performed                 |
| `cost`        |     | Service cost                   |

### Route

| Attribute     | Key | Description                    |
|--------------|-----|--------------------------------|
| `route_id`   | PK  | Unique route identifier        |
| `route_name` |     | Route name / label             |
| `distance`   |     | Total route distance (km)      |
| `start_point`|     | Starting location (display name) |
| `end_point`  |     | Destination location (display name) |
| `stops`      |     | Intermediary stop names (list) |
| `start_location` |  | Map coordinates for start (`lat`, `lng`; optional `address`) |
| `end_location`   |  | Map coordinates for end (`lat`, `lng`; optional `address`) |
| `stop_locations` |  | Intermediary stops with coordinates (`name`, `lat`, `lng`) |
| `bus_id`     | FK  | Assigned bus — use **Bus** `capacity`, `status` (availability), `service_type` via reference |
| `driver_id`  | FK  | Assigned driver — use **Driver** `working_hours` via reference |

### Schedule

| Attribute        | Key | Description                         |
|-----------------|-----|-------------------------------------|
| `schedule_id`   | PK  | Unique schedule / trip identifier   |
| `route_id`      | FK  | Route for this trip                 |
| `bus_id`        | FK  | Bus assigned to the trip            |
| `driver_id`     | FK  | Driver assigned to the trip         |
| `departure_time`|     | Scheduled departure time            |
| `arrival_time`  |     | Scheduled arrival time              |
| `trip_date`     |     | Date of the trip                    |
| `status`        |     | e.g. on-time, delayed, completed    |

### Admin

| Attribute  | Key | Description                    |
|-----------|-----|--------------------------------|
| `admin_id`| PK  | Unique admin identifier        |

### User

| Attribute  | Key | Description                              |
|-----------|-----|------------------------------------------|
| `user_id` | PK  | Unique user identifier                   |
| `username`|     | Login username                           |
| `password`|     | Hashed password (implementation)         |
| `role`    |     | e.g. admin, supervisor, staff            |

---

## Relationships and Cardinality

| Relationship | Entities        | Cardinality | Description                                      |
|-------------|-----------------|-------------|--------------------------------------------------|
| **employs** | Depot → Driver  | 1 : M       | One depot employs many drivers                   |
| **manages** | Depot → Bus   | 1 : M       | One depot manages many buses                     |
| **has**     | Bus → FuelLog   | 1 : M       | One bus has many fuel log entries                |
| **contains**| Bus → Maintenance | 1 : M     | One bus has many maintenance records             |
| **assigned**| Bus → Schedule  | 1 : M       | One bus is assigned to many schedules           |
| **handles** | Driver → Schedule | 1 : M   | One driver handles many schedules                |
| **consists**| Route → Schedule | 1 : M    | One route has many scheduled trips               |
| **manages** | Admin → Route   | 1 : M       | One admin manages many routes                    |
| **manages** | Admin → Schedule | 1 : M    | One admin manages many schedules                 |
| **belongs** | Admin → User    | 1 : 1       | One admin account links to one user record       |

---

## ER Diagram (Mermaid)

```mermaid
erDiagram
    DEPOT ||--o{ DRIVER : employs
    DEPOT ||--o{ BUS : manages
    BUS ||--o{ FUELLOG : has
    BUS ||--o{ MAINTENANCE : contains
    BUS ||--o{ SCHEDULE : assigned
    DRIVER ||--o{ SCHEDULE : handles
    ROUTE ||--o{ SCHEDULE : consists
    ADMIN ||--o{ ROUTE : manages
    ADMIN ||--o{ SCHEDULE : manages
    ADMIN ||--|| USER : belongs

    DEPOT {
        string depot_id PK
        string depot_name
        string location
        string Contact_no
    }

    DRIVER {
        string driver_id PK
        string name
        string license_no
        string Contact_no
        string working_hours
    }

    BUS {
        string bus_id PK
        string reg_number
        int capacity
        number mileage
        string status
        string service_type
        string depot_id FK
    }

    FUELLOG {
        string fuel_id PK
        string bus_id FK
        date fuel_date
        number liters
        number amount
    }

    MAINTENANCE {
        string maintain_id PK
        string bus_id FK
        date service_date
        string description
        number cost
    }

    ROUTE {
        string route_id PK
        string route_name
        number distance
        string start_point
        string end_point
        string stops
        object start_location
        object end_location
        object stop_locations
        string bus_id FK
        string driver_id FK
    }

    SCHEDULE {
        string schedule_id PK
        string route_id FK
        string bus_id FK
        string driver_id FK
        time departure_time
        time arrival_time
        date trip_date
        string status
    }

    ADMIN {
        string admin_id PK
    }

    USER {
        string user_id PK
        string username
        string password
        string role
    }
```

---

## Mapping to MongoDB / Mongoose (implementation notes)

In the MERN stack, primary keys are typically MongoDB `_id` (`ObjectId`). Foreign keys use `ObjectId` references:

| ER entity   | Mongoose collection | Notes |
|------------|---------------------|--------|
| User       | `users`             | Implemented (`User` model) — maps `username`/`email`, `password`, `role` |
| Route      | `routes`            | `route_name`, `distance`, `start_point`, `end_point`, `stops`, `start_location`, `end_location`, `stop_locations` |
| Schedule   | `schedules`         | `routeId`, `busId`, `driverId`, times, `tripDate`, `status`; conflict checks on save |
| Driver     | `drivers`           | `depotId` → `Depot`; working hours, status |
| Bus        | `buses`             | `depotId` → `Depot`, `serviceType`, capacity, status |
| FuelLog    | `fuellogs`          | `bus_id` → `Bus` |
| Maintenance| `maintenances`      | `bus_id` → `Bus` |
| Depot      | `depots`            | `depotName`, `location`, `contactNo` |
| Admin      | `admins`            | `userId` → `User` (1:1); optional `depotId` → `Depot` |

### Route collection (from this ER)

| Field | Mongoose type | Required | Notes |
|-------|---------------|----------|--------|
| `routeName` | String | Yes | ER: `route_name` |
| `distance` | Number | Yes | Total distance in km |
| `startPoint` | String | Yes | ER: `start_point` — label for UI/reports |
| `endPoint` | String | Yes | ER: `end_point` |
| `stops` | [String] | No | Intermediary stop names |
| `startLocation` | `{ lat, lng, address? }` | No* | ER: `start_location` — for Google Maps |
| `endLocation` | `{ lat, lng, address? }` | No* | ER: `end_location` |
| `stopLocations` | `[{ name, lat, lng }]` | No | ER: `stop_locations` — map pins per stop |
| `busId` | ObjectId → `Bus` | No | ER: `bus_id` — populated fields: `capacity`, `status` (availability), `serviceType` |
| `driverId` | ObjectId → `Driver` | No | ER: `driver_id` — populated field: `workingHours` |

\*Required when map visualisation is enabled; optional for text-only routes in early development.

**Bus/driver on Route:** Store only `busId` and `driverId` on the route document. Do **not** duplicate `capacity`, `service_type`, or `working_hours` on Route — the API uses Mongoose `populate()` to return them from **Bus** and **Driver**. **Schedule** can still assign bus/driver per trip for timetables.

### Bus collection — `service_type`

| Field | Mongoose type | Notes |
|-------|---------------|--------|
| `serviceType` | String (enum) | ER: `service_type` — e.g. `express`, `ordinary`, `semi-luxury` |

Aligns with coursework: assignment of buses to routes/schedules based on **service type** and **capacity** (`capacity` on Bus, `status` for availability).

---

## Module ownership (implementation)

| ER area              | Primary owner |
|---------------------|---------------|
| Route               | Baanu         |
| Schedule            | Baanu         |
| Driver, Bus, FuelLog, Maintenance | Irfa |
| User / auth         | Baanu (done)  |
| Depot, Admin, Dashboard, Reports | Group / pending |

---

## Related documents

- `DOCUMENT.md` — Coursework brief and marking scheme
- `REQUIREMENTS.md` — Functional, non-functional, system, and domain requirements (Version 1)
- UML class diagram, use case diagram, 3-tier architecture — `docs/` (add filenames as created)
- Wireframes / Stitch — design reference for UI
