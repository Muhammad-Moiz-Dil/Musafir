# error.md — Tripify Error & Issue Log

This file tracks known errors, bugs, and issues found during development.
**Before generating any new code, always review this file first.**

---

## Format
Each entry follows:
```
### [ERROR-XXX] Short Title
- **File**: path/to/file
- **Type**: Bug | Schema | Logic | Frontend | Backend
- **Status**: Open | Fixed | Wont-Fix
- **Description**: What the problem is
- **Fix Applied**: What was done to resolve it (if Fixed)
```

---

## Schema Issues

### [SCHEMA-001] No Trip/TripPlan table
- **File**: database/TripifyDB.sql
- **Type**: Schema
- **Status**: Fixed
- **Fix Applied**: Added `Trips` table (user-owned trip plans with status, budget, dates) and `TripDestinations` table (ordered multi-destination stops with optional hotel selection per stop).

### [SCHEMA-002] Reviews only linked to Destinations, not Hotels
- **File**: database/TripifyDB.sql
- **Type**: Schema
- **Status**: Fixed
- **Fix Applied**: Added `HotelReviews` table with FK to `Hotels`, optional FK to `Bookings`, unique constraint per user/hotel. Also added `average_rating` and `total_reviews` columns to the `Hotels` table.

### [SCHEMA-003] Bookings missing payment fields
- **File**: database/TripifyDB.sql
- **Type**: Schema
- **Status**: Fixed
- **Fix Applied**: Added `payment_status` (Unpaid/Paid/Refunded), `payment_method`, and `payment_reference` columns to `Bookings`. Added index on `payment_status`.

### [SCHEMA-004] FlaggedContent — flagged_by implies Admin only
- **File**: database/TripifyDB.sql
- **Type**: Schema
- **Status**: Fixed
- **Fix Applied**: Renamed `flagged_by` → `reported_by` (any user can report). Added `reviewed_by` column (FK to Users, Admin who reviewed the flag).

### [SCHEMA-005] Souvenirs has no availability/stock field
- **File**: database/TripifyDB.sql
- **Type**: Schema
- **Status**: Fixed
- **Fix Applied**: Added `is_active BIT DEFAULT 1` to `Souvenirs` table.

### [SCHEMA-006] Non-standard pom.xml location
- **File**: Backend/src/pom.xml → Backend/pom.xml
- **Type**: Backend
- **Status**: Fixed
- **Fix Applied**: Created a full Spring Boot 3.2.3 `pom.xml` at `Backend/pom.xml` (correct Maven root). Deleted `Backend/src/pom.xml` and the empty `Backend/src/` directory. Dependencies included: Spring Web, Data JPA, Security, Validation, MSSQL JDBC, JJWT (0.11.5), Lombok.

### [SCHEMA-007] exception handling folder has a space in the name
- **File**: Backend/main/java/com/exception handling/
- **Type**: Backend
- **Status**: Fixed
- **Fix Applied**: Renamed folder to `Backend/main/java/com/exceptionhandling/` (valid Java package name).

---

## Active Bugs
_None — development not started._

---

## Fixed Issues
SCHEMA-001 through SCHEMA-007 — all fixed at project setup stage.
