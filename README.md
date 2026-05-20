# TransitLK

> **Smart Route Management and Scheduling System (SRMSS)**  
> A centralized web platform for digitalizing public transport depot operations in Sri Lanka.

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![Stack](https://img.shields.io/badge/stack-MERN-61DAFB)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Overview

TransitLK eliminates the dependency on manual scheduling and fragmented spreadsheets used across Sri Lankan public transport depots. It provides authorized personnel — administrators, supervisors, and depot staff — with a unified digital platform to manage routes, schedules, vehicles, and drivers efficiently.

---

## Features

| Module | Description |
|---|---|
| Route Planning | Create and manage routes with stops, distances, and bus/driver assignments via Google Maps |
| Schedule Management | Build timetables with automatic conflict and overlap detection |
| Depot Dashboard | Real-time visibility into active routes, buses, drivers, and trip statuses |
| Fuel & Maintenance Log | Track fuel usage and log vehicle maintenance per trip |
| Driver & Vehicle Database | Manage driver profiles, license validity, vehicle specs, and service history |
| Reporting & Analytics | Export PDF reports on trip completion, route performance, and fuel trends |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Authentication | JWT (disabled during development) |
| Maps | Google Maps API |
| Reporting | jsPDF / pdfkit |
| Version Control | Git + GitHub |

---

## Project Structure

```
TransitLK/
├── client/                  # React.js frontend
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Dashboard, Routes, Schedule, etc.
│       └── services/        # Axios API calls
├── server/                  # Node.js + Express.js backend
│   ├── controllers/         # Business logic
│   ├── models/              # Mongoose schemas
│   ├── routes/              # REST API endpoints
│   └── middleware/          # Auth & error handling
├── docs/                    # UML diagrams, reports, user manual
├── tests/                   # Test cases and results
└── README.md
```

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/TransitLK.git
cd TransitLK

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Run development servers
npm run dev   # from root (if concurrently configured)
```

> Requires Node.js v18+, MongoDB instance, and a Google Maps API key.

**Route management:** Create routes with start/end points, intermediary stops, and distance. Assign buses (`busId`) and drivers (`driverId`) via foreign keys with populated fleet details. Add `VITE_GOOGLE_MAPS_API_KEY` in `client/.env` for map visualization and auto distance.

```bash
# Sample fleet data for route assignment (from server/)
npm run seed:fleet
```

---

## Environment Variables

Create a `.env` file inside `/server`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
# JWT_SECRET=your_jwt_secret   # optional until auth is re-enabled
```

---

## Contributing

This project is developed as a group academic coursework. 

---

## License

This project is licensed under the [MIT License](LICENSE).
