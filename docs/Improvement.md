# TransitLK — Future Improvements

**Product:** Smart Route Management and Scheduling System (SRMSS)  
**Current release:** Version 1 — local MERN demo with core depot workflows

Version 1 focused on authentication, route planning, scheduling, fleet management, maintenance logging, analytics, and basic in-app notifications. The improvements below describe how TransitLK could evolve into a production-ready, real-time transport operations platform.

---

## Priority overview

| Priority | Area | Why it matters |
|----------|------|----------------|
| High | Real-time notification system | Faster response to delays, approvals, and maintenance |
| High | Cloud deployment | Multi-depot access beyond a single developer machine |
| High | Driver live location | Operational visibility and passenger ETA accuracy |
| Medium | In-app messaging | Direct coordination between scheduler, manager, and driver |
| Medium | Mobile-optimised driver app | Better field usability than browser-only My Trips |
| Medium | Automated scheduling assistant | Reduce manual conflict fixing at busy depots |
| Low | Passenger-facing portal | Public route info and live bus tracking |
| Low | AI route optimisation | Fuel and time savings across the network |

---

## 1. Real-time notification system

**Current state:** Notifications are generated on demand via the API (maintenance due, schedule conflicts, driver issues). There is no persistent notification centre with live push, email, or SMS delivery.

**Proposed improvements:**

- **Notification centre UI** — bell icon in the app shell; unread count; filter by type (approval, maintenance, delay, message).
- **Event-driven alerts** — auto-trigger when a trip is submitted, approved, rejected, delayed, or when a driver reports an issue.
- **Multi-channel delivery:**
  - In-app (WebSocket or Server-Sent Events for instant updates)
  - Email (e.g. depot manager approval reminders)
  - SMS / WhatsApp (driver shift reminders, urgent reroutes)
- **Role-based subscriptions** — each role chooses which alerts they receive (e.g. fleet manager: maintenance only; depot manager: approvals + delays).
- **Escalation rules** — if a pending approval is not actioned within X hours, notify a backup manager.
- **Audit trail** — log when notifications were sent, read, and acted upon.

**Benefit:** Reduces reliance on staff manually refreshing schedules; critical depot events reach the right person immediately.

---

## 2. In-app messaging between users

**Current state:** Communication happens indirectly through trip status updates and issue flags. There is no direct chat or threaded conversation.

**Proposed improvements:**

- **Depot messaging hub** — scheduler ↔ driver, depot manager ↔ scheduler, fleet manager ↔ driver.
- **Trip-linked threads** — messages attached to a specific schedule/trip (e.g. “Bus 12 delayed — use standby vehicle”).
- **Broadcast messages** — depot-wide announcements (weather alert, holiday timetable change).
- **Read receipts and typing indicators** — confirm drivers saw urgent instructions before departure.
- **File attachments** — share photos (vehicle damage, road blockage) from the driver’s phone.
- **Integration with notifications** — new message triggers a push/in-app alert.

**Benefit:** Faster operational coordination without leaving TransitLK or using separate WhatsApp groups that are not auditable.

---

## 3. Driver live location sharing

**Current state:** Drivers update trip status manually on My Trips. There is no GPS tracking or live map view of active buses.

**Proposed improvements:**

- **GPS capture from driver device** — periodic location updates (every 30–60 seconds) while trip status is *in progress*.
- **Live operations map** — depot dashboard showing all active buses on a map with route colour coding.
- **Geofence alerts** — notify scheduler when a bus arrives at or leaves a stop; detect significant off-route deviation.
- **ETA prediction** — calculate estimated arrival at next stop based on live speed and traffic (Google Directions API).
- **Historical route playback** — review a completed trip path for dispute resolution or performance analysis.
- **Privacy controls** — location shared only during active trips; driver consent and battery-aware sampling on mobile.

**Benefit:** Depot managers gain real-time visibility; supports delay management, passenger information, and safety monitoring.

---

## 4. Cloud deployment and multi-depot scale

**Current state:** Version 1 runs locally (Node.js + MongoDB + React/Vite on the developer machine).

**Proposed improvements:**

- Deploy API to **Render / Railway / Azure**; MongoDB Atlas for managed database.
- Host React frontend on **Vercel / Netlify** with HTTPS.
- **Environment-based config** — separate dev, staging, and production.
- **Multi-tenant depot isolation** — strict data separation per depot at API and database level.
- **Automated backups** and disaster recovery for operational data.

**Benefit:** Enables real depot staff to use the system from any office or device, not only during local demos.

---

## 5. Mobile driver application

**Current state:** Drivers use the mobile browser view of My Trips.

**Proposed improvements:**

- **Progressive Web App (PWA)** or native **React Native** app with offline support.
- One-tap **Start trip / Complete trip / Report issue** with larger touch targets.
- Background GPS for live location (see §3).
- **Offline queue** — save status updates when connectivity is poor; sync when back online.
- **Biometric login** — fingerprint/Face ID for faster sign-in in the field.

**Benefit:** Better usability for drivers who work outdoors with variable network quality.

---

## 6. Intelligent scheduling assistant

**Current state:** Schedulers manually create timetables and fix bus/driver/route conflicts one by one.

**Proposed improvements:**

- **Auto-suggest assignments** — recommend available bus and driver based on shift hours, service type, and maintenance status.
- **Bulk timetable generator** — create a week of trips from a template with automatic conflict resolution suggestions.
- **What-if simulator** — preview impact of adding a new route or removing a bus before saving.
- **Demand-based frequency** — suggest extra trips on high-demand routes using historical analytics.

**Benefit:** Saves scheduler time and reduces human error during peak planning periods.

---

## 7. Enhanced analytics and reporting

**Current state:** Analytics page with KPIs, route performance, and PDF/CSV export.

**Proposed improvements:**

- **Predictive maintenance** — flag buses likely to need service based on mileage and past logs.
- **On-time performance dashboard** — compare planned vs actual times using live GPS data.
- **Fuel efficiency scoring** — rank routes and drivers by fuel consumption per km.
- **Custom report builder** — drag-and-drop metrics for depot managers.
- **Scheduled email reports** — weekly summary auto-sent to administrators.

**Benefit:** Moves from reactive reporting to data-driven depot decisions.

---

## 8. Passenger-facing features

**Current state:** TransitLK is an internal depot system only.

**Proposed improvements:**

- **Public route lookup** — passengers search routes and stops without logging in.
- **Live bus tracker** — show approaching bus on a map using driver GPS (with privacy-safe delay).
- **Delay notifications** — subscribe to a route and receive SMS when a bus is late.
- **QR code at stops** — scan to see next departure times.

**Benefit:** Extends TransitLK value beyond depot staff to the travelling public.

---

## 9. Security and compliance upgrades

**Proposed improvements:**

- **Two-factor authentication (2FA)** for administrators and depot managers.
- **Refresh tokens** and shorter JWT expiry for production.
- **Full audit log** — who changed schedules, approved trips, or edited fleet records.
- **GDPR / data retention policies** — auto-archive old trip and location data.
- **Rate limiting and API monitoring** — protect against abuse on cloud deployment.

**Benefit:** Required for production rollout handling real staff and passenger data.

---

## 10. Integration with external systems

**Proposed improvements:**

- **GTFS export** — standard format for public transport apps.
- **Accounting / ERP integration** — export fuel and maintenance costs.
- **Government reporting API** — automated compliance submissions for licensed operators.
- **Weather API** — suggest timetable adjustments during floods or storms.

**Benefit:** Positions TransitLK as part of a wider transport ecosystem, not a standalone silo.

---

## Suggested roadmap

| Phase | Focus | Example deliverables |
|-------|--------|----------------------|
| **Phase 1** | Production readiness | Cloud deploy, HTTPS, notification centre UI, email alerts |
| **Phase 2** | Real-time operations | WebSocket notifications, in-app messaging, driver GPS |
| **Phase 3** | Intelligence & scale | Scheduling assistant, predictive analytics, multi-depot |
| **Phase 4** | Public & ecosystem | Passenger tracker, GTFS, external API integrations |

---

## Summary

TransitLK Version 1 proves that core depot workflows—login, routes, schedules, fleet, maintenance, and analytics—can be delivered on the MERN stack within a short Agile timeline. The highest-impact next steps are a **full notification system**, **user messaging**, and **driver live location sharing**, because they transform the system from a record-keeping tool into a live operations platform. Cloud deployment and mobile driver support would then make these features usable in real Sri Lankan depot environments.

---

*Related: [`Risk.md`](./Risk.md), [`REQUIREMENT-M1.md`](./REQUIREMENT-M1.md), [`Contribution.md`](./Contribution.md)*
