# TransitLK — Software Testing

**Product:** Smart Route Management and Scheduling System (SRMSS)  
**Methodology:** Agile (4 sprints)  
**Testing types:** Black Box Testing, White Box Testing

---

## 1. Introduction

TransitLK is tested to confirm that implemented modules meet the functional and non-functional requirements. Testing checks:

- User-visible behaviour (black box)
- Internal validation and business rules (white box)
- Integration between the web client, API, and database

Each team member tests the components they implement, as required by the coursework.

---

## 2. Testing in an Agile project

TransitLK is delivered in **four one-week sprints**. Testing runs **during each sprint**, not only at the end of the project.

| Principle | Application |
|-----------|-------------|
| Test early | Each sprint includes test and review before sprint close |
| Test continuously | Features are tested in the same sprint they are built |
| Test the increment | Each sprint delivers a working, demonstrable module set |
| Whole-team quality | All members test their areas; integration tested in later sprints |

A feature is considered complete when it works as specified, passes black-box checks for main success and error paths, and passes white-box checks on critical validation logic where applicable.

---

## 3. Testing strategy

TransitLK uses a **hybrid strategy**:

| Approach | Used for |
|----------|----------|
| **Black box testing** | UI workflows, role access, reports, end-to-end scenarios |
| **White box testing** | Validation helpers, conflict detection, auth rules, API error paths |

Supporting test types: **functional**, **integration**, **regression**, **acceptance**, and basic **security** (sign-in and role-based access).

---

## 4. Test levels

| Level | What is tested | When |
|-------|----------------|------|
| **Unit** | Individual functions and validators (time overlap, working hours, location checks) | During development, each sprint |
| **Integration** | Client ↔ API ↔ database (login, CRUD, schedule save, logs) | Same sprint as the feature |
| **System** | Full modules against requirements (routes, schedules, fleet, dashboard, analytics) | End of each sprint; full regression in Sprint 4 |
| **Acceptance** | Role-based depot workflows (plan → approve → operate → report) | Sprint review and final release |

```
Acceptance  →  role scenarios and sprint demos
    ↑
System      →  full modules and RBAC
    ↑
Integration →  API, database, and UI together
    ↑
Unit        →  helpers and validation logic
```

---

## 5. Black box testing

Tests are designed from **requirements and expected inputs/outputs** without inspecting internal code.

### Techniques

| Technique | Use in TransitLK |
|-----------|------------------|
| Equivalence partitioning | Valid/invalid login; active vs inactive routes; bus availability |
| Boundary value analysis | Departure/arrival times; report date ranges; working hours |
| Decision table testing | Schedule approval; role vs module access |
| State transition testing | Trip status: draft → pending → approved → scheduled → completed/cancelled |
| Scenario testing | End-to-end depot workflows |

### Coverage by module

| Module | Focus |
|--------|---------|
| Authentication | Sign-in, role redirect, deactivated accounts |
| Users / Admins / Depots | Account and depot management |
| Routes | Create, edit, inactive, delete rules, fleet assignment |
| Schedules | Timetables, conflicts, submit, approve/reject, adjustments |
| Fleet & drivers | Registration, status, assignment warnings |
| Maintenance | Fuel and maintenance logging |
| Dashboard | Summary figures, trip status, alerts |
| Analytics | KPIs, PDF and CSV export |
| My trips | Driver view of assigned trips only |

---

## 6. White box testing

Tests examine **internal logic**: branches, conditions, validation paths, and data flow.

### Techniques

| Technique | Use in TransitLK |
|-----------|------------------|
| Branch coverage | Schedule conflict and assignment validators |
| Path testing | Validate → conflict check → save or reject |
| Condition coverage | Multiple conflict causes (bus, driver, time, maintenance) |
| API response testing | Correct status codes and error messages |

### Coverage by area

| Area | Focus |
|------|--------|
| Schedule validation | Overlap detection, timetable rules, approval guards |
| Route assignment | Bus capacity, service type, driver working hours |
| Authentication | Password check, inactive user block, role on API |
| Reporting | Date-range parsing and analytics aggregation |
| Client guards | Role-based page access |

---

## 7. Testing by sprint

| Sprint | Deliverables | Test levels | Black box | White box |
|--------|--------------|-------------|-----------|-----------|
| **1** | Login, Users, Admins, Depots | Integration, System | Sign-in, menus, user CRUD | Auth and access rules |
| **2** | Fleet, Routes, Maps | Integration, System | Route and fleet forms | Assignment validation |
| **3** | Schedules, Conflicts, Fuel & Maintenance | Unit, System | Timetables, approval, logs | Conflict detection |
| **4** | Analytics, Dashboard, Deployment | System, Acceptance | Reports, export, full workflows | Regression on validators |

---

## 8. Evaluation summary

Testing quality is assessed against the requirements in `REQUIREMENT-M.md` and `REQUIREMENT-M1.md`.

### Evaluation criteria

| Criterion | Description |
|-----------|-------------|
| Functional completeness | Core modules operate as specified |
| Correctness | User workflows produce expected results |
| Reliability | Conflict and validation rules are enforced |
| Security and access | Authentication and role permissions work correctly |
| Usability | Navigation and messages are clear for depot staff |
| Regression | Earlier sprint features remain stable in Sprint 4 |

### Module evaluation

| Module | Black box | White box | Assessment |
|--------|:---------:|:---------:|------------|
| Authentication | ✓ | ✓ | Meets sign-in and access requirements |
| Users / Admins / Depots | ✓ | — | Meets account and registry requirements |
| Routes | ✓ | ✓ | Meets route planning requirements |
| Fleet & drivers | ✓ | ✓ | Meets fleet database requirements |
| Schedules & conflicts | ✓ | ✓ | Meets scheduling and conflict requirements |
| Fuel & maintenance | ✓ | — | Meets logging requirements |
| Dashboard | ✓ | — | Meets operational overview requirements |
| Analytics & export | ✓ | ✓ | Meets reporting requirements |
| My trips | ✓ | — | Meets driver read-only requirements |
| RBAC | ✓ | ✓ | Meets role separation requirements |

### Overall conclusion

TransitLK testing follows an **Agile, sprint-based approach** with **black box testing** as the primary method for user-facing modules and **white box testing** for high-risk logic such as schedule conflicts, assignment rules, and authentication.

The system modules align with the specified requirements. Black box testing confirms that each role can complete its intended workflows. White box testing confirms that validation and conflict rules behave correctly at the API and helper level. Testing is integrated into every sprint, supporting continuous quality rather than a single end-phase test activity.

---

*End of document*
