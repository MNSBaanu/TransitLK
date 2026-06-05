# TransitLK — Sequence & State Diagrams

> **SRMSS** — Smart Route Management and Scheduling System for Public Transport Depots  
> UML diagrams organised by the **nine core modules** of TransitLK.

---

## 1. Overview

Diagrams are grouped by the main functional modules users interact with. Each module has at least one **sequence diagram** (interaction flow). Modules with status lifecycles also have **state-transition diagrams**.

| Category | Folder | Count |
|----------|--------|-------|
| Sequence | [`../sequence/`](../sequence/) | 12 |
| State transition | [`../state-transition/`](../state-transition/) | 8 |

Open `.drawio` files in [diagrams.net](https://app.diagrams.net). Export PNG for the group report.

---

## 2. Module coverage (9 core modules)

| # | Module | UI page | Sequence diagram(s) | State diagram(s) |
|---|--------|---------|---------------------|------------------|
| 1 | **Login** | `/login` | [`01-user-login.drawio`](../sequence/01-user-login.drawio) | [`06-auth-session.drawio`](../state-transition/06-auth-session.drawio) |
| 2 | **Route Management** | `/routes` | [`02-create-route-with-maps.drawio`](../sequence/02-create-route-with-maps.drawio) | [`02-route-status.drawio`](../state-transition/02-route-status.drawio) |
| 3 | **Schedule Management** | `/schedules` | [`03-create-schedule-conflict-check.drawio`](../sequence/03-create-schedule-conflict-check.drawio), [`04-schedule-submit-approve.drawio`](../sequence/04-schedule-submit-approve.drawio) | [`01-schedule-trip-status.drawio`](../state-transition/01-schedule-trip-status.drawio) |
| 4 | **Depot Management** | `/dashboard` | [`06-dashboard-summary.drawio`](../sequence/06-dashboard-summary.drawio) | *(reads live states from schedules, buses, drivers — no separate entity status)* |
| 5 | **Fuel & Maintenance** | `/maintenance` | [`08-log-maintenance.drawio`](../sequence/08-log-maintenance.drawio), [`09-log-fuel.drawio`](../sequence/09-log-fuel.drawio) | [`08-bus-maintenance-cycle.drawio`](../state-transition/08-bus-maintenance-cycle.drawio), [`03-bus-status.drawio`](../state-transition/03-bus-status.drawio) |
| 6 | **Driver & Vehicle Management** | `/buses`, `/drivers` | [`12-manage-fleet-driver-vehicle.drawio`](../sequence/12-manage-fleet-driver-vehicle.drawio) | [`03-bus-status.drawio`](../state-transition/03-bus-status.drawio), [`04-driver-status.drawio`](../state-transition/04-driver-status.drawio) |
| 7 | **Reporting & Analytics** | `/reports` | [`05-export-report.drawio`](../sequence/05-export-report.drawio) | *(read-only export — no persisted status lifecycle)* |
| 8 | **User Management** | `/users` | [`10-create-staff-user.drawio`](../sequence/10-create-staff-user.drawio) | [`05-staff-account-activation.drawio`](../state-transition/05-staff-account-activation.drawio) |
| 9 | **My Trips** | `/my-trips` | [`07-driver-view-trips.drawio`](../sequence/07-driver-view-trips.drawio) | [`07-driver-trip-view.drawio`](../state-transition/07-driver-trip-view.drawio) |

**7 of 9 modules** have dedicated state diagrams. Depot Management and Reporting & Analytics are aggregate/read-only modules with no status field in the data model.

---

## 3. Sequence diagrams by module

### 1 — Login

**File:** `sequence/01-user-login.drawio`  
**Actors:** User → Login page → Auth API → MongoDB → AuthContext

| Flow | API / behaviour |
|------|-----------------|
| Authenticate | `POST /api/auth/login` — resolve `admins` → `users` → `drivers` |
| Session | `GET /api/auth/me` → JWT stored; redirect by role |
| Guard | Deactivated staff (`isActive: false`) → `403` |

**State:** `state-transition/06-auth-session.drawio`

```
unauthenticated → authenticated (JWT) → logged out → unauthenticated
```

---

### 2 — Route Management

**File:** `sequence/02-create-route-with-maps.drawio`  
**Actors:** Transport Scheduler → Routes UI → **Google Maps** → Route API → MongoDB

| Flow | API / behaviour |
|------|-----------------|
| Map planning | Client-side Places / Directions; distance and coordinates computed in browser |
| Persist route | `POST /api/routes` — validate bus, driver, stops |
| External | Google Maps runs in browser only (not proxied by server) |

**State:** `state-transition/02-route-status.drawio` — `draft` → `active` ↔ `inactive`

---

### 3 — Schedule Management

**Create & validate** — `sequence/03-create-schedule-conflict-check.drawio`

| Flow | API / behaviour |
|------|-----------------|
| Pre-check | `GET /api/schedules/conflicts/check` |
| Create | `POST /api/schedules` — route must be `active`; saves `status: draft` |
| Conflict | Overlapping bus/driver/route → `409` |

**Approval workflow** — `sequence/04-schedule-submit-approve.drawio`

| Flow | API / behaviour |
|------|-----------------|
| Submit | `POST /api/schedules/:id/submit` → `pending` |
| Approve | `POST .../approve` → `approved` |
| Reject | `POST .../reject` → `draft` + `rejectionReason` |

**State:** `state-transition/01-schedule-trip-status.drawio`

```
draft → pending → approved → scheduled → on-time / delayed → completed / cancelled
              ↘ reject → draft
```

---

### 4 — Depot Management

**File:** `sequence/06-dashboard-summary.drawio`  
**Actors:** Depot Manager / Administrator → Dashboard UI → Dashboard API → MongoDB

| Flow | API / behaviour |
|------|-----------------|
| Load summary | `GET /api/dashboard` |
| Aggregates | Fleet counts, driver on-duty, maintenance alerts, trip stats, active routes |

---

### 5 — Fuel & Maintenance

**Maintenance** — `sequence/08-log-maintenance.drawio`

| Flow | API / behaviour |
|------|-----------------|
| Log service | `POST /api/maintenance` — bus_id, date, description, cost |
| Side effect | Bus `status` auto-set to `maintenance` |

**State:** `state-transition/08-bus-maintenance-cycle.drawio` — `POST /api/maintenance` triggers `available` → `maintenance` → `available`

**Fuel** — `sequence/09-log-fuel.drawio`

| Flow | API / behaviour |
|------|-----------------|
| Log fuel | `POST /api/fuel` — bus_id, litres, amount |
| Summary | `GET /api/fuel/summary` — feeds analytics |

---

### 6 — Driver & Vehicle Management

**File:** `sequence/12-manage-fleet-driver-vehicle.drawio`  
**Actors:** Fleet Manager → Buses / Drivers pages → Bus & Driver API → MongoDB

| Flow | API / behaviour |
|------|-----------------|
| Register bus | `POST /api/buses` — unique `regNumber`, `depotId`, default `available` |
| Register driver | `POST /api/drivers` — unique `licenseNo`, `depotId`, default `available` |
| Update status | `PUT /api/buses/:id` or `PUT /api/drivers/:id` |

**State — Bus:** `state-transition/03-bus-status.drawio`

```
available ↔ in-service ↔ maintenance  (all manual PUT)
```

**State — Driver:** `state-transition/04-driver-status.drawio`

```
available ↔ on-leave ↔ off-duty  (all manual PUT)
```

---

### 7 — Reporting & Analytics

**File:** `sequence/05-export-report.drawio`  
**Actors:** Manager → Reports UI → Report API → MongoDB

| Flow | API / behaviour |
|------|-----------------|
| Dashboard data | `GET /api/reports/dashboard` |
| Export PDF | `GET /api/reports/export/pdf` |
| Export CSV | `GET /api/reports/export/csv` |

---

### 8 — User Management

**File:** `sequence/10-create-staff-user.drawio`  
**Actors:** Administrator → Users UI → User / Auth API → MongoDB (`users`)

| Flow | API / behaviour |
|------|-----------------|
| Create staff | `POST /api/users` — role, `depotId`, password; `isActive: true` |
| Roles | `transport_scheduler`, `fleet_manager`, `depot_manager` |

**State:** `state-transition/05-staff-account-activation.drawio`

```
active (isActive: true) ↔ deactivated (isActive: false)
```

Deactivated accounts cannot log in (`403`).

---

### 9 — My Trips

**File:** `sequence/07-driver-view-trips.drawio`  
**Actors:** Driver → My Trips UI → Schedule API → MongoDB

| Flow | API / behaviour |
|------|-----------------|
| List trips | `GET /api/schedules?fromDate&toDate` |
| Scope | API auto-filters `driverId = req.user.driverId` for driver role |
| Display | Route, times, status badges (scheduled, on-time, delayed, completed) |

**State:** `state-transition/07-driver-trip-view.drawio` — driver-visible trip states (subset of full schedule lifecycle in ST-01)

---

## 4. State-transition summary

| File | Module | Entity | States |
|------|--------|--------|--------|
| `01-schedule-trip-status.drawio` | Schedule Management | `schedules` | draft, pending, approved, scheduled, on-time, delayed, completed, cancelled |
| `02-route-status.drawio` | Route Management | `routes` | draft, active, inactive |
| `03-bus-status.drawio` | Driver & Vehicle Management | `buses` | available, in-service, maintenance |
| `04-driver-status.drawio` | Driver & Vehicle Management | `drivers` | available, on-leave, off-duty |
| `05-staff-account-activation.drawio` | User Management | `users` | active, deactivated (`isActive`) |
| `06-auth-session.drawio` | Login | Client session | unauthenticated, authenticated, logged out |
| `07-driver-trip-view.drawio` | My Trips | `schedules` (driver view) | scheduled/approved, on-time, delayed, completed, cancelled |
| `08-bus-maintenance-cycle.drawio` | Fuel & Maintenance | `buses` | available → maintenance (on log) → available / in-service |

All state diagrams use a **vertical (top → bottom)** layout with labelled API transitions.

---

## 5. Regenerate draw.io files

```bash
node diagrams/_generate-extensions.mjs
```

Regenerates SEQ-06 … SEQ-12 and ST-05 … ST-08. SEQ-01 … SEQ-05 and ST-01 … ST-04 are maintained separately.

---

## 6. Coursework checklist

- [ ] Export sequence PNGs for all **9 modules** (12 `.drawio` files)
- [ ] Export state PNGs (8 `.drawio` files; 7 modules + shared bus/driver states)
- [ ] Insert figures in group report **Sequence Diagram** and **State Transition Diagram** sections
- [ ] Verify API labels match the implemented codebase

---

## 7. Related documentation

- [`../Architectural/ARCHITECTURE.md`](../Architectural/ARCHITECTURE.md) — three-tier architecture
- [`../ER/ER-DIAGRAM.md`](../ER/ER-DIAGRAM.md) — entity relationships
- [`../../docs/REQUIREMENT-M.md`](../../docs/REQUIREMENT-M.md) — module requirements
- [`../../docs/GROUP-REPORT.md`](../../docs/GROUP-REPORT.md) — report submission
