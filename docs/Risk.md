# TransitLK — Risk Analysis

**Product:** Smart Route Management and Scheduling System (SRMSS)  
**Project:** TransitLK  
**Stack:** MERN (MongoDB, Express, React, Node.js)

This document records the five main project risks identified during TransitLK development, how each risk was handled, and the current status.

The project was delivered within a **one-month** development window. The team began with **three members** and continued with **two** after a member left mid-project, which increased workload and delivery pressure on the remaining developers.

TransitLK was completed and demonstrated as a **local** MERN application (MongoDB + Express API + React/Vite on the developer machine). Essential depot features were delivered first, with additional modules added incrementally. Cloud hosting was excluded from the current release.

---

## Risk register

| Risk Category | Impact | Resolution Strategy | Status |
|---------------|--------|---------------------|--------|
| Time Management | High | The full system had to be completed within one month. We used short Agile sprints, daily progress checks, and MoSCoW prioritisation so core modules were finished before the deadline. | Resolved |
| Team Management | High | The team reduced from three to two members during development. We reassigned module ownership, held frequent sync meetings, and used Git so the remaining members could continue work without losing completed code. | Managed |
| Tooling & Technology | Medium | We used the MERN stack and GitHub for shared code. In Sprint 0 we set up the local environment (MongoDB, Express API, React/Vite). We verified the full application locally with Postman and manual UI testing. The system was not deployed to a live host for Version 1. | Resolved |
| Third-Party Integrations | Medium | We tested Google Maps for route planning in development and provided manual coordinate entry when the map service is unavailable, so scheduling and fleet modules still function. | Managed |
| Scope Management | High | With a one-month timeline and a limited development team, we controlled project scope by prioritising essential depot functionalities first. We implemented additional features incrementally. We excluded cloud hosting from the current release to ensure timely project completion. | Resolved |


*End of risk analysis*
