# TransitLK — 5-minute demo script (Baanu modules + auth)

## Prerequisites

```bash
cd server
npm run seed:auth
# optional: npm run seed:all
npm run dev
```

Default password for all demo accounts: `password123`

| Role | Email |
|------|--------|
| Administrator | admin@transitlk.lk |
| Transport Scheduler | scheduler@transitlk.lk |
| Fleet Manager | fleet@transitlk.lk |
| Depot Manager | depot@transitlk.lk |
| Driver | driver@transitlk.lk |

## Flow

1. Open app → redirected to `/login`.
2. Sign in as **scheduler** → lands on `/routes` (only Routes, Schedules, Analytics in nav).
3. Create/edit a route with map and bus assignment.
4. Open **Schedules** → create trip; show conflict if double-booked.
5. Sign out → login as **depot manager** → `/dashboard` and schedules.
6. Sign out → login as **fleet manager** → `/buses` only (Irfa’s UI).
7. Sign out → login as **driver** → `/my-trips` only.
8. Try typing `/buses` while logged in as driver → redirected to `/my-trips`.

## Deploy smoke (6–7 Jun)

- `/login`, `/routes`, `/schedules`, `/reports` return 200 on live URL with valid JWT.
- Unauthenticated API calls return 401.
