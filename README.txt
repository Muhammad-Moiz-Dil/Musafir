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
Do NOT skip a step.

--------------------------------------------------------------------------------
STEP 1 — INSTALL JAVA 21 (JDK)
--------------------------------------------------------------------------------

The backend is written in Java 21. You MUST install Java 21 specifically.

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

The following Gang-of-Four (GoF) design patterns are fully implemented in the codebase:

--------------------------------------------------------------------------------
PATTERN 1 — ADAPTER (Object Adapter Variant)
--------------------------------------------------------------------------------

WHERE: UserDetailsServiceImpl.java

VARIANT: Object Adapter.

WHY OBJECT ADAPTER, NOT CLASS ADAPTER:
  - A class adapter uses inheritance from the adaptee.
  - This project does not inherit from Tripify's User or UserRepository.
  - UserDetailsServiceImpl holds a UserRepository object through composition
    and uses it to convert Tripify's User entity into Spring Security's
    UserDetails object.

HOW IT WORKS: The Adapter pattern converts the interface of one class into
another interface that a client expects. Here, Spring Security expects
objects of type UserDetails and UserDetailsService, but Tripify's domain
uses its own User entity and UserRepository. The Adapter bridges the two.

  - Client   : Spring Security authentication system
  - Target   : Spring Security's UserDetailsService interface
  - Adaptee  : Tripify's User entity + UserRepository
  - Adapter  : UserDetailsServiceImpl

  File: Backend/main/java/com/config/UserDetailsServiceImpl.java

  The adapter does three things:
  1. Calls userRepository.findByEmail() to get a Tripify User
  2. Wraps the User's email and passwordHash in Spring Security's User object
  3. Maps Tripify's UserType enum ("Tourist", "Admin", "HotelManager") to
     Spring Security's authority strings ("ROLE_Tourist", "ROLE_Admin", etc.)

  Without this adapter, Spring Security cannot directly understand Tripify's
  User class. The adapter makes both systems compatible.

--------------------------------------------------------------------------------
PATTERN 2 — TEMPLATE METHOD
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


================================================================================
SECTION 3 — FEATURES NOT IMPLEMENTED END TO END
================================================================================

All are implemented.


================================================================================
SECTION 4 — KNOWN BUGS (FEATURE / UC WISE)
================================================================================

N/a

================================================================================
END OF README
================================================================================
