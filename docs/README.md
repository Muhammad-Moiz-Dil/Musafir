# Tripify — Travel Planning Web Application

A full-stack travel planning web application for Pakistani tourism destinations, developed as an SDA (Software Design and Architecture) university project. Tripify supports three user roles — Tourist, Hotel Manager, and Admin — each with a dedicated portal and feature set.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21, Spring Boot 3.4.3, Spring Security, Spring Data JPA |
| Frontend | Vanilla HTML, CSS, JavaScript (no framework) |
| Database | MySQL 8 |
| Authentication | JWT (JSON Web Tokens) with BCrypt password hashing |
| External APIs | Google Maps API (Route Finder), OpenWeatherMap API (Weather Alerts) |
| Build Tool | Maven |

---

## Project Structure

```
Tripify/
├── .gitignore
│
├── Backend/                         # Spring Boot Maven project
│   ├── pom.xml
│   ├── main/
│   │   ├── java/com/
│   │   │   ├── config/              # Security, CORS, JWT filter, rate limiter, startup initializer
│   │   │   ├── controller/          # 17 REST API controllers
│   │   │   ├── exceptionhandling/   # Global exception handler
│   │   │   ├── model/               # 17 JPA entities
│   │   │   ├── repository/          # Spring Data JPA repositories
│   │   │   ├── service/             # Business logic layer
│   │   │   ├── tripify/             # Spring Boot entry point (TripifyApplication.java)
│   │   │   └── utility/             # JWT utility
│   │   └── resources/
│   │       └── application.properties
│   ├── test/
│   │   └── java/com/
│   │       ├── config/              # RateLimitFilterTest
│   │       └── utility/             # JwtUtilTest
│   └── uploads/                     # Runtime file storage (gitignored)
│       ├── avatars/
│       ├── destinations/
│       ├── hotels/
│       └── souvenirs/
│
├── Frontend/
│   ├── index.html                   # Landing page (entry point)
│   ├── public/assets/images/        # Static images used in the landing page
│   └── src/
│       ├── css/
│       │   ├── common/              # reset.css, variables.css
│       │   └── pages/
│       │       ├── landing.css      # Landing page styles
│       │       ├── admin/           # admin.css + 10 page-specific CSS files
│       │       ├── auth/            # auth.css + 4 page-specific CSS files
│       │       ├── hm/              # hm.css + 7 page-specific CSS files
│       │       └── user/            # user.css + 15 page-specific CSS files
│       ├── html/pages/
│       │   ├── admin/               # 10 admin pages
│       │   ├── auth/                # login, register, admin-login, hm-register
│       │   ├── hm/                  # 7 hotel manager pages
│       │   └── user/                # 15 tourist pages
│       └── js/
│           ├── config/              # api.js — all endpoint definitions
│           ├── pages/
│           │   ├── admin/           # 10 page scripts
│           │   ├── auth/            # 4 auth page scripts
│           │   ├── hm/              # 8 hotel manager page scripts
│           │   └── user/            # 15 tourist page scripts
│           ├── services/            # authService.js, notificationService.js, notificationPanel.js
│           └── utils/               # validation.js, sanitize.js
│
├── database/
│   ├── TripifyDB_MySQL.sql          # Full schema + seed data (single source of truth)
│   
│
└── docs/
    └── README.md                    # This file
```

---

## How to Run

### Prerequisites
- Java 21+
- MySQL 8
- Maven 3.8+

### 1. Database Setup
Open MySQL Workbench and run:
```
database/TripifyDB_MySQL.sql
```
This creates the `TripifyDB` database, all 17 tables, indexes, and seed data in one shot.

### 2. Backend Setup
```bash
cd Backend
mvn spring-boot:run
```
Server starts on `http://localhost:8080`.

### 3. Frontend Setup
Open `Frontend/index.html` in a browser, or use VS Code Live Server.

Default entry points:
- Landing page: `Frontend/index.html`
- Tourist / Hotel Manager login: `Frontend/src/html/pages/auth/login.html`
- Admin login: `Frontend/src/html/pages/auth/admin-login.html`

### Default Admin Account
```
Email:    admin@tripify.com
Password: admin123
```

---

## User Roles

| Role | Description |
|------|-------------|
| **Tourist** | Browse destinations, plan trips, book hotels, write reviews, manage wishlist |
| **Hotel Manager** | Manage hotel listings, handle booking requests, manage room types and pricing |
| **Admin** | Full platform control — destinations, hotels, users, analytics, moderation, settings |

---

## Implemented Use Cases

### Tourist
| # | Use Case |
|---|----------|
| UC-01 | Register a new Tourist account |
| UC-02 | Login / Logout |
| UC-04 | Update profile (name, phone, CNIC, address, avatar) |
| UC-04b | Change password |
| UC-04c | Delete account |
| UC-06 | Search and browse destinations |
| UC-07 | View travel guidelines per destination |
| UC-08 | Manage wishlist (add / remove / clear favorites) |
| UC-09 | Plan a trip (create, add destinations, complete, delete) |
| UC-10 | Submit destination review (verified if destination was in a completed trip) |
| UC-11 | Book a hotel room |
| UC-12 | Route Finder (Google Maps integration) |
| UC-13 | View my bookings |
| UC-14 | Trip Cost Calculator |
| UC-15 | View emergency contacts per destination |
| UC-16 | Weather alerts for favorited destinations (live OpenWeatherMap data) |
| UC-17 | Seasonal insights (best time to visit, monthly weather/cost data) |
| UC-18 | View souvenirs per destination |
| UC-P  | Personalized destination recommendations based on preferences |

### Hotel Manager
| # | Use Case |
|---|----------|
| HM-01 | Register as Hotel Manager |
| HM-02 | View and manage assigned hotels |
| HM-03 | Update hotel profile (description, contact info, amenities, cover photo) |
| HM-04 | Manage room types (add, edit, delete) |
| HM-05 | Set room pricing per night |
| HM-06 | View and action booking requests (confirm / cancel) |
| HM-07 | View hotel reviews from guests |

### Admin
| # | Use Case |
|---|----------|
| UC-19 | View system statistics and analytics (bookings, revenue, top destinations) |
| UC-20 | Manage users (view all, deactivate, delete) and view activity logs |
| UC-21 | Content moderation (flag, dismiss, or remove destination/hotel reviews) |
| UC-22 | Manage destination listings (add, edit, toggle active, upload images) |
| UC-23 | Manage hotel partner listings (add, edit, assign manager, toggle active) |
| UC-24 | Manage travel guidelines per destination (CRUD) |
| UC-25 | Manage emergency contacts per destination |
| UC-26 | Manage souvenirs per destination (CRUD with image upload) |
| UC-27 | System settings (feature flags, cost constants, API key management) |
| UC-28 | View weather alerts dashboard |
| UC-03 | Delete Hotel Manager accounts |

---

## Key Features

- **JWT Authentication** — stateless, role-based access control with Spring Security
- **Rate Limiting** — login endpoints throttled to 5 attempts/minute per IP; 15-minute lockout after exceeded
- **Feature Flags** — Admin can enable/disable Booking, Reviews, Registration, and Weather Scheduler at runtime
- **Scheduled Weather Alerts** — background job runs hourly, fetches live weather for all favorited destinations, and pushes alerts to users
- **Verified Reviews** — reviews submitted after a completed trip are marked as verified
- **Personalized Recommendations** — destination suggestions based on user age group and travel preferences
- **File Uploads** — profile avatars, hotel cover photos, destination images, and souvenir images stored on the server
- **Activity Audit Log** — every significant user action is logged with timestamp and IP address
- **Google Maps Route Finder** — API key served securely from backend, never exposed in frontend

---

## Database Schema

17 tables: `Users`, `Destinations`, `Hotels`, `RoomTypes`, `Bookings`, `Favorites`, `Reviews`, `HotelReviews`, `TravelGuidelines`, `EmergencyInfo`, `Souvenirs`, `SeasonalData`, `Trips`, `TripDestinations`, `Notifications`, `ActivityLogs`, `FlaggedContent`, `SystemSettings`

Full schema, indexes, and seed data: `database/TripifyDB_MySQL.sql`

---

## API Overview

Base URL: `http://localhost:8080/api`

| Prefix | Controller | Access |
|--------|-----------|--------|
| `/api/auth` | AuthController | Public |
| `/api/users` | ProfileController | Authenticated |
| `/api/destinations` | DestinationController | Authenticated |
| `/api/trips` | TripController | Tourist |
| `/api/reviews` | ReviewController | Tourist |
| `/api/bookings` | BookingController | Tourist / HotelManager |
| `/api/hotels` | HotelController | Mixed |
| `/api/rooms` | RoomTypeController | HotelManager |
| `/api/favorites` | FavoriteController | Tourist |
| `/api/guidelines` | TravelGuidelineController | Authenticated |
| `/api/emergency` | EmergencyInfoController | Authenticated |
| `/api/seasonal-data` | SeasonalInsightsController | Authenticated |
| `/api/souvenirs` | SouvenirController | Authenticated |
| `/api/weather` | WeatherAlertController | Authenticated |
| `/api/notifications` | NotificationController | Authenticated |
| `/api/hotel-reviews` | HotelReviewController | Tourist |
| `/api/config` | ConfigController | Authenticated |
| `/api/admin` | AdminController | Admin only |
