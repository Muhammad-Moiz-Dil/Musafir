# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tripify is a travel planning web application (SDA project) for Pakistani tourism destinations. It supports three user roles: **Tourist**, **Admin**, and **HotelManager**.

## Stack

- **Backend**: Java 17 (runs on Java 25 JDK), Spring Boot 3.4.3, Maven (`Backend/pom.xml`)
- **Frontend**: Vanilla HTML/CSS/JS (no framework), npm (`Frontend/package.json`)
- **Database**: MySQL (`database/TripifyDB.sql`)

## Development Workflow

- **Always check `error.md` before writing any new code** to avoid repeating known issues.
- For each use case: build **frontend first**, then **backend**.
- Log all new errors/bugs into `error.md` immediately when found.
- Ask the user before changing file structure or adding new files/directories.

## Edge Case & Exception Handling Rules

Every use case must handle the following — no exceptions:

### Frontend
- **Invalid input**: All fields validated on blur and on submit. Show inline field-level error messages, never just a generic alert.
- **Empty / whitespace-only values**: Treat as missing for required fields.
- **Format validation**: Enforce Pakistani phone (`03XX-XXXXXXX`), CNIC (`XXXXX-XXXXXXX-X`), email regex before hitting the API.
- **API errors**: Map every HTTP status to a user-friendly message:
  - `400` → show which fields are wrong
  - `401` → redirect to login
  - `403` → show "You don't have permission"
  - `404` → show "Not found" message in context
  - `409` → show conflict message on the relevant field
  - `422` → map `errors` object to individual field errors
  - `500` / network failure → show a generic retry banner, never crash silently
- **Loading states**: Disable submit buttons and show a spinner during any async call.
- **Double-submit prevention**: Prevent duplicate form submissions while a request is in flight.
- **Success feedback**: Always confirm successful actions before redirecting or resetting the form.

### Backend
- **Bean Validation (`@Valid`)**: Applied on every request body. `GlobalExceptionHandler` converts `MethodArgumentNotValidException` → 422 with field map.
- **Business rule violations**: Checked in the service layer (e.g. duplicate email, Admin self-registration blocked). Throw typed exceptions; never return raw error strings from controllers.
- **Null safety**: Check for null/empty on all optional inputs before using them.
- **Database errors**: Catch `DataIntegrityViolationException` (e.g. unique constraint breaches) and convert to a meaningful 409 response — never let raw SQL errors reach the client.
- **Resource not found**: Throw a dedicated `ResourceNotFoundException` (404) when a requested entity does not exist.
- **Unauthorized access**: Return 401 (unauthenticated) or 403 (wrong role) — never silently return empty data.
- **Catch-all**: `GlobalExceptionHandler` always has a final `Exception` handler returning 500 with a safe generic message — stack traces must never be sent to the client.

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
