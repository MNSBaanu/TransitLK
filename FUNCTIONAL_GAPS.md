# TransitLK — Functional Gaps Analysis

## Module-wise list of missing, incomplete, or broken features

---

## 1. Authentication & User Management

| # | Gap | Location | Severity |
|---|---|---|---|
| 1.1 | Password reset / forgot password — no flow exists. Clicking shows an alert: "not available yet" | `client/src/pages/Login.jsx:187-193` | Critical |
| 1.2 | No profile / account settings page — users cannot change name, email, password | `client/src/pages/` (missing `Profile.jsx` / `AccountSettings.jsx`) | High |
| 1.3 | No rate limiting on login — brute-force protection missing | `server/middleware/` (no rate-limit middleware) | High |
| 1.4 | No refresh token rotation — single JWT with hard expiry, no graceful refresh | `server/middleware/authMiddleware.js` | Medium |
| 1.5 | No request validation library — all validation is manual inline checks | All server controllers | High |
| 1.6 | No Content-Security-Policy headers set | `server/server.js` | Medium |
| 1.7 | No "Login as Driver/Staff" toggle — Admin email match always wins over User | `server/controllers/authController.js` | Low |

---

## 2. Dashboard

| # | Gap | Location | Severity |
|---|---|---|---|
| 2.1 | No real-time metrics — all dashboard data is polled, no live counters | `client/src/pages/Dashboard.jsx` | Medium |
| 2.2 | No configurable dashboard widgets — layout is fixed | `client/src/pages/Dashboard.jsx` | Low |

---

## 3. Buses (Fleet)

| # | Gap | Location | Severity |
|---|---|---|---|
| 3.1 | No bus photo / avatar upload | `client/src/pages/Buses.jsx` | Low |
| 3.2 | No bus maintenance history displayed inline on bus detail | `client/src/pages/Buses.jsx` | Medium |
| 3.3 | No current route assignment tracking (which route is this bus on today?) | `server/models/Bus.js` | Medium |
| 3.4 | No odometer reading / mileage tracking | `server/models/Bus.js` | Medium |
| 3.5 | Bus ↔ Driver direct relationship missing — bus has no `currentDriver` field | `server/models/Bus.js` | Medium |

---

## 4. Drivers

| # | Gap | Location | Severity |
|---|---|---|---|
| 4.1 | **Entire Drivers page is a stub** — redirects to `/buses` with no driver CRUD UI | `client/src/pages/Drivers.jsx` | High |
| 4.2 | No driver self-service profile page | `client/src/pages/` (missing) | Medium |
| 4.3 | No driver performance metrics (on-time %, trip completion rate per driver) | `client/src/pages/Reports.jsx` | Medium |
| 4.4 | No driver license document upload / expiry photo | `server/models/Driver.js` | Low |

---

## 5. Routes

| # | Gap | Location | Severity |
|---|---|---|---|
| 5.1 | No fare / pricing field on route model | `server/models/Route.js` | Low |
| 5.2 | No estimated duration field on route | `server/models/Route.js` | Low |
| 5.3 | No route map visualization beyond stop pins | `client/src/pages/Routes.jsx` | Low |
| 5.4 | No route duplication / copy feature | `client/src/pages/Routes.jsx` | Low |

---

## 6. Schedules

| # | Gap | Location | Severity |
|---|---|---|---|
| 6.1 | No batch approve / reject for multiple trips | `client/src/pages/ScheduleApprovals.jsx` | Medium |
| 6.2 | No recurring schedule templates (weekly patterns must be created manually) | `server/controllers/scheduleController.js` | High |
| 6.3 | No schedule version history / audit trail | `server/models/Schedule.js` | Medium |
| 6.4 | No calendar sync (iCal / Google Calendar export) | `client/src/pages/Schedules.jsx` | Low |
| 6.5 | `ScheduleTripDetailsDrawer` is read-only — no inline editing | `client/src/components/schedules/ScheduleTripDetailsDrawer.jsx` | Medium |
| 6.6 | Gantt chart has no drag-to-resize trip bars | `client/src/components/schedules/ScheduleGantt.jsx` | Medium |
| 6.7 | No client-side conflict pre-check before saving draft — only caught on submit | `client/src/pages/Schedules.jsx` | High |
| 6.8 | Month overview cannot create trips directly from the calendar | `client/src/components/schedules/ScheduleMonthOverview.jsx` | Low |
| 6.9 | No driver status indicator in timetable (on-duty / off-duty / assigned) | `client/src/components/schedules/ScheduleWeekTimetable.jsx` | Low |

---

## 7. Maintenance

| # | Gap | Location | Severity |
|---|---|---|---|
| 7.1 | Inconsistent field naming — uses `bus_id` (snake_case) instead of `busId` (camelCase) | `server/models/Maintenance.js`, `client/src/pages/Maintenance.jsx` | High |
| 7.2 | No recurring maintenance scheduling | `client/src/pages/Maintenance.jsx` | Medium |
| 7.3 | No odometer-based maintenance triggers | `server/controllers/maintenanceController.js` | Medium |
| 7.4 | No maintenance cost analytics / trends | `client/src/pages/Maintenance.jsx` | Low |
| 7.5 | No maintenance parts / inventory tracking | `server/models/` (missing) | Low |

---

## 8. Fuel

| # | Gap | Location | Severity |
|---|---|---|---|
| 8.1 | Inconsistent field naming — uses `bus_id` (snake_case) instead of `busId` | `server/models/FuelLog.js`, `client/src/pages/Maintenance.jsx` (Fuel tab) | High |
| 8.2 | **Depot managers cannot access fuel** — `FUEL_ACCESS` roles missing `DEPOT_MANAGER` | `client/src/config/roles.js` | High |
| 8.3 | No fuel receipt / attachment upload | `client/src/pages/Maintenance.jsx` | Low |
| 8.4 | No auto fuel price calculation — user must manually look up CEYPETCO rates | `client/src/pages/Maintenance.jsx:32-69` | Medium |
| 8.5 | No per-vehicle fuel efficiency trend chart | `client/src/pages/Maintenance.jsx` | Low |

---

## 9. Reports & Analytics

| # | Gap | Location | Severity |
|---|---|---|---|
| 9.1 | No cost-per-km analysis report | `client/src/pages/Reports.jsx` | Medium |
| 9.2 | No automated / scheduled report emailing | `server/services/` | Medium |
| 9.3 | Excel export uses deprecated SpreadsheetML XML (.xls), not true .xlsx | `server/utils/excelExport.js` | Medium |
| 9.4 | No PDF preview before download | `client/src/pages/Reports.jsx` | Low |
| 9.5 | No print stylesheet — `reports-print` class exists but no `@media print` CSS | `client/src/pages/Reports.jsx:513` | Low |

---

## 10. Notifications

| # | Gap | Location | Severity |
|---|---|---|---|
| 10.1 | **No real-time push** — notifications are polled every 2 minutes via `setInterval` | `client/src/hooks/useNavHub.js:97-100` | High |
| 10.2 | `driver_issue` and `license_expiry_warning` types have no `link` handler navigating to correct page | `server/controllers/notificationController.js` | Medium |
| 10.3 | `notifyDriverIssue.js` and `notifyTripApproved.js` are empty / stubbed — no actual notification emission | `server/utils/notifyDriverIssue.js`, `server/utils/notifyTripApproved.js` | High |

---

## 11. Messages (Depot Chat)

| # | Gap | Location | Severity |
|---|---|---|---|
| 11.1 | **No real-time delivery** — messages are fetched via manual API calls, no Socket.io push | `client/src/pages/Messages.jsx` | Critical |
| 11.2 | **Driver cannot participate** — `senderModel` enum only includes `User` and `Admin`, no `Driver` | `server/models/Message.js` | High |
| 11.3 | No typing indicator | `client/src/pages/Messages.jsx` | Low |
| 11.4 | No message attachments / file sharing | `server/models/Message.js` | Low |
| 11.5 | No read receipts shown in the UI | `client/src/pages/Messages.jsx` | Low |

---

## 12. Real-Time & Live Features

| # | Gap | Location | Severity |
|---|---|---|---|
| 12.1 | **No Socket.io / WebSocket layer anywhere in the app** — no real-time communication | Entire application | Critical |
| 12.2 | Live driver GPS location is one-way (driver → server) — no broadcast to depot staff | `client/src/hooks/useDriverLiveLocationSharing.js` | High |
| 12.3 | `ScheduleTripLocationPanel` exists but has no real-time subscription | `client/src/components/schedules/ScheduleTripLocationPanel.jsx` | High |
| 12.4 | No push notifications for drivers (bell icon is hidden for drivers) | `client/src/components/Navbar.jsx:176` | Medium |

---

## 13. Depots

| # | Gap | Location | Severity |
|---|---|---|---|
| 13.1 | No depot map / location view | `client/src/pages/Depots.jsx` | Low |
| 13.2 | No depot performance stats (buses assigned, staff count, active trips) | `client/src/pages/Depots.jsx` | Medium |
| 13.3 | No depot-to-depot route management | `client/src/pages/Depots.jsx` | Low |

---

## 14. User & Admin Management

| # | Gap | Location | Severity |
|---|---|---|---|
| 14.1 | Users and Admins managed in same page but routed to different API endpoints — adds complexity | `client/src/pages/Users.jsx` | Medium |
| 14.2 | Admins page overlaps significantly with Users page — two UIs for the same data | `client/src/pages/Admins.jsx` vs `client/src/pages/Users.jsx` | Medium |
| 14.3 | No bulk user import completion report | `client/src/pages/Users.jsx` | Low |

---

## 15. CSV Import / Export

| # | Gap | Location | Severity |
|---|---|---|---|
| 15.1 | No client-side row preview before CSV import | `client/src/components/import/CsvImportButtons.jsx:104` | Medium |
| 15.2 | No column mapping UI — server expects exact column headers | `client/src/components/import/CsvImportButtons.jsx` | Medium |
| 15.3 | No partial import — one failing row may reject entire batch | `server/controllers/importController.js` | Medium |

---

## 16. UI / UX

| # | Gap | Location | Severity |
|---|---|---|---|
| 16.1 | No dark mode — all CSS uses white backgrounds | Entire codebase | Low |
| 16.2 | No loading skeleton / shimmer components — all pages use plain "Loading..." text | All pages | Medium |
| 16.3 | No PWA manifest / service worker — no offline support | `client/` (missing) | Medium |
| 16.4 | No test files anywhere in the project | `server/` and `client/` (missing `tests/` or `__tests__/`) | Critical |
| 16.5 | No seed data scripts | `server/` (missing `seeds/`) | Medium |

---

## 17. Database & Data Model

| # | Gap | Location | Severity |
|---|---|---|---|
| 17.1 | Compound indexes missing for common query patterns | `server/config/db.js` | Medium |
| 17.2 | One-time backfill scripts not maintained for ongoing consistency | `server/utils/timeFormatBackfill.js`, `driverProfileBackfill.js`, `reportDataBackfill.js` | Low |

---

## Summary of Critical Items

| # | Gap | Module |
|---|---|---|
| 1 | No WebSocket/Socket.io — real-time features don't work | Cross-cutting |
| 2 | Password reset completely missing | Auth |
| 3 | No test files | Cross-cutting |
| 4 | Driver cannot send messages | Messages |
| 5 | Driver live location is one-way only | Schedules |
| 6 | Depot managers cannot access fuel | Fuel |
| 7 | Drivers page is a stub redirect | Drivers |
| 8 | `notifyDriverIssue.js` / `notifyTripApproved.js` are empty | Notifications |
| 9 | Inconsistent `bus_id` vs `busId` naming | Maintenance, Fuel |
