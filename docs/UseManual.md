# TransitLK User Manual

**SRMSS — Smart Route Management and Scheduling System**

| Item | Detail |
|------|--------|
| Access | Web browser — demo: `http://localhost:5173` |
| Password (all demo accounts) | `password123` |

---

## 1. Role access

| Role | Email | Home screen |
|------|-------|-------------|
| Superadministrator | superadmin@transitlk.lk | Admins |
| Administrator | admin@transitlk.lk | Dashboard |
| Transport scheduler | scheduler@transitlk.lk | Routes |
| Fleet manager | fleet@transitlk.lk | Fleet & Drivers |
| Depot manager | depot@transitlk.lk | Dashboard |
| Driver | driver@transitlk.lk | My trips |

| Menu | Super-admin | Admin | Scheduler | Fleet mgr | Depot mgr | Driver |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | | ✓ | | | ✓ | |
| Admins / Depots | ✓ | | | | | |
| Routes / Schedules | | ✓ | ✓ | | ✓ | |
| Fleet & Drivers / Maintenance | | ✓ | | ✓ | | |
| Users / Analytics | ✓ | ✓ | ✓ | | ✓ | |
| My trips | | | | | | ✓ |

---

## 2. Complete operational flow

| Step | Role | Action | Figure |
|------|------|--------|--------|
| 1 | Fleet manager | Add bus and driver | [6](#6-fleet--drivers), [7](#7-add-driver) |
| 2 | Transport scheduler | Create active route; assign fleet | [4](#4-add-route), [5](#5-assign-fleet) |
| 3 | Transport scheduler | Create timetable; fix conflicts; save drafts | [9](#9-create-timetable) |
| 4 | Transport scheduler | Submit trip for approval | [10](#10-submit-for-approval) |
| 5 | Depot manager | Approve pending trip | [11](#11-pending-approvals), [12](#12-approve--reject) |
| 6 | Driver | Start trip on My trips | [13](#13-my-trips) |
| 7 | Driver | Report issue (if needed) | [14](#14-report-issue) |
| 8 | Scheduler / Admin | Review Issues; adjust trip | [15](#15-driver-issues), [16](#16-adjust-trip) |
| 9 | Driver | Mark trip completed | [13](#13-my-trips) |
| 10 | Depot manager | Review Analytics; export report | [19](#19-analytics) |

---

## 3. Interface flows

### 1. Login

| Step | Action |
|------|--------|
| 1 | Open TransitLK URL |
| 2 | Enter email and password |
| 3 | Click **Sign in** |

**Figure 1 — Login screen**

![Figure 1 — Login screen](./images/user-manual/fig-01-login.png)

---

### 2. Dashboard

| Step | Action |
|------|--------|
| 1 | Open **Dashboard** (Administrator / Depot manager) |
| 2 | Review trip counts, fleet summary, recent trips |

**Figure 2 — Dashboard**

![Figure 2 — Dashboard](./images/user-manual/fig-02-dashboard.png)

---

### 3. Routes list

| Step | Action |
|------|--------|
| 1 | Open **Routes** |
| 2 | Search or open a route |

**Figure 3 — Routes list**

![Figure 3 — Routes list](./images/user-manual/fig-03-routes-list.png)

---

### 4. Add route

| Step | Action |
|------|--------|
| 1 | Click **Add route** |
| 2 | Enter number, name, points, distance, service type, stops |
| 3 | Set status **Active**; save |

**Figure 4 — Add route**

![Figure 4 — Add route](./images/user-manual/fig-04-route-add.png)

---

### 5. Assign fleet

| Step | Action |
|------|--------|
| 1 | On route, open **Assign fleet** |
| 2 | Select bus and driver; save |

**Figure 5 — Assign fleet**

![Figure 5 — Assign fleet](./images/user-manual/fig-05-route-assign.png)

---

### 6. Fleet & Drivers

| Step | Action |
|------|--------|
| 1 | Open **Fleet & Drivers** |
| 2 | Use **Fleet** or **Drivers** tab |

**Figure 6 — Fleet & Drivers**

![Figure 6 — Fleet & Drivers](./images/user-manual/fig-06-fleet.png)

---

### 7. Add driver

| Step | Action |
|------|--------|
| 1 | **Drivers** tab → **Add driver** |
| 2 | Enter licence, hours, email, password (for My trips login) |
| 3 | Save |

**Figure 7 — Add driver**

![Figure 7 — Add driver](./images/user-manual/fig-07-driver-add.png)

---

### 8. Schedules daily view

| Step | Action |
|------|--------|
| 1 | Open **Schedules** |
| 2 | Select **Daily** / **Weekly** / **Monthly** |
| 3 | Change date; filter by route or driver |

**Figure 8 — Schedules daily view**

![Figure 8 — Schedules daily view](./images/user-manual/fig-08-schedules-daily.png)

---

### 9. Create timetable

| Step | Action |
|------|--------|
| 1 | Click **Create Timetable** |
| 2 | Choose daily / weekly / monthly |
| 3 | Set times, bus, driver per route |
| 4 | Resolve conflicts; save (draft) |

**Figure 9 — Create timetable**

![Figure 9 — Create timetable](./images/user-manual/fig-09-create-timetable.png)

---

### 10. Submit for approval

| Step | Action |
|------|--------|
| 1 | Open draft trip |
| 2 | Click **Submit for approval** |

**Figure 10 — Submit for approval**

![Figure 10 — Submit for approval](./images/user-manual/fig-10-trip-submit.png)

---

### 11. Pending approvals

| Step | Action |
|------|--------|
| 1 | Open **Pending approvals** / **Approvals** |
| 2 | Select pending trip |

**Figure 11 — Pending approvals**

![Figure 11 — Pending approvals](./images/user-manual/fig-11-pending-approvals.png)

---

### 12. Approve / reject

| Step | Action |
|------|--------|
| 1 | Review trip details |
| 2 | **Approve** or **Reject** (reason required for reject) |

**Figure 12 — Approve / reject**

![Figure 12 — Approve / reject](./images/user-manual/fig-12-trip-approve.png)

---

### 13. My trips

| Step | Action |
|------|--------|
| 1 | Driver signs in → **My trips** |
| 2 | **Start** → **Completed** when finished |

**Figure 13 — My trips**

![Figure 13 — My trips](./images/user-manual/fig-13-my-trips.png)

---

### 14. Report issue

| Step | Action |
|------|--------|
| 1 | On live trip, click **Report issue** |
| 2 | Enter description; submit |

**Figure 14 — Report issue**

![Figure 14 — Report issue](./images/user-manual/fig-14-report-issue.png)

---

### 15. Driver issues

| Step | Action |
|------|--------|
| 1 | On **Schedules**, click **Issues** |
| 2 | Select issue to open trip |

**Figure 15 — Driver issues**

![Figure 15 — Driver issues](./images/user-manual/fig-15-issues-drawer.png)

---

### 16. Adjust trip

| Step | Action |
|------|--------|
| 1 | Click **Adjust**; select trip |
| 2 | Change bus, driver, times, or status |
| 3 | Select reason; add notes; save |

**Figure 16 — Adjust trip**

![Figure 16 — Adjust trip](./images/user-manual/fig-16-adjust-trip.png)

---

### 17. Maintenance

| Step | Action |
|------|--------|
| 1 | Open **Maintenance** |
| 2 | **Log new activity** → Maintenance or Fuel |

**Figure 17 — Maintenance**

![Figure 17 — Maintenance](./images/user-manual/fig-17-maintenance.png)

---

### 18. Fuel log

| Step | Action |
|------|--------|
| 1 | Fuel tab or fuel form |
| 2 | Enter bus, date, litres, amount; save |

**Figure 18 — Fuel log**

![Figure 18 — Fuel log](./images/user-manual/fig-18-fuel-log.png)

---

### 19. Analytics

| Step | Action |
|------|--------|
| 1 | Open **Analytics** |
| 2 | Select period |
| 3 | Export **PDF** or **CSV** |

**Figure 19 — Analytics**

![Figure 19 — Analytics](./images/user-manual/fig-19-analytics.png)

---

### 20. Users

| Step | Action |
|------|--------|
| 1 | Open **Users** (Administrator) |
| 2 | **Add user** → role, depot, credentials |

**Figure 20 — Users**

![Figure 20 — Users](./images/user-manual/fig-20-users.png)

---

### 21. Admins

| Step | Action |
|------|--------|
| 1 | Open **Admins** (Superadministrator) |
| 2 | Add / edit administrator accounts |

**Figure 21 — Admins**

![Figure 21 — Admins](./images/user-manual/fig-21-admins.png)

---

### 22. Depots

| Step | Action |
|------|--------|
| 1 | Open **Depots** (Superadministrator) |
| 2 | Add / edit depot code, name, region, contacts |

**Figure 22 — Depots**

![Figure 22 — Depots](./images/user-manual/fig-22-depots.png)

---

### 23. Notifications

| Step | Action |
|------|--------|
| 1 | Click bell icon (top bar) |
| 2 | Open alert (maintenance, licence, delay, driver issue) |

**Figure 23 — Notifications**

![Figure 23 — Notifications](./images/user-manual/fig-23-notifications.png)

---

## 4. Table of figures

| Figure | Caption | File |
|--------|---------|------|
| 1 | Login screen | `fig-01-login.png` |
| 2 | Dashboard | `fig-02-dashboard.png` |
| 3 | Routes list | `fig-03-routes-list.png` |
| 4 | Add route | `fig-04-route-add.png` |
| 5 | Assign fleet | `fig-05-route-assign.png` |
| 6 | Fleet & Drivers | `fig-06-fleet.png` |
| 7 | Add driver | `fig-07-driver-add.png` |
| 8 | Schedules daily view | `fig-08-schedules-daily.png` |
| 9 | Create timetable | `fig-09-create-timetable.png` |
| 10 | Submit for approval | `fig-10-trip-submit.png` |
| 11 | Pending approvals | `fig-11-pending-approvals.png` |
| 12 | Approve / reject | `fig-12-trip-approve.png` |
| 13 | My trips | `fig-13-my-trips.png` |
| 14 | Report issue | `fig-14-report-issue.png` |
| 15 | Driver issues | `fig-15-issues-drawer.png` |
| 16 | Adjust trip | `fig-16-adjust-trip.png` |
| 17 | Maintenance | `fig-17-maintenance.png` |
| 18 | Fuel log | `fig-18-fuel-log.png` |
| 19 | Analytics | `fig-19-analytics.png` |
| 20 | Users | `fig-20-users.png` |
| 21 | Admins | `fig-21-admins.png` |
| 22 | Depots | `fig-22-depots.png` |
| 23 | Notifications | `fig-23-notifications.png |

---

*End of user manual*
