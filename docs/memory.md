# Claude Memory File (memory.md)

## 1️⃣ Project Overview
**Project Name:** Tourism Management App  
**Description:**  
A full-stack tourism platform where users can search destinations, book hotels, plan routes, view seasonal charts, and receive personalized recommendations. Admins and hotel managers manage content and monitor user activity.  
**Actors:**  
- Tourist  
- Admin (manage user reports, system content)  
- Hotel Manager  

---

## 2️⃣ Workflow Instructions
1. **Task Flow:**  
   - Receive use case → Implement frontend → Implement backend + database → Test → Correct errors → Update `error.md`  
2. **Error Handling:**  
   - Log every new error in `error.md` with cause & resolution.  
   - Review `error.md` before writing new code to avoid repeating mistakes.  
3. **Session Instructions:**  
   - Always read `claude.md` before starting tasks to follow project guidelines.  
4. **Frontend ↔ Backend ↔ MySQL Flow:**  
   - All three must be running for data persistence:  
     ```
     Browser → Spring Boot Backend → MySQL
     ```
   - If MySQL is down, backend will fail → frontend shows error message.  

---

## 3️⃣ Coding Conventions & Guidelines
- Follow naming conventions for files, variables, functions.  
- Maintain consistent UI/UX style (colors, buttons, layout).  
- Backend: REST API structure, proper exception handling, DB schema consistency.  
- Always avoid repeating mistakes listed in `error.md`.  

---

## 4️⃣ High-Level Features
1. User Authentication (Login / Signup)  
2. Age-Based Recommendations  
3. Destination Search & Filtering  
4. Souvenirs & Travel Guidelines  
5. Seasonal Charts & Visualizations  
6. Favorite Destinations (Wishlist)  
7. Emergency & Safety Information  
8. Route Finder (likely using Google Maps)  
9. Weather Alerts  
10. Admin Panel & Content Management  
**Additional Features:**  
11. Trip Cost Estimation (fuel, food, lodging)  
12. Destination Ratings  
13. Hotel Reservation  

---

## 5️⃣ Use Cases (Summary)
| Use Case | Description |
|----------|-------------|
| 2.1 | Create User Account |
| 2.2 | Authenticate User |
| 2.3 | Delete User Account |
| 2.4 | Update Personal Profile |
| 2.5 | Generate Profile-Based Recommendations (Extends 2.4) |
| 2.6 | Search Destinations |
| 2.7 | Show Travel Guidelines |
| 2.8 | Show Souvenirs |
| 2.9 | Manage Favorite Destinations |
| 2.10 | Rate Visited Destination |
| 2.11 | Calculate Trip Cost Estimation |
| 2.12 | Execute Route Finder |
| 2.13 | Book Hotel Reservation |
| 2.14 | View Seasonal Charts & Visualizations |
| 2.15 | Provide Emergency Info |
| 2.16 | Push Weather Alerts |
| 2.17 | Send Notification (Extends 2.16) |
| 2.18 | Manage System Control |
| 2.19 | View System Statistics |
| 2.20 | Monitor User Activity |
| 2.21 | Moderate User Activity |
| 2.22 | Manage Hotel Partner Listing |

---

## 6️⃣ Notes & Reminders
- Always check that **MySQL, Backend, Frontend** are running before testing.  
- Maintain `error.md` updated with cause & fix for every error.  
- Avoid repeating mistakes.  
- Use this memory file as **Claude’s primary reference** for workflow, rules, and features.  