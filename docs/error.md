# Error Log

## Wishlist (Favorites) Implementation Notes
**Date:** 2026-03-13
**Files:** `Backend/.../FavoriteController.java`, `Frontend/.../wishlist.html`, `destinations.html`, `destination-detail.html`, `api.js`
**Status:** Implemented

### Design Decisions
- `GET /api/favorites/ids` returns just the ID list — used by destinations & detail pages to fill hearts on load without fetching full destination data twice.
- `wishlist.html` now calls `GET /api/favorites` (full destination objects, newest first) — no longer reads from `localStorage`.
- `destinations.html` and `destination-detail.html` heart buttons call `POST/DELETE /api/favorites/{id}` directly; localStorage wishlist keys removed entirely.
- Double-submit prevented: toggle buttons are disabled during in-flight requests (`btn.disabled = true`).
- 409 on `POST` is treated as success (already saved) — UI still updates correctly.
- Clear All on wishlist fires all DELETEs in parallel via `Promise.all`.

---

## UC-07 Implementation Notes — Travel Guidelines
**Date:** 2026-03-13
**Files:** `Backend/.../TravelGuidelineController.java`, `Frontend/.../travel-guidelines.html`
**Status:** Implemented

### Design Decisions
- `GET /api/guidelines/destinations` reuses `DestinationRepository.findByIsActiveTrueOrderByNameAsc()` — no duplicate data layer.
- `GET /api/guidelines/{destinationId}` returns 404 with `message: "no_guidelines"` when destination exists but has no rows in `TravelGuidelines` table — frontend detects this and shows the alternate-flow message.
- Accordion cards group guidelines by `category` field; category meta (icon + label) is defined client-side so adding new DB categories works without frontend changes.
- Nav item added to all 9 user pages between Wishlist and the `nav-divider`.
- `?dest=<id>` query parameter supported — other pages can deep-link directly to a destination's guidelines.

## BUG-001 — Dashboard profile not displayed after login
**Date:** 2026-03-13
**File:** `Frontend/src/html/pages/user/dashboard.html`
**Status:** Fixed

### Root Cause
1. `dashboard.html` did not load `api.js` or `authService.js`, so `ENDPOINTS` was undefined and no API call was possible.
2. No auth guard — the dashboard was accessible without a valid session, showing placeholder data ("Traveller"/"AT").
3. No `GET /api/users/profile` call — the dashboard only read from `localStorage`, which after login only contains `{ id, email, fullName, userType }`. If `localStorage` was stale, cleared, or missing, the profile showed placeholder values.

### Fix Applied
- Added `<script src="../../../js/config/api.js"></script>` and `authService.js` before the inline script.
- Added auth guard: if no token → redirect to `../auth/login.html`.
- Added `applyUserProfile(u)` function to update welcome name, sidebar name, and avatar initials.
- Shows localStorage data immediately (instant render), then calls `GET /api/users/profile` to fetch fresh data and updates `localStorage` + UI.
- On 401 → calls `AuthService.logout()`. On network error → silently falls back to localStorage data.

## BUG-002 — Profile avatar upload broken (404 on served image)
**Date:** 2026-03-13
**Files:** `Backend/main/resources/application.properties`, `Backend/main/java/com/config/WebConfig.java` (new)
**Status:** Fixed

### Root Cause
`application.properties` had `spring.web.resources.static-locations=...,file:uploads/` which maps the *contents* of the `uploads/` directory to the URL root. So a file saved at `uploads/avatars/pic.jpg` was accessible at `/avatars/pic.jpg`, but `ProfileController` generated the URL as `/uploads/avatars/pic.jpg` → 404.

### Fix Applied
- Removed `file:uploads/` from `spring.web.resources.static-locations`.
- Added `WebConfig.java` with a resource handler: `/uploads/**` → `file:uploads/`, so `/uploads/avatars/pic.jpg` correctly serves `uploads/avatars/pic.jpg`.

## BUG-005 — Every destination detail opens as Hunza Valley
**Date:** 2026-03-13
**Files:** `destination-detail.html`, `DestinationController.java`, `api.js`
**Status:** Fixed

### Root Cause
`destination-detail.html` had a hardcoded `DESTS` object with keys 1–5. It fetched the `?id=` from the URL and did `DESTS[id] || DESTS[1]`. Any DB destination with an ID not in {1,2,3,4,5} (e.g. Islamabad, Lahore, Fairy Meadows) fell back to `DESTS[1]` = Hunza Valley. Also used wrong localStorage key `'user'` and had no auth guard.

### Fix Applied
- Added `GET /api/destinations/{id}` endpoint to `DestinationController.java` — returns live data from DB for any destination by ID.
- Added `ENDPOINTS.DESTINATIONS.BY_ID(id)` to `api.js`.
- Rewrote `destination-detail.html` script: now fetches from API by ID, handles 401/404/network errors. Kept hardcoded extras (seasonal chart, guidelines, souvenirs, hotels) in an `EXTRAS` object for IDs 1–5; destinations with other IDs use `DEFAULT_EXTRAS` (generic content).
- Fixed localStorage key to `'tripify_user'`, added auth guard, added profile pic support.

## BUG-004 — Profile pic and username broken on Explore, Trip Cost, Route Finder, Hotels, Wishlist
**Date:** 2026-03-13
**Files:** `destinations.html`, `trip-cost.html`, `route-finder.html`, `hotels.html`, `wishlist.html`, `emergency.html`
**Status:** Fixed

### Root Cause
1. `trip-cost.html`, `route-finder.html`, `hotels.html` used `localStorage.getItem('user')` (wrong key) instead of `'tripify_user'` → name always fell back to hardcoded "Ahmed Tariq".
2. All 5 pages used `.textContent = ini` for both `sidebarInitials` and `topbarInitials` — no profile pic support at all (no `<img>` tag injected).
3. `trip-cost.html`, `route-finder.html`, `hotels.html` had no auth guard.

### Fix Applied
- Added `applyUserProfile(u)` function to all 5 pages (same logic as dashboard): reads `profilePicture` from user object, injects `<img>` tag via `.innerHTML` if pic exists, falls back to initials text if not.
- Fixed localStorage key to `'tripify_user'` on trip-cost, route-finder, hotels.
- Added token-based auth guard (`tripify_token`) to trip-cost, route-finder, hotels.

## BUG-003 — Wishlist/likes page shows nothing
**Date:** 2026-03-13
**File:** `Frontend/src/html/pages/user/wishlist.html`
**Status:** Fixed

### Root Cause
1. Wishlist page used hardcoded `ALL_DESTS` array (only 5 destinations, IDs 1–5). Any destination liked from the destinations page with an ID not in the hardcoded list would be silently ignored.
2. Wrong localStorage key: `localStorage.getItem('user')` instead of `localStorage.getItem('tripify_user')` — user profile (name/initials) never loaded.
3. No auth guard and no `api.js` loaded.

### Fix Applied
- Added `api.js` script and auth guard.
- Replaced hardcoded `ALL_DESTS` with a live `GET /api/destinations/search` API fetch (same endpoint as destinations page). Liked items are now correctly resolved from real DB data.
- Fixed localStorage key to `'tripify_user'`.
- Added same image resolver (`IMG_MAP`) as destinations page so images display correctly.

## BUG-004 — App fails to start: missing table `user_preferences`
**Date:** 2026-03-14
**File:** `database/TripifyDB_MySQL.sql`
**Status:** Fixed

### Root Cause
Hibernate schema validation (`ddl-auto=validate`) checks every JPA entity against the actual database tables on startup. The `UserPreferences` entity maps to the `user_preferences` table, but that table was never created in the MySQL database — it was missing from the SQL schema file.

### Fix Applied
Manually ran the following in MySQL Workbench to create the missing table:
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
    preference_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    age_group VARCHAR(20) DEFAULT '18-25',
    travel_preferences TEXT,
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);
```

## UC15-NOTE-001 — EmergencyInfo & TravelGuidelines tables require data before API is useful
**Date:** 2026-03-14
**Files:** `database/UC15_EmergencyData.sql`
**Status:** Documented (run SQL before testing)

### Cause
The `EmergencyInfo` table only had 3 rows (Hunza, Murree, Swat) from the seed data. Destinations 4–10 had no emergency data. The `TravelGuidelines` table had no rows with `category='Safety'` for most destinations. When the new API (`GET /api/emergency/{destinationId}`) was called for these destinations, the `contacts.available` field returned `false`, showing the "unavailable" fallback message.

### Fix Applied
Created `database/UC15_EmergencyData.sql` which:
1. Updates existing EmergencyInfo rows (1–3) with full details (fire service, embassy, specific local numbers).
2. Inserts EmergencyInfo for destinations 4–10 with verified local numbers.
3. Inserts `category='Safety'` TravelGuidelines for all 10 destinations (4–5 guidelines per destination).

**Run this script once in MySQL Workbench before testing UC15.**

## BUG-006 — Backend fails to start: missing table [emergency_info]
**Date:** 2026-03-14
**Files:** `Backend/main/java/com/model/EmergencyInfo.java`, `Backend/main/java/com/model/TravelGuideline.java`
**Status:** Fixed

### Root Cause
Hibernate `ddl-auto=validate` expects table names in **snake_case** (e.g. `emergency_info`), but the `@Table(name=...)` annotations used the original DB names `EmergencyInfo` and `TravelGuidelines` (PascalCase). MySQL on Windows is case-insensitive but Hibernate validates the exact name, causing `SchemaManagementException: missing table [emergency_info]`.

### Fix Applied
1. Created new lowercase tables `emergency_info` and `travel_guidelines` in MySQL Workbench.
2. Copied data from old `EmergencyInfo` / `TravelGuidelines` tables into new ones.
3. Changed `@Table(name="EmergencyInfo")` → `@Table(name="emergency_info")` in `EmergencyInfo.java`.
4. Changed `@Table(name="TravelGuidelines")` → `@Table(name="travel_guidelines")` in `TravelGuideline.java`.

## UC15-NOTE-002 — `ddl-auto=validate` requires both tables to exist in DB before backend starts
**Date:** 2026-03-14
**Files:** `Backend/main/java/com/model/EmergencyInfo.java`, `Backend/main/java/com/model/TravelGuideline.java`
**Status:** Documented

### Cause
`spring.jpa.hibernate.ddl-auto=validate` checks every JPA entity against the actual DB schema at startup. Both `EmergencyInfo` and `TravelGuidelines` tables already exist in `TripifyDB_MySQL.sql`, so no manual table creation is needed — the backend will start normally as long as the full DB schema was applied.

### Note
If `TravelGuidelines` or `EmergencyInfo` tables are missing (e.g., partial DB setup), the backend will fail to start with a `SchemaManagementException`. Solution: Re-run the full `TripifyDB_MySQL.sql` script.

## BUG-007 — Backend fails to start: missing table [emergency_info] (post-merge)
**Date:** 2026-03-14
**File:** `Backend/main/java/com/model/EmergencyInfo.java`
**Status:** Fixed

### Root Cause
After merging friend's branch, `EmergencyInfo.java` used `@Table(name = "emergency_info")` (snake_case) but the actual MySQL DB table is named `EmergencyInfo` (PascalCase). Hibernate `ddl-auto=validate` looks for the exact table name and fails with `SchemaManagementException: missing table [emergency_info]`.

### Fix Applied
Changed `@Table(name = "emergency_info")` → `@Table(name = "EmergencyInfo")` in `EmergencyInfo.java` to match the actual DB table name. No DB changes required.

### Rule
All `@Table(name = ...)` annotations must exactly match the PascalCase table names in `TripifyDB_MySQL.sql` — **except** `travel_guidelines` (which has a lowercase table in DB per BUG-006 fix).
