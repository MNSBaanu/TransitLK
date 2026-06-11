# Individual Reflection — Baanu

**Product:** TransitLK (Smart Route Management and Scheduling System)  
**Word count:** ~400

---

## Reflection on Selected Approach and Teamwork Experience

Our team adopted **Agile** for TransitLK because the system had to be delivered in one month across many modules. For my work, sprint-based delivery was practical: each week I could finish a testable slice instead of leaving integration until the end.

### My contribution and implementation

I owned the **authentication, route planning, and schedule management** modules across backend and frontend.

In **Sprint 1**, I implemented the Auth API (JWT login, password hashing, protected routes), the Login page, and the Route API with Mongoose models, assignment validation, and the Routes UI.

In **Sprint 2**, I built the Schedule API with daily, weekly, and monthly timetables, **overlap conflict detection** for buses, drivers, and routes, and the Schedules UI with trip creation and Gantt-style views.

In **Sprint 3**, I added schedule status workflows (draft, pending, approved) and the approval UI for depot managers. I tested each module with Postman and manual UI checks in the same sprint.

### My strengths

A key strength was working **full stack on one domain**—from MongoDB schema to Express API to React screen—so login, routes, and schedules connected without hand-off delays. I paid close attention to **validation and edge cases**, such as rejecting trips when a bus or driver was already booked, or when route assignments were incomplete. This reduced integration bugs later. Documenting my modules in the user manual also forced me to verify that the implemented behaviour matched depot workflows.

### Struggles and how I overcame them

The biggest struggle was the team reducing from **three to two members** mid-project. I had to take on more scheduling and approval work while still maintaining auth and routes. I overcame this by **re-prioritising the sprint backlog** with MoSCoW, focusing on core depot features first, and using **Git branches and daily syncs** with my teammate to avoid merge conflicts and duplicated effort.

Schedule **overlap logic** was another challenge. I split conflict checks into helper functions, tested each case in Postman, and fixed issues within the same sprint. Estimating API and UI work together was also difficult; sprint demos helped me adjust plans when integration took longer than expected.

### Teamwork experience

In a smaller team, I learned to raise blockers early and review pull requests promptly. My teammate owned fleet and maintenance while I focused on the scheduling pipeline. Overall, Agile helped me deliver incrementally, and consistent testing and communication made completion possible under time pressure.
