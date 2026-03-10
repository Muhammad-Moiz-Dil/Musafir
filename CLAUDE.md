# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tripify is a travel planning web application (SDA project) for Pakistani tourism destinations. It supports three user roles: **Tourist**, **Admin**, and **HotelManager**.

## Stack

- **Backend**: Java 17, Spring Boot 3.2.3, Maven (`Backend/pom.xml`)
- **Frontend**: Vanilla HTML/CSS/JS (no framework), npm (`Frontend/package.json`)
- **Database**: Microsoft SQL Server (`database/TripifyDB.sql`)

## Development Workflow

- **Always check `error.md` before writing any new code** to avoid repeating known issues.
- For each use case: build **frontend first**, then **backend**.
- Log all new errors/bugs into `error.md` immediately when found.
- Ask the user before changing file structure or adding new files/directories.

## Architecture

### Backend (`Backend/main/java/com/`)
Standard layered Spring Boot architecture:
- `config/` — Security, CORS, JWT configuration
- `controller/` — REST API endpoints
- `exceptionhandling/` — Global error handlers (no space in package name)
- `model/` — JPA entities mirroring DB tables
- `repository/` — Spring Data JPA repositories
- `service/` — Business logic layer
- `utility/` — Shared helpers (JWT utils, etc.)

Backend Maven root is `Backend/` — run all `mvn` commands from there.

### Frontend (`Frontend/src/`)
Plain HTML/CSS/JS with no build step:
- `html/pages/` — Pages by domain: `auth/`, `user/`, `trip/`, `destinations/`, `admin/`, `analytics/`, `emergency/`
- `html/components/` — Reusable UI fragments (cards, buttons)
- `html/includes/` — Shared layout (header, footer, navbar)
- `css/` — Scoped to `common/`, `components/`, `layouts/`, `pages/`
- `js/services/` — All backend API calls
- `js/context/` — Auth state management
- `js/hooks/` — Reusable JS logic
- `js/routes/` — Client-side routing
- `js/config/` — API base URLs and constants

### Database (`database/TripifyDB.sql`)
SQL Server (T-SQL). 17 tables:

| Table | Purpose |
|-------|---------|
| Users | Tourist / Admin / HotelManager accounts |
| Destinations | Travel destinations with ratings |
| Hotels | Hotels per destination, managed by HotelManager |
| Bookings | Hotel bookings with payment tracking |
| Favorites | Tourist's saved destinations |
| Reviews | Destination reviews by Tourists |
| HotelReviews | Hotel-specific reviews, optionally tied to a Booking |
| TravelGuidelines | Visa, culture, safety tips per destination |
| EmergencyInfo | Emergency contacts per destination |
| Souvenirs | Souvenirs per destination with is_active flag |
| SeasonalData | Monthly weather/cost data per destination |
| Trips | User-planned trips (multi-destination) |
| TripDestinations | Ordered stops within a trip, with optional hotel |
| Notifications | Per-user notifications with reference to source entity |
| ActivityLogs | Audit log of user actions |
| FlaggedContent | User-reported reviews; reviewed_by = Admin |
| SystemSettings | Runtime config (API keys, cost constants) |

Sample data (Pakistani destinations: Hunza, Murree, Swat, Skardu, Naran) is included at the bottom of the SQL file.

## Notes

- SQL dialect is T-SQL — use `GO` batch separators and `IDENTITY(1,1)` for auto-increment.
- `SystemSettings` stores the OpenWeatherMap and Google Maps API keys.
- Two git branches: `main` and `testing`.
