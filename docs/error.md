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
