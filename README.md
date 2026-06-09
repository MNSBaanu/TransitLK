# TransitLK

Web platform for Sri Lankan public transport depots — routes, timetables, fleet, maintenance, and role-based approvals.

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Stack](https://img.shields.io/badge/stack-MERN-61DAFB)
![License](https://img.shields.io/badge/license-MIT-green)

## Prerequisites

- Node.js 18+
- MongoDB
- Google Maps API key (route maps & distance)

## Setup

```bash
git clone <repo-url>
cd TransitLK

cd server && npm install
cd ../client && npm install
```

### Environment

`server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/transitlk
JWT_SECRET=your_secret
```

`client/.env` (optional):

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Run

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). The client proxies `/api` to `http://localhost:5000`.

## Roles

| Role | Main modules |
|------|----------------|
| Superadministrator | Admins, Depots, Analytics |
| Administrator | Dashboard, Routes, Schedules, Fleet, Users, Maintenance, Analytics |
| Transport Scheduler | Routes, Schedules, Analytics |
| Fleet Manager | Fleet & Drivers, Maintenance |
| Depot Manager | Dashboard, Schedules (approve/reject/adjust), Analytics |
| Driver | My trips |

Login emails and default password: see [`docs/Summary.md`](docs/Summary.md).

## Project layout

```
client/     React frontend
server/     Express API, models, scripts
docs/       Requirements, diagrams, credentials
```

## License

MIT — see [LICENSE](LICENSE).
