# TransitLK User Manual

## Login

1. Open `http://localhost:5173`.
2. Enter work email (e.g. `admin@transitlk.lk`, `scheduler@transitlk.lk`, `driver@transitlk.lk`).
3. Enter password (`password123` for demo accounts).
4. Tick **Remember this device** if needed.
5. Click **Sign in to TransitLK**.

## Sign out

1. Click the profile icon in the top bar.
2. Click **Sign out**.

## Notifications

1. Click the bell icon in the top bar.
2. Click an alert to open the linked screen.
3. Click **Mark all read** to clear unread alerts.

## Dashboard (Administrator, Depot manager)

1. Click **Dashboard** in the sidebar.
2. Review summary cards (routes, buses, drivers, utilization, trip completion).
3. Review bus availability by service type and fleet summary.
4. Click a row under **Today's Schedule** to open trip details.
5. Click **View schedules** to go to the Schedules module.

## Routes (Administrator, Transport scheduler)

### List and search

1. Click **Routes**.
2. Search by route number, name, or stops.
3. Filter by status (Active, Draft, Inactive).
4. Filter by service type (Ordinary, Express, Semi Luxury).
5. Change **Rows** per page (10 or 15).
6. Click **Previous** or **Next** to change page.

### View route

1. Click the route name or the view (eye) icon on a row.
2. Review route details, map, stops, and assigned bus/driver.
3. Click **Back to list** to return.
4. Click **Edit route** to make changes.

### Add route

1. Click **Add route**.
2. Enter **Route No**.
3. Search and select **Start point** on the map or autocomplete.
4. Search and select **End point**.
5. Add **Stops** by searching locations; remove a stop with the × button.
6. Select **Service type** (Ordinary, Express, Semi-luxury).
7. Enter **Distance (km)** (updates from map when available).
8. Set **Route status** to Draft or Active.
9. Click **Save route**.

### Edit route

1. Click the edit icon on a route row, or **Edit route** from the view screen.
2. Update fields as needed.
3. Change status to **Active** when ready for scheduling, or **Inactive** to stop new trips.
4. Click **Save route**, or **Cancel** to discard.

### Delete route

1. Click the delete icon on a route row.
2. Click **Delete route** in the confirmation dialog.
3. If delete is blocked, remove linked schedules first.

## Fleet and drivers (Administrator, Fleet manager)

### Fleet Inventory tab

1. Click **Fleet & Drivers**.
2. Stay on **Fleet Inventory**.
3. Click **Add New Vehicle**.
4. Enter registration number, capacity, mileage, service type, and status.
5. Click **Save**.
6. Click the edit icon to update a bus.
7. Click the delete icon to remove a bus (confirm when prompted).
8. Click **View** on a bus to see linked maintenance history.
9. Click **Maintenance alerts** (if shown) to review buses due for service.
10. Use pagination at the bottom to browse the fleet list.

### Driver Personnel tab

1. Open the **Driver Personnel** tab.
2. Click **Add New Driver**.
3. Enter name, licence number, contact, working hours, and status.
4. Enter email and password (minimum 6 characters) for My trips login.
5. Click **Save**.
6. Use the search box to filter drivers by name or ID.
7. Click the view icon to open driver details.
8. Click the edit icon to update a driver.
9. On edit, click **Reset password** to set a new portal password.
10. Click the delete icon to remove a driver (confirm when prompted).
11. Use pagination to browse the driver list.

## Users (Administrator)

1. Click **Users**.
2. Click **Add staff user**.
3. Enter full name, email, password, role, and depot.
4. Click save in the form.
5. Search accounts by name, email, or role.
6. Click the edit icon to update name, role, depot, or password.
7. Untick **Active** when editing to deactivate an account.
8. Click the delete icon to remove a staff user.

## Admins (Superadministrator)

1. Click **Admins**.
2. Click **Add administrator**.
3. Enter name, email, password, and depot assignment.
4. Click **Save**.
5. Search administrators by name, email, role, or depot.
6. Click **Edit** on a row to update an administrator.
7. Save changes in the form.

## Depots (Superadministrator)

1. Click **Depots**.
2. Click **Add depot**.
3. Enter depot code, region, depot name, location, and contact numbers.
4. Click **Save**.
5. Click **Edit** on a depot row to update details.
6. Click **Delete** on a depot row to remove it (when allowed).

## Schedules (Administrator, Transport scheduler, Depot manager)

### View timetable

1. Click **Schedules**.
2. Select **daily**, **weekly**, or **monthly** view.
3. Click the left or right arrow to change the period.
4. Click the date field (or month field) to jump to a specific day or month.
5. Click a trip in the grid to open trip details.
6. Read the conflict banner at the top (resolve conflicts before approval).

### Create timetable (Administrator, Transport scheduler)

1. Click **Create Timetable**.
2. Select timetable period: **daily**, **weekly**, or **monthly**.
3. Choose the trip date or month.
4. Add route rows and set departure and arrival times (HH:mm).
5. Assign bus and driver for each row.
6. Open the feedback (warning) icon to review validation issues.
7. Fix all conflict errors shown.
8. Click **Send for approval** (or **Send** on mobile) to create pending trips.

### View and approve a single trip (from timetable)

1. Click a trip in the timetable.
2. Review route, bus, driver, times, and status in the details panel.
3. Click **Approve trip** or **Reject trip** (Depot manager, Administrator) if status is pending.
4. Enter a rejection reason when rejecting.
5. Click **Adjust this trip** (Administrator, Transport scheduler) to change an approved or live trip.
6. Click **Close** to return to the timetable.

### Submit draft for approval (Administrator, Transport scheduler)

1. Open a draft trip from the timetable.
2. Click **Submit for approval** in the adjust/details panel, or use **Adjust** → **Submit for approval**.

### Adjust trip (Administrator, Transport scheduler)

1. Click **Adjust** on the Schedules page.
2. Click a trip in the timetable.
3. Change departure time, arrival time, bus, driver, or trip status.
4. Select an adjustment reason and enter notes when required.
5. Use **Swap bus** or **Swap driver** to pick replacements.
6. Click **Apply changes**.
7. Click **Submit for approval** if the trip is still a draft.

### Resolve conflicts (Administrator, Transport scheduler)

1. When the conflict banner shows active conflicts, click **Resolve conflicts**, or click the conflict banner.
2. Open **Adjust** and fix overlapping bus, driver, or route assignments.
3. Re-save until the banner shows no conflicts.

### Driver issues (Administrator, Transport scheduler)

1. Click **Issues** on the Schedules page.
2. Select a trip with a reported driver issue.
3. Open the trip and click **Adjust this trip**.
4. Update bus, driver, times, or status as needed.
5. Click **Apply changes**.

### Pending approvals (Depot manager, Administrator)

1. Click **Pending approvals** on Schedules (or **Approvals** for Administrator).
2. Review route, date, times, bus, and driver for each row.
3. Click **View** for full trip details.
4. Click **Approve** to publish the trip to the driver.
5. Click **Reject**, enter a reason, and confirm.

### Rejected approvals (Transport scheduler, Administrator)

1. Click **Rejected approvals** (scheduler) or open **Approvals** and switch to the rejected tab (administrator).
2. Read the rejection reason on each row.
3. Click **Edit trip** to open the trip in Schedules for changes.
4. Fix the plan and click **Resubmit** to send for approval again.

## My trips (Driver)

1. Sign in with driver email and password.
2. Open **My trips** if not already there.
3. Review upcoming trips (route, date, times, bus, status).
4. Click **Start** when the trip begins.
5. Click **Report issue**, enter a description, and click **Submit report** if delayed or blocked.
6. Click **Completed** when the trip ends.

## Maintenance and fuel (Administrator, Fleet manager)

### Maintenance logs

1. Click **Maintenance**.
2. Open the **Maintenance Logs** tab.
3. Click **Log New Activity**.
4. Choose **Maintenance**.
5. Click **Continue**.
6. Select bus, service date, description, status, and cost.
7. Enter started/completed dates when status requires them.
8. Click **Save**.
9. Search logs using the search box.
10. Click the edit icon to update a maintenance record.
11. Click the delete icon to remove a maintenance record.
12. Use pagination to browse records.

### Fuel logs

1. Open the **Fuel Logs** tab.
2. Click **Log New Activity**.
3. Choose **Fuel**.
4. Click **Continue**.
5. Select bus, fuel date, litres, and amount.
6. Click **Save**.
7. Filter fuel logs with the search box or **Min amount (LKR)** filter.
8. Click edit or delete on a row to update or remove an entry.

### Maintenance report

1. Open the **Report** tab.
2. Select **weekly** or **monthly**, or set custom **from** and **to** dates.
3. Review fuel and maintenance summary on screen.
4. Click **CSV** or **PDF** to download the report.

## Analytics (Superadministrator, Administrator, Transport scheduler, Depot manager)

1. Click **Analytics**.
2. Select **weekly** or **monthly**, or set custom from and to dates.
3. Review KPIs, route performance, fuel trends, and insights on screen.
4. Click **CSV** to export trip data.
5. Click **PDF** to download the operations report.
