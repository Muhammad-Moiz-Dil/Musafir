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

### [BUG-008] Full name allows numbers — no alpha-only validation
- **File**: `Frontend/src/js/utils/validation.js`, `Backend/main/java/com/controller/AuthController.java`
- **Type**: Frontend + Backend
- **Status**: Fixed
- **Description**: Full name field accepted numbers and special characters like `Ali123` or `Ali@#`. No validation existed to enforce letters-only input.
- **Fix Applied**: Added `Validator.name()` in validation.js with regex `^[a-zA-Z\s.\-']+$`. Applied in `validateFullName()` in both register.html and hm-register.html. Added matching `@Pattern` on backend DTO.

### [BUG-006] Phone number format mismatch — frontend vs backend
- **File**: `Frontend/src/html/pages/auth/register.html`, `hm-register.html`
- **Type**: Frontend / Backend
- **Status**: Fixed
- **Description**: Frontend auto-formats phone to `0300-1234567` (with hyphen) but backend regex `^(\\+92|0092|0)?3[0-9]{9}$` does not allow hyphens. This caused a 422 validation error on every registration with a phone number.
- **Fix Applied**: Strip hyphens before sending: `phoneInput.value.trim().replace(/-/g, '')` in both register.html and hm-register.html.

### [BUG-007] Phone field error not displayed — field name mismatch
- **File**: `Frontend/src/html/pages/auth/register.html`, `hm-register.html`
- **Type**: Frontend
- **Status**: Fixed
- **Description**: Backend returns field name `phoneNumber` in 422 errors but HTML error element ID is `phoneError`. Frontend was looking for `phoneNumberError` which doesn't exist so error was never shown.
- **Fix Applied**: Added `fieldMap = { phoneNumber: 'phone' }` to remap backend field names to HTML element IDs before calling `showError()`.

### [BUG-005] "Failed to fetch" on registration form submit
- **File**: `Frontend/src/html/pages/auth/register.html`, `hm-register.html`
- **Type**: Frontend / Backend
- **Status**: Open
- **Description**: When the registration form is submitted, the browser shows "Failed to fetch". This means the frontend JS called `http://localhost:8080/api/auth/register` but got no response from the server.
- **Root Cause**: Spring Boot backend is not running when the form is submitted.
- **Fix**: Always start the backend first (VS Code Spring Boot Dashboard → ▶ play button) before opening the frontend. Confirm backend is running by checking `Started TripifyApplication` in terminal.

---

## Fixed Bugs

### [BUG-001] HotelReviews cascade cycle — SQL Server Msg 1785
- **File**: `database/TripifyDB.sql`
- **Type**: Schema
- **Status**: Fixed
- **Description**: SQL Server rejected `HotelReviews` table creation because two cascade paths existed from `Users` to `HotelReviews`: (1) direct via `user_id` ON DELETE CASCADE, and (2) indirect via `Users → Bookings (CASCADE) → HotelReviews (SET NULL on booking_id)`. This also caused all tables defined after `HotelReviews` in the same batch (tables 8–17) to never be created, and their INSERTs to fail with "Invalid object name".
- **Fix Applied**: Changed `HotelReviews.booking_id` FK to `ON DELETE NO ACTION`. Changed `HotelReviews.hotel_id` FK to `ON DELETE NO ACTION` (explicit, to avoid any future ambiguity).

## Completed Use Cases
### UC-02 — User Authentication (Login)
- **Frontend**: `login.html` (Tourist/HotelManager), `admin-login.html` (Admin)
- **JS**: `authService.js` → `login()`, `adminLogin()`; `api.js` → `ENDPOINTS.AUTH.LOGIN`, `ENDPOINTS.AUTH.ADMIN_LOGIN`
- **Backend**: `POST /api/auth/login`, `POST /api/auth/admin/login` in `AuthController`
- **Service**: `UserService.login()`, `UserService.adminLogin()`
- **JWT**: `JwtUtil.java` (generate/validate tokens), `JwtFilter.java` (intercept requests), `UserDetailsServiceImpl.java`
- **Config**: `SecurityConfig.java` updated with JWT filter + AuthenticationProvider
- **Responses**: 200 + token on success, 401 on wrong credentials, 403 on wrong role

### UC-01 — Create User Account
- **Frontend**: `Frontend/src/html/pages/auth/register.html`
- **Styles**: `Frontend/src/css/pages/auth.css`, `common/variables.css`, `common/reset.css`
- **JS**: `js/config/api.js`, `js/utils/validation.js`, `js/services/authService.js`
- **Backend**: `AuthController` → `UserService` → `UserRepository` → `User` (entity)
- **Config**: `SecurityConfig.java`, `GlobalExceptionHandler.java`, `application.properties`
- **API**: `POST /api/auth/register` — returns 201 on success, 409 on duplicate email, 422 on field errors

---

### [BUG-002] MySQL password missing in application.properties
- **File**: `Backend/main/resources/application.properties`
- **Type**: Backend / Config
- **Status**: Fixed
- **Description**: App crashed with `Access denied for user 'root'@'localhost' (using password: NO)` because `spring.datasource.password=` was empty but MySQL root had a password set.
- **Fix Applied**: Updated `spring.datasource.password=admin123` in `application.properties`.

### [BUG-003] mvn spring-boot:run from wrong directory
- **File**: Terminal / project root
- **Type**: Backend
- **Status**: Fixed
- **Description**: Running `mvn spring-boot:run` from `Tripify/` root caused `No plugin found for prefix 'spring-boot'`. The `pom.xml` is inside `Backend/` not the root.
- **Fix Applied**: Always run Maven from `Tripify/Backend/` directory.

### [BUG-004] Port 8080 already in use
- **File**: Terminal
- **Type**: Backend
- **Status**: Fixed
- **Description**: VS Code Spring Boot Dashboard failed to start with `Port 8080 was already in use` because a previous `mvn spring-boot:run` process was still running in background.
- **Fix Applied**: Kill the existing process first: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`, then restart.

---

### [BUG-009] Admin password hash in SQL was invalid — login always 401
- **File**: `database/TripifyDB_MySQL.sql`
- **Type**: Schema / Backend
- **Status**: Fixed
- **Description**: Two bugs combined: (1) The original seeded hash was a fake placeholder (`Z5Z5Z5...`) that never matched any real password. (2) A second attempt used a hash recalled from memory which was also not a valid BCrypt digest for the intended password. BCrypt hashes must be generated by running the actual encoder — they cannot be hand-written or recalled from memory because they contain a random salt. Additionally, editing the SQL file does NOT update the live MySQL database — the UPDATE must be run directly against MySQL.
- **Fix Applied**: Used Maven classpath + `java -cp` to run Spring's `BCryptPasswordEncoder` and generate a real hash for `Admin@123`. SQL file updated with this hash. User must run the UPDATE query directly on MySQL: `UPDATE Users SET password_hash='$2a$10$UBSS3mzzbjAmJvwSRZTaKOniKif8HJ/.plSnztlOXtD81TYJmV5I6' WHERE email='admin@tripify.com';`
- **Lesson**: Never hand-write BCrypt hashes. Always generate via `new BCryptPasswordEncoder().encode(password)` and run DB updates directly — not by re-running the full SQL seed file.

---

## Fixed Issues
SCHEMA-001 through SCHEMA-007 — all fixed at project setup stage.
BUG-002, BUG-003, BUG-004 — fixed during initial MySQL + backend setup.
