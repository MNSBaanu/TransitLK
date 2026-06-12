# TransitLK

Smart Route Management and Scheduling System (SRMSS) for Sri Lankan public transport depots, route planning, timetables, fleet and driver management, maintenance, fuel logging, and role-based schedule approvals.

![Stack](https://img.shields.io/badge/stack-MERN-61DAFB)
![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)

**Repository:** https://github.com/MNSBaanu/TransitLK

**Authors:** Baanu & Irfa [Academic project] 

## Features

- **Routes** — create and manage routes with map integration (Google Maps)
- **Schedules** — daily timetables, conflict detection, depot approval workflow
- **Fleet** — buses and drivers, CSV bulk import
- **Maintenance & fuel** — service logs and consumption tracking
- **Reports** — analytics and PDF export
- **Role-based access** — superadministrator through driver portals

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/) (local or Atlas)
- [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key) with Maps JavaScript API and Places API enabled

## Quick start

```bash
git clone https://github.com/MNSBaanu/TransitLK.git
cd TransitLK

cd server && npm install
cd ../client && npm install
```

### Environment

Copy the example files to `.env` in each folder and set your own values:

- `server/.env.example` → `server/.env`
- `client/.env.example` → `client/.env`

| File | Variables |
|------|-----------|
| `server/.env` | `PORT`, `MONGO_URI`, `JWT_SECRET`; optional `CLIENT_URL`, `NODE_ENV` |
| `client/.env` | `VITE_GOOGLE_MAPS_API_KEY` |

See [`server/.env.example`](server/.env.example) and [`client/.env.example`](client/.env.example) for descriptions.

### Run locally

```bash
# Terminal 1 — API (default http://localhost:5000)
cd server && npm run dev

# Terminal 2 — client (default http://localhost:5173)
cd client && npm run dev
```

The Vite dev server proxies `/api` to the backend. Verify the API with `GET http://localhost:5000/api/health`.

### Database

The application expects a populated MongoDB database with depot users and reference data. Provision your own database for local development. The UI supports **CSV import** (sample templates via the API) for vehicles, drivers, routes, users, and maintenance records once an authorised account exists.

> Demo credentials and a pre-seeded database are provided separately for coursework assessment — they are not stored in this repository.

## Roles

| Role | Main modules |
|------|----------------|
| Superadministrator | Admins, Depots, Analytics |
| Administrator | Dashboard, Routes, Schedules, Fleet, Users, Maintenance, Analytics |
| Transport Scheduler | Routes, Schedules, Analytics |
| Fleet Manager | Fleet & Drivers, Maintenance |
| Depot Manager | Dashboard, Schedules (approve / reject / adjust), Analytics |
| Driver | My trips |

## Project layout

```
client/          React (Vite) frontend
server/          Express API, Mongoose models, services
render.yaml      Optional Render.com deployment for the API
```

Local coursework documentation, diagrams, and Postman collections are kept out of this public repository.

## Deployment (optional)

[`render.yaml`](render.yaml) defines a Render web service for the API. Set `MONGO_URI`, `JWT_SECRET`, and `CLIENT_URL` in the host dashboard. Build and host the client separately (e.g. static hosting) with `CLIENT_URL` pointing to that origin.

## Security (public repository)

- **Never commit** `.env` files, API keys, or database connection strings.
- Use a strong, unique `JWT_SECRET` in every environment.
- Restrict your Google Maps API key by HTTP referrer or IP.
- Do not expose MongoDB to the public internet without authentication and network rules.
- If a secret is ever committed, rotate it immediately and purge it from Git history.

## License & use

Copyright © 2026 **Baanu** and **Irfa**. **All rights reserved.**

This is an academic project. You may view and run the code for coursework assessment or academic review only. Commercial use, redistribution, modification for publication, and sublicensing are **not permitted** without written permission from the authors.

Full terms: [LICENSE](LICENSE).
