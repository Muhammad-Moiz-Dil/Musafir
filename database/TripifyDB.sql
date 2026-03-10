-- ============================================
-- TRIPIFY DATABASE SCHEMA
-- ============================================
CREATE DATABASE TripifyDB;
GO

USE TripifyDB;
GO


-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) CHECK (user_type IN ('Tourist', 'Admin', 'HotelManager')) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    cnic VARCHAR(20),
    profile_picture VARCHAR(500),
    address TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    last_login DATETIME
);

-- ============================================
-- 2. DESTINATIONS TABLE
-- ============================================
CREATE TABLE Destinations (
    destination_id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(500),
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1
);

-- ============================================
-- 3. HOTELS TABLE
-- ============================================
CREATE TABLE Hotels (
    hotel_id INT PRIMARY KEY IDENTITY(1,1),
    destination_id INT NOT NULL,
    manager_id INT,
    hotel_name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    star_rating INT CHECK (star_rating BETWEEN 1 AND 5),
    price_per_night DECIMAL(10,2) NOT NULL,
    total_rooms INT NOT NULL,
    available_rooms INT NOT NULL,
    amenities TEXT,
    image_url VARCHAR(500),
    description TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_active BIT DEFAULT 1,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ============================================
-- 4. BOOKINGS TABLE
-- [SCHEMA-003 FIX] Added payment_status, payment_method, payment_reference
-- ============================================
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INT NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    booking_status VARCHAR(20) CHECK (booking_status IN ('Pending', 'Confirmed', 'Cancelled', 'Completed')) DEFAULT 'Pending',
    payment_status VARCHAR(20) CHECK (payment_status IN ('Unpaid', 'Paid', 'Refunded')) DEFAULT 'Unpaid',
    payment_method VARCHAR(50),  -- e.g. 'CreditCard', 'EasyPaisa', 'JazzCash', 'Cash'
    payment_reference VARCHAR(100),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- ============================================
-- 5. FAVORITES TABLE
-- ============================================
CREATE TABLE Favorites (
    favorite_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    added_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    UNIQUE(user_id, destination_id)
);

-- ============================================
-- 6. DESTINATION REVIEWS TABLE
-- ============================================
CREATE TABLE Reviews (
    review_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_flagged BIT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 7. HOTEL REVIEWS TABLE
-- [SCHEMA-002 FIX] Separate table for hotel-specific reviews
-- ============================================
CREATE TABLE HotelReviews (
    hotel_review_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    booking_id INT,              -- optionally tied to a completed booking
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    is_flagged BIT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id),
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE SET NULL,
    UNIQUE(user_id, hotel_id)    -- one review per hotel per user
);

-- ============================================
-- 8. TRAVEL GUIDELINES TABLE
-- ============================================
CREATE TABLE TravelGuidelines (
    guideline_id INT PRIMARY KEY IDENTITY(1,1),
    destination_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),   -- 'Visa', 'Culture', 'Safety', 'Health', 'Season'
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 9. EMERGENCY INFO TABLE
-- ============================================
CREATE TABLE EmergencyInfo (
    emergency_id INT PRIMARY KEY IDENTITY(1,1),
    destination_id INT NOT NULL,
    police_number VARCHAR(20),
    ambulance_number VARCHAR(20),
    fire_service_number VARCHAR(20),
    tourist_helpline VARCHAR(20),
    nearest_hospital VARCHAR(255),
    embassy_contact VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 10. SOUVENIRS TABLE
-- [SCHEMA-005 FIX] Added is_active flag
-- ============================================
CREATE TABLE Souvenirs (
    souvenir_id INT PRIMARY KEY IDENTITY(1,1),
    destination_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    image_url VARCHAR(500),
    vendor_name VARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 11. SEASONAL DATA TABLE
-- ============================================
CREATE TABLE SeasonalData (
    seasonal_id INT PRIMARY KEY IDENTITY(1,1),
    destination_id INT NOT NULL,
    month INT CHECK (month BETWEEN 1 AND 12) NOT NULL,
    avg_temperature DECIMAL(5,2),
    avg_rainfall DECIMAL(5,2),
    peak_season BIT DEFAULT 0,
    avg_hotel_cost DECIMAL(10,2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    UNIQUE(destination_id, month)
);

-- ============================================
-- 12. TRIPS TABLE
-- [SCHEMA-001 FIX] Persists user-planned trips
-- ============================================
CREATE TABLE Trips (
    trip_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    trip_name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    number_of_travelers INT DEFAULT 1,
    estimated_budget DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    trip_status VARCHAR(20) CHECK (trip_status IN ('Planning', 'Confirmed', 'Ongoing', 'Completed', 'Cancelled')) DEFAULT 'Planning',
    notes TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================
-- 13. TRIP DESTINATIONS TABLE
-- [SCHEMA-001 FIX] Many-to-many: Trips <-> Destinations
-- ============================================
CREATE TABLE TripDestinations (
    trip_destination_id INT PRIMARY KEY IDENTITY(1,1),
    trip_id INT NOT NULL,
    destination_id INT NOT NULL,
    visit_order INT NOT NULL,       -- sequence order within the trip
    planned_days INT DEFAULT 1,
    hotel_id INT,                   -- optional hotel choice for this stop
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (trip_id) REFERENCES Trips(trip_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id),
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE SET NULL,
    UNIQUE(trip_id, destination_id)
);

-- ============================================
-- 14. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    type VARCHAR(50),   -- 'Weather', 'Booking', 'System', 'Alert', 'Trip'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_id INT,               -- optional FK to the relevant entity (booking_id, trip_id, etc.)
    reference_type VARCHAR(50),     -- 'Booking', 'Trip', 'Review', etc.
    is_read BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================
-- 15. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE ActivityLogs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    action VARCHAR(255) NOT NULL,   -- 'LOGIN', 'SEARCH', 'BOOKING_CREATED', etc.
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ============================================
-- 16. FLAGGED CONTENT TABLE
-- [SCHEMA-004 FIX] renamed flagged_by -> reported_by; any user can report
-- ============================================
CREATE TABLE FlaggedContent (
    flag_id INT PRIMARY KEY IDENTITY(1,1),
    content_type VARCHAR(50) NOT NULL,  -- 'Review', 'HotelReview'
    content_id INT NOT NULL,
    reported_by INT NOT NULL,           -- any user (Tourist or Admin) can report
    reason TEXT,
    status VARCHAR(20) CHECK (status IN ('Pending', 'Reviewed', 'Resolved')) DEFAULT 'Pending',
    reviewed_by INT,                    -- Admin who reviewed the flag
    created_at DATETIME DEFAULT GETDATE(),
    resolved_at DATETIME,
    FOREIGN KEY (reported_by) REFERENCES Users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (reviewed_by) REFERENCES Users(user_id) ON DELETE NO ACTION
);

-- ============================================
-- 17. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE SystemSettings (
    setting_id INT PRIMARY KEY IDENTITY(1,1),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT GETDATE()
);


-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_type ON Users(user_type);

-- Destinations
CREATE INDEX idx_destinations_country ON Destinations(country);
CREATE INDEX idx_destinations_name ON Destinations(name);

-- Hotels
CREATE INDEX idx_hotels_destination ON Hotels(destination_id);
CREATE INDEX idx_hotels_manager ON Hotels(manager_id);

-- Bookings
CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_hotel ON Bookings(hotel_id);
CREATE INDEX idx_bookings_dates ON Bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_payment ON Bookings(payment_status);

-- Favorites
CREATE INDEX idx_favorites_user ON Favorites(user_id);

-- Reviews
CREATE INDEX idx_reviews_destination ON Reviews(destination_id);
CREATE INDEX idx_reviews_user ON Reviews(user_id);

-- HotelReviews
CREATE INDEX idx_hotelreviews_hotel ON HotelReviews(hotel_id);
CREATE INDEX idx_hotelreviews_user ON HotelReviews(user_id);

-- Trips
CREATE INDEX idx_trips_user ON Trips(user_id);
CREATE INDEX idx_trips_status ON Trips(trip_status);

-- TripDestinations
CREATE INDEX idx_tripdestinations_trip ON TripDestinations(trip_id);

-- Notifications
CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(is_read);

-- Activity Logs
CREATE INDEX idx_activitylogs_user ON ActivityLogs(user_id);
CREATE INDEX idx_activitylogs_action ON ActivityLogs(action);

-- FlaggedContent
CREATE INDEX idx_flaggedcontent_status ON FlaggedContent(status);
CREATE INDEX idx_flaggedcontent_reporter ON FlaggedContent(reported_by);

GO
PRINT 'Database schema created successfully!';

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;


-- ============================================
-- SAMPLE DATA
-- ============================================

-- Admin User (Password: Admin@123)
INSERT INTO Users (email, password_hash, user_type, full_name, phone_number, cnic)
VALUES ('admin@tripify.com', '$2a$10$xvBN8Zn9YZ5nZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', 'Admin', 'System Admin', '03001234567', '12345-1234567-1');

-- Sample Destinations
INSERT INTO Destinations (name, country, city, description, latitude, longitude, image_url)
VALUES
('Hunza Valley', 'Pakistan', 'Gilgit-Baltistan', 'Beautiful mountain valley with stunning views', 36.3167, 74.6500, 'hunza.jpg'),
('Murree', 'Pakistan', 'Punjab', 'Popular hill station near Islamabad', 33.9062, 73.3903, 'murree.jpg'),
('Swat Valley', 'Pakistan', 'Khyber Pakhtunkhwa', 'Switzerland of Pakistan', 35.2227, 72.4258, 'swat.jpg'),
('Skardu', 'Pakistan', 'Gilgit-Baltistan', 'Gateway to K2 and mighty peaks', 35.2977, 75.6333, 'skardu.jpg'),
('Naran Kaghan', 'Pakistan', 'Khyber Pakhtunkhwa', 'Scenic valley with lakes and mountains', 34.9042, 73.6519, 'naran.jpg');

-- Sample Hotels
INSERT INTO Hotels (destination_id, hotel_name, address, contact_number, star_rating, price_per_night, total_rooms, available_rooms, amenities)
VALUES
(1, 'Hunza Serena Inn', 'Karimabad, Hunza', '03451234567', 4, 15000, 50, 45, 'WiFi, Restaurant, Parking'),
(2, 'Pearl Continental Bhurban', 'Bhurban Road, Murree', '03451234568', 5, 25000, 100, 90, 'WiFi, Pool, Spa, Restaurant'),
(3, 'Swat Serena Hotel', 'Saidu Sharif, Swat', '03451234569', 4, 18000, 60, 55, 'WiFi, Restaurant, Garden'),
(4, 'Skardu Inn', 'Main Bazaar, Skardu', '03451234570', 3, 8000, 30, 28, 'WiFi, Restaurant'),
(5, 'Naran Pines Hotel', 'Naran Valley', '03451234571', 3, 10000, 40, 35, 'WiFi, Restaurant, Parking');

-- Sample Travel Guidelines
INSERT INTO TravelGuidelines (destination_id, title, content, category)
VALUES
(1, 'Best Time to Visit', 'Visit Hunza between April to October for best weather', 'Season'),
(1, 'Cultural Etiquette', 'Respect local customs and dress modestly', 'Culture'),
(2, 'Winter Precautions', 'Roads may be closed due to snow in winter', 'Safety'),
(3, 'Security Clearance', 'Check latest security situation before travel', 'Safety');

-- Emergency Info
INSERT INTO EmergencyInfo (destination_id, police_number, ambulance_number, tourist_helpline, nearest_hospital)
VALUES
(1, '15', '1122', '051-111-888-444', 'District Hospital Gilgit'),
(2, '15', '1122', '051-111-888-444', 'CMH Murree'),
(3, '15', '1122', '0946-9230401', 'Saidu Teaching Hospital');

-- Sample Souvenirs
INSERT INTO Souvenirs (destination_id, name, description, price, vendor_name)
VALUES
(1, 'Hunza Cap', 'Traditional woolen cap', 500, 'Karimabad Handicrafts'),
(1, 'Apricot Jam', 'Local organic apricot jam', 300, 'Hunza Organic'),
(2, 'Shawls', 'Handmade woolen shawls', 2000, 'Murree Crafts'),
(3, 'Emerald Stone', 'Natural emerald from Swat', 5000, 'Swat Gems');

-- Seasonal Data for Hunza
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost)
VALUES
(1, 4, 15.5, 30.2, 1, 18000),
(1, 5, 20.3, 25.5, 1, 20000),
(1, 6, 25.1, 15.3, 1, 22000),
(1, 7, 28.5, 10.2, 1, 25000),
(1, 8, 27.8, 12.5, 1, 24000),
(1, 9, 22.4, 18.7, 1, 20000),
(1, 10, 16.2, 25.3, 0, 15000);

-- System Settings
INSERT INTO SystemSettings (setting_key, setting_value, description)
VALUES
('BASE_TRAVEL_COST_PER_DAY', '5000', 'Base cost per person per day for trip calculation'),
('WEATHER_API_KEY', 'your_api_key_here', 'OpenWeatherMap API Key'),
('GOOGLE_MAPS_API_KEY', 'your_api_key_here', 'Google Maps API Key');

GO
PRINT 'Sample data inserted successfully!';

-- Quick verification
SELECT * FROM Users;
SELECT * FROM Destinations;
SELECT * FROM Hotels;
SELECT * FROM Souvenirs;
