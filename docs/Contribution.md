# TransitLK — Team Contribution

## Baanu

| Module | UI path | Main functions implemented |
|--------|---------|----------------------------|
| **Routes** | `/routes` | Route catalogue; create/edit/delete routes; bus and driver assignment; map and stops; route status (draft/active/inactive) |
| **Schedules** | `/schedules`, `/schedules/approvals` | Daily, weekly, and monthly timetables; trip CRUD; bus/driver/route conflict detection; draft → pending → approved workflow; Gantt-style daily view |
| **Analytics** | `/reports` | Operational KPIs; route performance; date-range filtering; PDF and CSV export |
| **Depots** | `/depots` | Superadministrator depot CRUD; depot list and detail; depot scoping for workspace data |
| **Admin Management** | `/admins` | Superadministrator CRUD for depot administrators; depot assignment; account activation |

## Irfa

| Module | UI path | Main functions implemented |
|--------|---------|----------------------------|
| **Depot Dashboard** | `/dashboard` | Trip and fleet KPIs; recent trips panel; status summaries for administrators and depot managers |
| **Fleet & Drivers** | `/buses`, `/drivers` | Bus and driver CRUD; fleet status; driver portal credentials; assignment eligibility for routes/schedules |
| **Maintenance** | `/maintenance` | Maintenance record logging; fuel logs; fuel and maintenance reports (view, CSV, PDF) |
| **User Management** | `/users` | Staff account CRUD (transport scheduler, fleet manager, depot manager); role and depot assignment; activate/deactivate users |
| **Login** | `/login` | Email/password sign-in; JWT session; role-based redirect after login; protected route guard |
| **My Trips** | `/my-trips` | Driver trip list; start/complete trip; report issues; driver-scoped schedule API |


