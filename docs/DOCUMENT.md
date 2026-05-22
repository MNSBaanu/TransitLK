# CS6003 – Advanced Software Engineering COURSEWORK-1

## Smart Route Management and Scheduling System (SRMSS) for Public Transport Depots

Public transport depots play a crucial role in ensuring the smooth operation of daily commuting services. Each depot manages multiple buses, drivers, and routes that connect cities, towns, and rural areas. However, in Sri Lanka, depot operations still rely heavily on manual record-keeping and spreadsheet-based systems, leading to inefficiencies in scheduling and fleet utilization.

Currently, route assignments, driver allocations, and bus schedules are manually maintained by logistics officers or depot clerks. This traditional method often results in route overlaps, scheduling conflicts, delayed departures, and underutilization of vehicles. Moreover, the absence of centralized digital coordination makes it difficult for management to monitor operational performance or ensure optimal use of available resources.

Thus, the **Smart Route Management and Scheduling System (SRMSS)** is proposed as an integrated platform that digitalizes and streamlines the route planning and scheduling processes across public transport depots.

> **Group report (draft):** See [`GROUP-REPORT.md`](./GROUP-REPORT.md)  
> **Agile timeline & Gantt:** See [`AGILE-TIMELINE.md`](./AGILE-TIMELINE.md)  
> **Requirements specification:** See [`REQUIREMENTS.md`](./REQUIREMENTS.md) for Version 1 functional, non-functional, system, and domain requirements.

---

## Proposed Solution

The proposed system eliminates the dependency on manual paperwork and fragmented spreadsheets by providing a centralized digital dashboard accessible by authorized personnel. It will enhance operational transparency, improve time management, and promote sustainability by optimizing existing resources rather than expanding the fleet or infrastructure.

The system will be built with scalability and usability in mind, ensuring it can be deployed in multiple depots while maintaining secure and reliable access for administrators, supervisors, and operational staff.

**Current build (MVP):** TransitLK runs against **one depot** — a single operational site with shared routes, schedules, and fleet data. This keeps development and demos simple while the core modules (route planning, scheduling, fleet, dashboard) are completed.

**Future rollout:** The same platform is intended for **depots across Sri Lanka** (island-wide). The `Depot` entity and `depotId` on users, buses, and drivers are the foundation; later work adds depot scoping on routes/schedules, API filters by depot, and depot-manager dashboards limited to their site. Administrators retain system-wide visibility.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) § Deployment & multi-depot roadmap.

---

## Key Features and Functions

### 1. Route Planning Module

- Enables administrators to create, modify, and manage routes with defined start and end points, intermediary stops, and total distance.
- Facilitates assignment of buses and drivers to specific routes based on vehicle capacity, availability, and service type.
- Provides visual route mapping through integration with online map services (e.g., Google Maps), improving clarity for depot officers.

### 2. Schedule Management

- Allows creation of daily, weekly, and monthly timetables, ensuring each route has clearly defined departure and arrival times.
- Detects and prevents route overlaps or conflicting schedules automatically, reducing manual errors.
- Supports schedule adjustments for emergencies, maintenance work, or unexpected events, providing flexibility in operations.

### 3. Depot Management Dashboard

- A centralized control panel offering an overview of all ongoing operations, including active routes, available buses, and assigned drivers.
- Displays real-time trip status such as “on-time,” “delayed,” or “completed,” giving depot managers better operational visibility.
- Offers summary statistics on total routes, trips completed, and vehicle utilization rates.

### 4. Fuel and Maintenance Log

- Maintains a record of fuel consumption per vehicle, helping identify high-usage routes or inefficient driving patterns.
- Enables logging of routine and corrective maintenance activities, ensuring each vehicle is serviced on time.
- Generates fuel and maintenance summary reports to support eco-friendly and cost-effective operations.

### 5. Driver and Vehicle Management Database

- Stores comprehensive details of drivers, including personal information, license validity, assigned routes, and working hours.
- Keeps a database of vehicles, including registration details, seating capacity, mileage, and maintenance history.

### 6. Reporting and Analytics Module

- Generates automated monthly and weekly reports on trip completion rates, route performance, and fuel consumption trends.
- Provides exportable reports (PDF) for management review and sustainability reporting.
- Supports decision-making by offering data-driven insights into operational efficiency.

---

## Coursework Overview

You are required, using an appropriate software development methodology, to **analyse, design, implement and test** the website for the above case study as shown in the sections below.

---

## 1. Tasks

### Group task (45%)

1. Select appropriate software development methodology.
2. Create a project plan.
3. Develop Software requirements analysis and specification (Functional and Non-Functional Requirements).
4. Design the software using UML diagrams (Use Case Diagram, Class diagram, 3-Tier Architecture Diagram).
5. Develop User Interface and add user manual to the appendix.

### Individual tasks (40%)

1. Each member of the group must implement a part (at least two components) of the software, such as interface including login function, view products.
2. Each member of the group must test their implemented part of the software.
3. Each member provides a reflection on the software development approach carried out to implement the software for the company. Identify the strength of the team work experience and highlight the areas that require improvement. **(500 words)**

### Presentation / Video (15%)

1. This coursework also requires each group to give a **(10 minutes) group presentation** in week 8. The presentation includes the progress made such as the first 3 or 4 tasks of the group work.
2. Each member is required to submit by the deadline a **(5-minute recorded video)** of individual presentation and demo of the implemented task. You are free to use any tool to record your individual presentation.

---

## 2. Submission Guidelines

- **Submission deadline on WebLearn:** Week 12.
- By the deadline you must submit an electronic version of the complete documentation and software to the module WebLearn. This includes group report, individual report, individual recorded presentation, and a link of the working system on GitHub.
- The electronic version of your group report must indicate all group members’ ID number, Surname and First name on the first page or at the beginning of program file (as comments).
- The name of the file must be your ID, as on your ID Card, followed by `-part 1`. For example, a student ID is `09123456`, the file name should be: `09123456-part 1.doc`.
- Comply with word limits of the report that does not exceed **3000 words**.
- If you think there is a good reason for late submission, such as illness, and you have supporting documentary evidence, then you should follow the “mitigating circumstance” procedures outlined by the University Guidelines. Otherwise assignments will **NOT** be accepted by the module leader after the due date.

---

## 3. Marking Scheme (TOTAL 100 MARKS)

The marks for this assessment are based on the following assessment criteria:

| Items | Weighting | Grade F3…A+ |
|-------|-----------|-------------|
| **G** Overall report including report title, abstract, content and page numbers, etc. | 5% | |
| **G** Project planning and analysis — selection of software development methodology, project planning | 10% | |
| **G** System/Software requirements analysis and specification including functional, non-functional requirements, etc. | 10% | |
| **G** Software design and its specification — Software Class Diagram, Use Case Diagram, 3-Tier Architecture Diagram, interface design, and user manual added to the appendix | 20% | |
| **I** Implementation — implement functions as per the UML design; add user manual to the appendix; coding: use any computer programming language | 20% | |
| **I** Testing — software testing such as Black Box Testing or White Box Testing | 10% | |
| **I** Reflection — individual 400 words reflection on the selected approach and team work experience | 10% | |
| **G** Group presentation in week 8 — at least project planning, requirement and design specifications; PowerPoint slides required | 10% | |
| **I** Individual presentation (recorded video) — contents should be the work done by individual student | 5% | |
| **Total** | **100%** | |

**G** = Group | **I** = Individual

> **Note:** This coursework has to be completed in a **group**. Each group has **three students**.

---

## Table 1: Marking Guidelines

| Grade | Characterised by |
|-------|------------------|
| **F3** | No work or work totally irrelevant. |
| **F2** | Unacceptable level of competency. The overall standard is very weak and very few learning outcomes are achieved. |
| **F1** | A very weak level of competency. Use of insufficient skills to apply knowledge and understanding in a range of activities demonstrating a weak comprehension of relevant theories and practices. |
| **D** | A basic level of competency. Use of very basic skills to apply knowledge and understanding in a range of activities demonstrating a basic comprehension of relevant theories and practices. |
| **D+** | An acceptable level of competency. Use of basic skills to apply knowledge and understanding in a range of activities demonstrating an acceptable comprehension of relevant theories and practices. |
| **C** | A satisfactory level of competency. Use of limited skills to apply knowledge and understanding in a range of activities demonstrating a satisfactory comprehension of relevant theories and practices. |
| **C+** | A fairly good level of competency. Use of limited skills to apply knowledge and understanding in a range of activities demonstrating a fairly good comprehension of relevant theories and practices. |
| **B** | A good level of competency. Use of skills to apply knowledge and understanding in a range of activities demonstrating a good comprehension of relevant theories and practices. |
| **B+** | A very good level of competency. Use of skills to apply knowledge and understanding in a range of activities demonstrating a very good comprehension of relevant theories and practices. |
| **A-** | An excellent level of competency of a complex and specialised area of study. Use of advanced skills to apply knowledge and skills in a range of complex activities demonstrating excellent comprehension of relevant theories and practices. |
| **A** | An outstanding level of competency of a complex and specialised area of study. Use of advanced skills to critically evaluate concepts and apply knowledge and understanding in a range of activities demonstrating an outstanding comprehension of relevant theories and practices. |
| **A+** | Display mastery of a complex and specialised area of study. Use of advanced skills to critically evaluate concepts and apply knowledge and understanding in a range of activities demonstrating an exceptional comprehension of relevant theories and practices. |
