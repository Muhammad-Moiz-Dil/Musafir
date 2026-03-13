# Error Log

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
