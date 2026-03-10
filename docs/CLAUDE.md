# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tripify is a travel planning web application (SDA project) for Pakistani tourism destinations. It supports three user roles: **Tourist**, **Admin**, and **HotelManager**.

## Stack

- **Backend**: Java (Spring Boot), Maven (`Backend/src/pom.xml`)
- **Frontend**: Vanilla HTML/CSS/JS (no framework), npm (`Frontend/package.json`)
- **Database**: Microsoft SQL Server (`database/TripifyDB.sql`)

## Architecture

### Backend (`Backend/main/java/com/`)
Standard layered Spring Boot architecture:
- `config/` — Security, CORS, JWT configuration
- `controller/` — REST API endpoints
- `exception handling/` — Global error handlers
- `model/` — JPA entities mirroring DB tables
- `repository/` — Spring Data JPA repositories
- `service/` — Business logic layer
- `utility/` — Shared helpers (JWT utils, etc.)

### Frontend (`Frontend/src/`)
Plain HTML/CSS/JS with no build step:
- `html/pages/` — Full pages organized by domain: `auth/`, `user/`, `trip/`, `destinations/`, `admin/`, `analytics/`, `emergency/`
- `html/components/` — Reusable UI fragments (cards, buttons)
- `html/includes/` — Shared layout pieces (header, footer, navbar)
- `css/` — Scoped to `common/`, `components/`, `layouts/`, `pages/`
- `js/services/` — All backend API calls
- `js/context/` — Auth state management
- `js/hooks/` — Reusable JS logic
- `js/routes/` — Client-side routing
- `js/config/` — API base URLs and constants

### Database (`database/TripifyDB.sql`)
SQL Server schema. Core entities and their relationships:
- `Users` (Tourist / Admin / HotelManager)
- `Destinations` → `Hotels` (manager_id → Users)
- `Bookings` (user → hotel)
- `Reviews`, `Favorites` (user → destination)
- `TravelGuidelines`, `EmergencyInfo`, `Souvenirs`, `SeasonalData` (all per destination)
- `Notifications`, `ActivityLogs`, `FlaggedContent`, `SystemSettings`

Sample data (Pakistani destinations: Hunza, Murree, Swat, Skardu, Naran) is included at the bottom of the SQL file.

## Development Notes

- The project is in early scaffold stage — most source files are yet to be created.
- The `Frontend/` has no build tooling configured yet; check `Frontend/package.json` before assuming a dev server command.
- Backend `pom.xml` is at `Backend/src/pom.xml` (non-standard location).
- SQL dialect is T-SQL (MS SQL Server) — use `GO` batch separators and `IDENTITY(1,1)` for auto-increment.
- `SystemSettings` stores the OpenWeatherMap and Google Maps API keys used at runtime.
- Two git branches exist: `main` and `testing`.

# Project Development Guidelines

## 1. Technology Stack

* The **database must be implemented using MS SQL Server**.
* The **backend must be developed using Java**.
* The **frontend must be built using React with HTML, CSS, and JavaScript**.

## 2. Naming Conventions

* All **variable names must follow lower Camel Case convention**.
* Class names must also follow **Upper Camel Case**.
* Names should always be **meaningful and descriptive**.

Example:

* `userAccount`
* `tourBooking`
* `hotelManagerService`

## 3. Code Quality & Readability

* Maintain **proper indentation and formatting** in all files.
* Use **meaningful variable, function, and class names**.
* Avoid unnecessary complexity in functions.
* Keep functions **small and focused on a single responsibility**.

## 4. Documentation

* Every **module, API endpoint, and database table must contain comments/documentation**.
* Comments should clearly explain:

  * Purpose of the module or API
  * Input parameters
  * Output/response
  * Important logic

## 5. Error Tracking

* Any mistake or issue generated during coding must be **recorded in a separate file** (e.g., `errors.md` or `error_log.md`).
* Before generating or running new code, the system must **check previously recorded errors** and ensure the same mistakes are not repeated.

## 6. Folder Structure Policy

* Changes to the **folder structure are not allowed**.
* The system must **only modify files inside the existing structure**.
* If a structural change is necessary, it must be **explicitly approved first**.

## 7. Implementation Rule

* Any requested change must be **fully implemented in code**, not only suggested.
* Code provided should be **ready to run and integrated with the existing project**.

