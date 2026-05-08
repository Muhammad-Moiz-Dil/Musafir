================================================================================
                        TRIPIFY — README & SETUP GUIDE
              Pakistan's Smart Travel Planning Web Application
                      SDA Final Project — Spring 2026
================================================================================

TEAM / PROJECT INFO
-------------------
Application : Tripify
Backend     : Spring Boot 3.4.3 (Java 21)
Frontend    : Pure HTML + CSS + Vanilla JavaScript
Database    : MySQL 8.0
Roles       : Tourist | Hotel Manager | Admin


================================================================================
SECTION 1 — STEP-BY-STEP INSTRUCTIONS TO BUILD AND RUN THE PROJECT
================================================================================

READ THIS FULLY BEFORE DOING ANYTHING. Follow every step in order.
Do NOT skip a step. If something says "check that", actually check it.

--------------------------------------------------------------------------------
STEP 1 — INSTALL JAVA 21 (JDK)
--------------------------------------------------------------------------------

The backend is written in Java 21. You MUST install Java 21 specifically.
Java 17 or Java 11 will NOT work.

  1. Open your browser and go to:
     https://www.oracle.com/java/technologies/downloads/#java21

  2. Under "JDK 21", click on "Windows" tab, then download:
     "x64 Installer" (the .exe file, around 160 MB)

  3. Run the installer. Click Next → Next → Install. Leave everything as default.

  4. After install, open Command Prompt (press Windows key, type "cmd", hit Enter)
     and type:

       java -version

     You should see something like:
       java version "21.0.x" ...

     If you see that, Java is installed correctly. If you get an error, restart
     your computer and try again.

--------------------------------------------------------------------------------
STEP 2 — INSTALL APACHE MAVEN
--------------------------------------------------------------------------------

Maven is the build tool that compiles and packages the Java backend.
This project does NOT have a Maven wrapper, so you must install it manually.

  1. Go to: https://maven.apache.org/download.cgi

  2. Under "Files", download:
     "apache-maven-3.9.x-bin.zip" (the zip file)

  3. Extract the zip. You will get a folder like "apache-maven-3.9.6".
     Move this folder somewhere permanent, for example:
       C:\Program Files\Maven\apache-maven-3.9.6

  4. Now add Maven to your system PATH:
     a. Press Windows key, search "Environment Variables", click
        "Edit the system environment variables"
     b. Click "Environment Variables..." button
     c. Under "System variables", find "Path", click Edit
     d. Click "New" and add:
          C:\Program Files\Maven\apache-maven-3.9.6\bin
     e. Click OK → OK → OK

  5. Close and reopen Command Prompt. Type:

       mvn -version

     You should see something like:
       Apache Maven 3.9.x ...
       Java version: 21.x ...

     If you see that, Maven is installed correctly.

--------------------------------------------------------------------------------
STEP 3 — INSTALL MYSQL 8.0
--------------------------------------------------------------------------------

The project database is MySQL 8.0. Do NOT install MySQL 9.x — use 8.0.

  1. Go to: https://dev.mysql.com/downloads/installer/

  2. Download "MySQL Installer for Windows" (the larger file, ~450 MB)

  3. Run the installer. When it asks what to install, choose:
     "Developer Default" (this installs MySQL Server + MySQL Workbench)

  4. During setup, it will ask you to set a ROOT PASSWORD.
     SET IT TO:  admin123
     (The project is pre-configured to use this password.
      If you use a different password, you must edit the config file in Step 6.)

  5. Leave everything else as default. Finish the installation.

  6. After install, open Command Prompt and type:

       mysql -u root -p

     It will ask for password. Type: admin123 (you will not see it being typed)
     Press Enter. If you see "mysql>" prompt, MySQL is working correctly.
     Type "exit" and press Enter to quit.

--------------------------------------------------------------------------------
STEP 4 — CREATE THE DATABASE AND IMPORT THE SCHEMA
--------------------------------------------------------------------------------

The project comes with a complete SQL file that creates all tables and seeds
sample data. You must import this before running the backend.

  METHOD A — Using MySQL Workbench (Recommended for beginners):

  1. Open MySQL Workbench (search for it in Start Menu)
  2. Click on the "Local instance MySQL80" connection
  3. Enter password: admin123
  4. Click on "Server" menu at top → "Data Import"
  5. Select "Import from Self-Contained File"
  6. Click the "..." button and navigate to:
       [Project Folder]\database\TripifyDB_MySQL.sql
  7. Under "Default Schema to be Imported To", click "New..." and type:
       TripifyDB
  8. Click "Start Import"
  9. Wait for it to finish. You should see "Import Completed" message.

  METHOD B — Using Command Prompt:

  1. Open Command Prompt
  2. Type the following (replace [PROJECT FOLDER] with your actual path):

       mysql -u root -padmin123 -e "CREATE DATABASE IF NOT EXISTS TripifyDB;"
       mysql -u root -padmin123 TripifyDB < "[PROJECT FOLDER]\database\TripifyDB_MySQL.sql"

  3. If you see no errors, the database is ready.

  To verify, open MySQL Workbench, connect, and in the left panel you should
  see "TripifyDB" with tables like users, destinations, hotels, bookings, etc.

--------------------------------------------------------------------------------
STEP 5 — INSTALL VS CODE AND THE LIVE SERVER EXTENSION (For Frontend)
--------------------------------------------------------------------------------

The frontend is plain HTML/CSS/JS. You need a local server to serve it
(opening HTML files directly as file:// will cause auth issues).

  1. Download VS Code from: https://code.visualstudio.com/
     Install it with default settings.

  2. Open VS Code. Click on the Extensions icon on the left sidebar
     (it looks like 4 squares). Search for:
       Live Server
     Install the one by "Ritwick Dey" (it has millions of downloads).

  3. That is all you need for the frontend.

--------------------------------------------------------------------------------
STEP 6 — CONFIGURE THE PROJECT (Only if you changed MySQL password)
--------------------------------------------------------------------------------

If you set your MySQL root password to exactly "admin123" in Step 3, you can
SKIP this step. The project will work as-is.

If you used a DIFFERENT MySQL password, you must update the config:

  1. Navigate to:
       Backend\main\resources\application.properties

  2. Open it in any text editor (Notepad is fine)

  3. Find this line:
       spring.datasource.password=${DB_PASSWORD:admin123}

  4. Change "admin123" to whatever password you set.

  5. Save the file.

--------------------------------------------------------------------------------
STEP 7 — BUILD THE BACKEND
--------------------------------------------------------------------------------

  1. Open Command Prompt

  2. Navigate to the Backend folder. Type:
       cd "[FULL PATH TO PROJECT]\Backend"

     For example, if your project is on Desktop:
       cd "C:\Users\YourName\Desktop\Tripify\Backend"

  3. Now build the project by typing:
       mvn clean package -DskipTests

     This will download all dependencies (Spring Boot, JWT library, MySQL
     driver, etc.) from the internet. First run can take 3-5 minutes depending
     on your internet speed. You will see lots of text scrolling.

  4. Wait until you see:
       BUILD SUCCESS

     If you see "BUILD FAILURE", check that:
     - Java 21 is installed (run: java -version)
     - Maven is installed (run: mvn -version)
     - You are inside the Backend folder (not the root project folder)

--------------------------------------------------------------------------------
STEP 8 — RUN THE BACKEND SERVER
--------------------------------------------------------------------------------

  1. Still inside the Backend folder in Command Prompt, type:
       mvn spring-boot:run

     OR, if the build from Step 7 succeeded, you can also run:
       java -jar target\tripify-backend-0.0.1-SNAPSHOT.jar

  2. You will see a lot of output. Wait for a line that looks like:
       Started TripifyApplication in X.XXX seconds

  3. The backend is now running on:
       http://localhost:8080

  IMPORTANT: Keep this Command Prompt window open. If you close it, the
  backend stops. You need the backend running while using the app.

  To verify the backend is working, open your browser and go to:
    http://localhost:8080/api/destinations/search?query=hunza

  You should see JSON data (destination info) in the browser. If you see
  a JSON response, the backend is working correctly.

--------------------------------------------------------------------------------
STEP 9 — RUN THE FRONTEND
--------------------------------------------------------------------------------

  1. Open VS Code

  2. Click File → Open Folder and select the entire Tripify project folder
     (the root folder, not just Frontend)

  3. In the VS Code file explorer (left panel), navigate to:
       Frontend → index.html

  4. Right-click on index.html and select "Open with Live Server"

  5. Your browser will open automatically at:
       http://127.0.0.1:5500/Frontend/index.html
     (or similar port — Live Server will show the exact URL)

  6. You should see the Tripify landing page with an animated globe.

  IMPORTANT: The Live Server MUST run from the root project folder, not from
  inside the Frontend folder. This is because the backend CORS settings are
  configured to allow requests from localhost:5500.

--------------------------------------------------------------------------------
STEP 10 — LOG IN AND USE THE APPLICATION
--------------------------------------------------------------------------------

The database seed file (TripifyDB_MySQL.sql) creates sample accounts.
Use these to log in:

  TOURIST ACCOUNT:
    Email   : tourist@tripify.com
    Password: password123
    Login at: http://127.0.0.1:5500/Frontend/src/html/pages/auth/login.html

  HOTEL MANAGER ACCOUNT:
    Email   : manager@tripify.com
    Password: password123
    Login at: http://127.0.0.1:5500/Frontend/src/html/pages/auth/login.html

  ADMIN ACCOUNT:
    Email   : admin@tripify.com
    Password: admin123
    Login at: http://127.0.0.1:5500/Frontend/src/html/pages/auth/admin-login.html
    (Note: Admins use a SEPARATE login page — do not use the regular login)

  If these accounts do not work, you can register a new Tourist or Hotel Manager
  account from the Register page on the app.

--------------------------------------------------------------------------------
SUMMARY — WHAT YOU NEED TO HAVE INSTALLED
--------------------------------------------------------------------------------

  Software Required:
  - Java 21 JDK          https://www.oracle.com/java/technologies/downloads/#java21
  - Apache Maven 3.9+    https://maven.apache.org/download.cgi
  - MySQL 8.0            https://dev.mysql.com/downloads/installer/
  - VS Code              https://code.visualstudio.com/
  - Live Server (VS Code Extension by Ritwick Dey)

  Internet Connection Required:
  - First Maven build downloads ~100 MB of dependencies
  - Weather alerts use OpenWeatherMap API (live internet needed)
  - Route Finder uses Google Maps API (live internet needed)

  Order to start the app every time:
  1. Start MySQL (it usually starts automatically after installation)
  2. Run backend: mvn spring-boot:run (in Backend folder)
  3. Open Frontend/index.html with Live Server in VS Code


================================================================================
SECTION 2 — DESIGN PATTERNS USED
================================================================================

The following Gang-of-Four (GoF) design patterns are present in the codebase:

--------------------------------------------------------------------------------
PATTERN 1 — SINGLETON
--------------------------------------------------------------------------------

WHERE: Every Spring-managed bean in the backend.

HOW IT WORKS: Spring Boot's IoC (Inversion of Control) container creates exactly
ONE instance of each class annotated with @Service, @Component, @Repository, or
@Configuration, and reuses that single instance everywhere it is needed.

SPECIFIC EXAMPLES:
  - JwtUtil (@Component)
      File: Backend/main/java/com/utility/JwtUtil.java
      One instance shared across JwtFilter and all 18 controllers.
      Handles all JWT generation and validation for the entire application.

  - EmailService (@Service)
      File: Backend/main/java/com/service/EmailService.java
      One instance shared between NotificationService and WeatherAlertService.
      Manages all outgoing Gmail SMTP connections.

  - SecurityConfig (@Configuration)
      File: Backend/main/java/com/config/SecurityConfig.java
      One instance that defines the entire security filter chain, CORS policy,
      and password encoder for the application.

  - Frontend authService.js (Module Singleton)
      File: Frontend/src/js/services/authService.js
      Implemented as a JavaScript object literal — one shared object loaded
      once per page that manages login, logout, and token retrieval for all
      frontend pages.

--------------------------------------------------------------------------------
PATTERN 2 — FACTORY METHOD
--------------------------------------------------------------------------------

WHERE: SecurityConfig.java — @Bean factory methods.

HOW IT WORKS: The Factory Method pattern defines a method whose job is to
CREATE and RETURN an object, hiding the exact construction details from the
caller. Spring's @Bean annotation turns a method into exactly this.

SPECIFIC EXAMPLES:
  File: Backend/main/java/com/config/SecurityConfig.java

  - passwordEncoder() method (line ~73)
      Returns a new BCryptPasswordEncoder. No other class needs to know
      HOW the encoder is built — they just receive the finished object.

  - authenticationProvider() method (line ~59)
      Creates and configures a DaoAuthenticationProvider, wires it with
      the UserDetailsService and PasswordEncoder, and returns it ready-to-use.

  - corsConfigurationSource() method (line ~78)
      Builds a complete CorsConfiguration with all allowed origins, methods,
      and headers configured, returns it as a CorsConfigurationSource.

  - authenticationManager() method (line ~67)
      Extracts and returns the AuthenticationManager from Spring's internal
      configuration — the caller does not need to know how it is created.

--------------------------------------------------------------------------------
PATTERN 3 — TEMPLATE METHOD
--------------------------------------------------------------------------------

WHERE: All three request filter classes in the backend.

HOW IT WORKS: The Template Method pattern defines the SKELETON of an algorithm
in a base class, and lets subclasses fill in the specific steps without
changing the overall structure.

Spring's OncePerRequestFilter (the base/parent class) defines the algorithm:
  "For every incoming HTTP request, run doFilterInternal() exactly once,
   then pass the request along the filter chain."

Each subclass implements its own version of doFilterInternal():

SPECIFIC EXAMPLES:
  - JwtFilter extends OncePerRequestFilter
      File: Backend/main/java/com/config/JwtFilter.java
      Template step implemented: Extract the JWT token from the Authorization
      header, validate it, and inject the user into Spring Security's context.

  - RateLimitFilter extends OncePerRequestFilter
      File: Backend/main/java/com/config/RateLimitFilter.java
      Template step implemented: Count login attempts per IP address, block
      the IP for 15 minutes if 5 attempts are exceeded in 1 minute.

  - MaintenanceFilter extends OncePerRequestFilter
      File: Backend/main/java/com/config/MaintenanceFilter.java
      Template step implemented: Check if the FEATURE_MAINTENANCE_MODE flag
      is active in SystemSettings, and if so, reject all requests with 503.

The parent class (OncePerRequestFilter) is from Spring Framework — the three
filters above are Tripify's concrete implementations of that template.

--------------------------------------------------------------------------------
PATTERN 4 — ADAPTER (Object Adapter Variant)
--------------------------------------------------------------------------------

WHERE: UserDetailsServiceImpl.java

HOW IT WORKS: The Adapter pattern converts the interface of one class into
another interface that a client expects. Here, Spring Security expects
objects of type UserDetails and UserDetailsService — but Tripify's domain
uses its own User entity and UserRepository. The Adapter bridges the two.

  - Adaptee  : Tripify's User entity + UserRepository (our domain model)
  - Target   : Spring Security's UserDetailsService interface
  - Adapter  : UserDetailsServiceImpl

  File: Backend/main/java/com/config/UserDetailsServiceImpl.java

  The adapter does three things:
  1. Calls userRepository.findByEmail() (Tripify's model) to get a User
  2. Wraps the User's email and passwordHash in Spring Security's User object
  3. Maps Tripify's UserType enum ("Tourist", "Admin", "HotelManager") to
     Spring Security's authority strings ("ROLE_Tourist", "ROLE_Admin", etc.)

  Without this adapter, Spring Security cannot understand Tripify's User
  class at all — the adapter makes the two systems compatible.

--------------------------------------------------------------------------------
PATTERN 5 — OBSERVER
--------------------------------------------------------------------------------

WHERE: The notification + email system across three service classes.

HOW IT WORKS: The Observer pattern defines a one-to-many dependency where
when one object (the Subject) changes state, all its dependents (Observers)
are notified automatically.

In Tripify:
  SUBJECTS (things that trigger events):
  - BookingController — when a booking is created, confirmed, or cancelled
  - WeatherAlertService — when extreme weather is detected for a destination

  OBSERVER CHAIN:
  1. Subject calls NotificationService.createNotification()
  2. NotificationService saves the in-app Notification to the database
  3. NotificationService then calls EmailService.sendNotificationEmail()
  4. EmailService (marked @Async) sends the email asynchronously so it
     never blocks the original booking/weather request

SPECIFIC FILES:
  - BookingController.java — Subject (lines ~136-148 and ~266-286)
      Triggers "BOOKING_REQUEST", "BOOKING_CONFIRMED", "BOOKING_CANCELLED"
  - WeatherAlertService.java — Subject (line 354)
      Triggers "WEATHER_ALERT" for extreme temperature/wind/storm events
  - NotificationService.java — Observer (line 60)
      Receives event, persists notification, fires email
  - EmailService.java — Leaf Observer (line 37, @Async)
      Receives event, builds and sends formatted HTML email via Gmail SMTP

The @Async annotation on EmailService ensures the observer executes in a
separate thread — the user's request completes immediately without waiting
for the email to be sent.


================================================================================
SECTION 3 — FEATURES NOT IMPLEMENTED END TO END
================================================================================

The following use cases or features exist in the UI or data model but are
NOT fully working end-to-end as complete flows:

1. PAYMENT PROCESSING
   The Booking entity has a PaymentStatus field (Unpaid / Paid / Refunded)
   and the booking flow shows a total cost. However, there is NO actual
   payment gateway integrated (no Stripe, JazzCash, or EasyPaisa). Tourists
   cannot actually pay online. All bookings remain in "Unpaid" status.
   The payment status can only be changed manually in the database.

2. FORGOT PASSWORD / PASSWORD RESET
   There is no "Forgot Password" link or page anywhere in the application.
   There is no /api/auth/forgot-password endpoint in AuthController.
   If a user forgets their password, there is no self-service way to reset it.
   An admin would have to manually update the password hash in the database.

3. EMAIL VERIFICATION ON REGISTRATION
   When a new Tourist or Hotel Manager registers, no verification email is
   sent to confirm that the email address is real. Users are immediately
   active after registration with no email confirmation step.

4. EMAIL CTA LINK IN PRODUCTION
   The EmailService builds HTML emails with a "Open Tripify" button that links
   to: http://localhost:5500/src/html/pages/auth/login.html
   This is hardcoded to localhost (EmailService.java, line ~144).
   The email system itself works (sends HTML emails via Gmail SMTP), but the
   link inside every email points to localhost and will not work for any
   recipient who is not running the app locally on port 5500.

5. HOTEL MANAGER — DYNAMIC PRICING
   The hm-pricing.js page and its HTML counterpart exist in the frontend but
   the pricing management feature (setting seasonal or dynamic price overrides
   beyond the base room price) is not fully wired to a dedicated backend
   endpoint. The Hotel Manager can only set a single price per room type.

6. ADMIN — TRAVEL GUIDELINES MANAGEMENT
   The Admin panel has pages for managing Travel Guidelines, Emergency Info,
   and Souvenirs via AdminController. The read/view side works. However, the
   admin-guidelines.html page is missing from the admin HTML folder (only
   admin-destinations, admin-hotels, etc. exist as standalone pages). The
   create/edit/delete operations for Guidelines go through the main
   AdminController but the dedicated admin UI page is incomplete.

7. REVIEW SYSTEM — VERIFIED BADGE
   The code sets a "verified" flag on reviews if the user has a completed
   trip to that destination. However, the frontend destination-detail page
   does not visually distinguish verified reviews from unverified ones with
   any badge or label — the flag is stored but never displayed.

8. WISHLIST / FAVORITES — EMAIL ALERTS ON PRICE CHANGE
   The Favorite/Wishlist system tracks which destinations a user saves.
   The weather alert system uses this list to send weather notifications.
   However, there is no price-change alert: if a hotel at a favorited
   destination drops its price, the favoriting user is not notified.

9. SOUVENIR / EMERGENCY INFO — TOURIST ADD/EDIT
   Tourists can view souvenirs and emergency info by destination, but there
   is no way for a Tourist or Hotel Manager to submit new souvenir listings
   or update emergency contact information. Only the Admin (via AdminController)
   can manage this data.


================================================================================
SECTION 4 — KNOWN BUGS (FEATURE / UC WISE)
================================================================================

BUG 1 — XSS VULNERABILITY IN TRIP COST PAGE
  Feature  : Trip Cost Calculator (Tourist)
  File     : Frontend/src/js/pages/user/user-trip-cost.js
  Lines    : ~807-820, ~683-692, ~712-719
  Issue    : Hotel and destination names fetched from the backend API are
             injected directly into innerHTML using template literals without
             HTML escaping. Example:
               card.innerHTML = `<span>${h.name}</span>`;
             If any hotel/destination name in the database contains HTML like
             <script>alert('XSS')</script>, it will execute in the user's browser.
  Severity : CRITICAL
  Fix      : Use the existing sanitize.js (esc() function) already in the
             project before injecting any API data into innerHTML.

BUG 2 — XSS VULNERABILITY IN ROUTE FINDER PAGE
  Feature  : Route Finder (Tourist)
  File     : Frontend/src/js/pages/user/user-route-finder.js
  Issue    : Same unescaped innerHTML pattern as Bug 1. Destination names
             from API responses are rendered without sanitization.
  Severity : CRITICAL
  Fix      : Same — apply esc() from sanitize.js before innerHTML injection.

BUG 3 — NO MAXIMUM BOOKING DURATION CHECK
  Feature  : Hotel Booking (Tourist)
  File     : Backend/main/java/com/controller/BookingController.java
  Line     : ~113-115
  Issue    : The backend checks that checkOut is after checkIn, but does NOT
             check how many nights apart they are. A user could submit a
             booking with checkIn = today and checkOut = year 9999, resulting
             in a booking for millions of nights and an astronomically large
             total cost. The multiplication:
               BigDecimal total = unitPrice.multiply(BigDecimal.valueOf(nights));
             has no upper bound.
  Severity : HIGH
  Fix      : Add a check: if (nights > 365) return ResponseEntity.badRequest()

BUG 4 — RATE LIMITER BYPASSABLE VIA IP SPOOFING
  Feature  : Login Rate Limiting (Security)
  File     : Backend/main/java/com/config/RateLimitFilter.java
  Line     : ~106-110
  Issue    : The rate limiter reads the client IP from the X-Forwarded-For
             HTTP header, which is fully controlled by the client. An attacker
             can send a different fake IP in each login request:
               X-Forwarded-For: 1.2.3.4
             on one request, then
               X-Forwarded-For: 5.6.7.8
             on the next — bypassing the 5-attempt limit entirely and brute-
             forcing passwords without ever being blocked.
  Severity : HIGH
  Fix      : Only trust X-Forwarded-For if the request comes from a known
             trusted proxy. Fall back to request.getRemoteAddr() otherwise.

BUG 5 — EMAIL LINK HARDCODED TO LOCALHOST
  Feature  : All email notifications (Booking Confirmed/Cancelled, Weather Alert)
  File     : Backend/main/java/com/service/EmailService.java
  Line     : ~144
  Issue    : Every HTML email sent by the system contains a "Open Tripify"
             button that links to http://localhost:5500/... — this is the
             local development URL. Any real user (not running the app on
             their own machine) who receives an email will click a button
             that opens a blank page.
  Severity : MEDIUM
  Fix      : Make the base URL configurable via application.properties:
             tripify.app.base-url=http://localhost:5500
             and inject it into EmailService.

BUG 6 — CORS ALLOWS NULL ORIGIN
  Feature  : Security / CORS (All endpoints)
  File     : Backend/main/java/com/config/SecurityConfig.java
  Line     : ~82-86
  Issue    : The CORS configuration includes "null" as an allowed origin:
               config.setAllowedOriginPatterns(List.of("http://localhost:*", "null"));
             Browsers send a null origin for requests from file:// pages and
             certain sandboxed iframes. Allowing it means a locally-saved
             malicious HTML file could make authenticated API calls on behalf
             of a logged-in user.
  Severity : MEDIUM
  Fix      : Remove "null" from allowed origins. Require http://localhost:*.

BUG 7 — PAKISTAN CITIES DATA IS DUPLICATED AND CAN BECOME INCONSISTENT
  Feature  : Trip Cost Calculator + Route Finder (Tourist)
  Files    : Frontend/src/js/pages/user/user-trip-cost.js   (lines 13-85)
             Frontend/src/js/pages/user/user-route-finder.js (lines 41-102)
  Issue    : The full list of 38 Pakistani cities with their coordinates is
             copy-pasted identically in two separate JS files. If a city needs
             to be corrected or added, it must be updated in both files. If
             only one is updated, the two pages will show different city lists
             and route calculations will produce different results from the
             cost calculator.
  Severity : LOW
  Fix      : Extract to a shared file: Frontend/src/js/data/cities.js
             and import it in both pages.

BUG 8 — EMAIL WILL NOT SEND WITHOUT GMAIL APP PASSWORD
  Feature  : All email notifications
  File     : Backend/main/resources/application.properties
  Line     : 37
  Issue    : The MAIL_PASSWORD property is empty by default:
               spring.mail.password=${MAIL_PASSWORD:}
             The application starts fine but silently fails to send any email
             because no password is provided to Gmail's SMTP server. There is
             no startup warning or log error indicating that email is broken.
             Users receive in-app notifications but no emails.
  Severity : LOW (feature degraded, not crashed)
  Fix      : To enable emails, generate a Gmail App Password:
             Google Account → Security → 2-Step Verification → App Passwords
             Then add to application.properties:
               spring.mail.password=YOUR_16_CHAR_APP_PASSWORD

================================================================================
END OF README
================================================================================
