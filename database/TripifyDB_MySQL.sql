-- ============================================
-- TRIPIFY DATABASE SCHEMA (MySQL)
-- ============================================
-- ⚠️  HOW TO RUN IN MYSQL WORKBENCH:
--     1. Open a new Query tab (do NOT select TripifyDB in the schema panel)
--     2. Run this entire file with Ctrl+Shift+Enter
--     The USE mysql line below ensures the DROP works even if you were connected to TripifyDB.

USE mysql;
DROP DATABASE IF EXISTS TripifyDB;
CREATE DATABASE TripifyDB;
USE TripifyDB;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('Tourist', 'Admin', 'HotelManager') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    cnic VARCHAR(20),
    profile_picture VARCHAR(500),
    address TEXT,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_active TINYINT(1) DEFAULT 1,
    last_login DATETIME
);

-- ============================================
-- 2. DESTINATIONS TABLE
-- ============================================
CREATE TABLE Destinations (
    destination_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(500),
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    search_keywords TEXT,
    altitude VARCHAR(50),
    best_time VARCHAR(100),
    budget_level VARCHAR(50),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_active TINYINT(1) DEFAULT 1
);

-- ============================================
-- 3. HOTELS TABLE
-- ============================================
CREATE TABLE Hotels (
    hotel_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    manager_id INT,
    hotel_name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    star_rating INT DEFAULT 0 CHECK (star_rating BETWEEN 0 AND 5),
    price_per_night DECIMAL(10,2) NOT NULL,
    total_rooms INT NOT NULL,
    available_rooms INT NOT NULL,
    amenities TEXT,
    image_url VARCHAR(500),
    description TEXT,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_active TINYINT(1) DEFAULT 1,
    UNIQUE KEY unique_hotel_name (hotel_name),
    UNIQUE KEY unique_hotel_phone (contact_number),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ============================================
-- 3b. ROOM TYPES TABLE
-- ============================================
CREATE TABLE RoomTypes (
    room_type_id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    price_per_night DECIMAL(10,2) NOT NULL,
    total_rooms INT NOT NULL DEFAULT 1,
    available_rooms INT NOT NULL DEFAULT 1,
    amenities TEXT,
    description TEXT,
    image_url VARCHAR(500),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
);

-- ============================================
-- 4. BOOKINGS TABLE
-- ============================================
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    room_type_id INT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    number_of_guests INT NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') DEFAULT 'Pending',
    payment_status ENUM('Unpaid', 'Paid', 'Refunded') DEFAULT 'Unpaid',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_type_id) REFERENCES RoomTypes(room_type_id) ON DELETE SET NULL
);

-- ============================================
-- 5. FAVORITES TABLE
-- ============================================
CREATE TABLE Favorites (
    favorite_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    added_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, destination_id)
);

-- ============================================
-- 6. DESTINATION REVIEWS TABLE
-- ============================================
CREATE TABLE Reviews (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    destination_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    review_text TEXT,
    verified TINYINT(1) DEFAULT 0,   -- 1 = verified traveller (completed trip), 0 = general feedback
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_flagged TINYINT(1) DEFAULT 0,
    UNIQUE KEY uq_user_dest_review (user_id, destination_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 7. HOTEL REVIEWS TABLE
-- ============================================
CREATE TABLE HotelReviews (
    hotel_review_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
    booking_id INT,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_flagged TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE NO ACTION,
    FOREIGN KEY (booking_id) REFERENCES Bookings(booking_id) ON DELETE NO ACTION,
    UNIQUE KEY unique_hotel_review (user_id, hotel_id)
);

-- ============================================
-- 8. TRAVEL GUIDELINES TABLE
-- ============================================
CREATE TABLE TravelGuidelines (
    guideline_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 9. EMERGENCY INFO TABLE
-- ============================================
CREATE TABLE EmergencyInfo (
    emergency_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    police_number VARCHAR(20),
    ambulance_number VARCHAR(20),
    fire_service_number VARCHAR(20),
    tourist_helpline VARCHAR(20),
    nearest_hospital VARCHAR(255),
    embassy_contact VARCHAR(255),
    covid_rules TEXT,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 10. SOUVENIRS TABLE
-- ============================================
CREATE TABLE Souvenirs (
    souvenir_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    image_url VARCHAR(500),
    vendor_name VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================
-- 11. SEASONAL DATA TABLE
-- ============================================
CREATE TABLE SeasonalData (
    seasonal_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
    avg_temperature DECIMAL(5,2),
    avg_rainfall DECIMAL(5,2),
    peak_season TINYINT(1) DEFAULT 0,
    avg_hotel_cost DECIMAL(10,2),
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    UNIQUE KEY unique_seasonal (destination_id, month)
);

-- ============================================
-- 12. TRIPS TABLE
-- ============================================
CREATE TABLE Trips (
    trip_id    INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT          NOT NULL,
    title      VARCHAR(255) NOT NULL,
    status     ENUM('PLANNED','COMPLETED') NOT NULL DEFAULT 'PLANNED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================
-- 13. TRIP DESTINATIONS TABLE
-- ============================================
CREATE TABLE TripDestinations (
    trip_destination_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id             INT NOT NULL,
    destination_id      INT NOT NULL,
    visit_order         INT DEFAULT 0,
    FOREIGN KEY (trip_id)        REFERENCES Trips(trip_id)               ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    UNIQUE KEY uq_trip_dest (trip_id, destination_id)
);

-- ============================================
-- 14. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE Notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    reference_id INT,
    reference_type VARCHAR(50),
    is_read TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================
-- 15. ACTIVITY LOGS TABLE
-- ============================================
CREATE TABLE ActivityLogs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ============================================
-- 16. FLAGGED CONTENT TABLE
-- ============================================
CREATE TABLE FlaggedContent (
    flag_id INT PRIMARY KEY AUTO_INCREMENT,
    content_type VARCHAR(50) NOT NULL,
    content_id INT NOT NULL,
    reported_by INT NOT NULL,
    reason TEXT,
    status ENUM('Pending', 'Reviewed', 'Resolved') DEFAULT 'Pending',
    reviewed_by INT,
    created_at DATETIME DEFAULT NOW(),
    resolved_at DATETIME,
    FOREIGN KEY (reported_by) REFERENCES Users(user_id) ON DELETE NO ACTION,
    FOREIGN KEY (reviewed_by) REFERENCES Users(user_id) ON DELETE NO ACTION
);

-- ============================================
-- 17. SYSTEM SETTINGS TABLE
-- ============================================
CREATE TABLE SystemSettings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);

-- ============================================
-- 18. USER PREFERENCES TABLE
-- ============================================
CREATE TABLE UserPreferences (
    preference_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    age_group VARCHAR(20) DEFAULT '18-25',
    travel_preferences JSON,
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_type ON Users(user_type);
CREATE INDEX idx_destinations_country ON Destinations(country);
CREATE INDEX idx_destinations_name ON Destinations(name);
CREATE INDEX idx_hotels_destination ON Hotels(destination_id);
CREATE INDEX idx_hotels_manager ON Hotels(manager_id);
CREATE INDEX idx_roomtypes_hotel ON RoomTypes(hotel_id);
CREATE INDEX idx_roomtypes_active ON RoomTypes(is_active);
CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_hotel ON Bookings(hotel_id);
CREATE INDEX idx_bookings_roomtype ON Bookings(room_type_id);
CREATE INDEX idx_bookings_dates ON Bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_payment ON Bookings(payment_status);
CREATE INDEX idx_favorites_user ON Favorites(user_id);
CREATE INDEX idx_reviews_destination ON Reviews(destination_id);
CREATE INDEX idx_reviews_user ON Reviews(user_id);
CREATE INDEX idx_hotelreviews_hotel ON HotelReviews(hotel_id);
CREATE INDEX idx_hotelreviews_user ON HotelReviews(user_id);
CREATE INDEX idx_trips_user ON Trips(user_id);
CREATE INDEX idx_trips_status ON Trips(status);
CREATE INDEX idx_tripdestinations_trip ON TripDestinations(trip_id);
CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(is_read);
CREATE INDEX idx_activitylogs_user ON ActivityLogs(user_id);
CREATE INDEX idx_activitylogs_action ON ActivityLogs(action);
CREATE INDEX idx_flaggedcontent_status ON FlaggedContent(status);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Admin password: Admin@123  (BCrypt strength 10 — generated by Spring BCryptPasswordEncoder)
INSERT INTO Users (email, password_hash, user_type, full_name, phone_number, cnic)
VALUES ('admin@tripify.com', '$2a$10$UBSS3mzzbjAmJvwSRZTaKOniKif8HJ/.plSnztlOXtD81TYJmV5I6', 'Admin', 'System Admin', '03001234567', '12345-1234567-1');

-- ── All 10 destinations (name, country, city, description, lat, lon, image_url, is_active, search_keywords) ─
INSERT INTO Destinations (name, country, city, description, latitude, longitude, image_url, is_active, search_keywords, altitude, best_time, budget_level)
VALUES

('Hunza Valley', 'Pakistan', 'Gilgit-Baltistan',
 'A breathtaking mountain valley nestled between Karakoram peaks, famous for ancient Baltit Fort, pristine Attabad Lake, cherry blossoms in spring, and stunning K2 views.',
 36.3167, 74.6500, 'hunza-valley.jpg', 1,
 'Baltit Fort, Altit Fort, Attabad Lake, Eagles Nest, Rakaposhi, Karimabad, cherry blossom, Nagar, Duikar, Ganish, Hunzakuts, Gilgit',
 '2,438 m', 'Apr–Oct', 'Moderate'),

('Murree', 'Pakistan', 'Punjab',
 'Pakistan''s most beloved hill station — cool pine forests, colonial Mall Road, chairlift rides, and fresh Kashmiri chai. Only 50 km from Islamabad.',
 33.9062, 73.3903, 'murree.jpeg', 1,
 'Mall Road, Patriata, New Murree, chairlift, Bhurban, Kashmir Point, Pindi Point, pine forest, Ayubia, Nathiagali',
 '2,291 m', 'Apr–Oct', 'Budget'),

('Swat Valley', 'Pakistan', 'Khyber Pakhtunkhwa',
 'The "Switzerland of Pakistan" — lush green mountains, clear rivers, ancient Buddhist stupas at Butkara, and vibrant bazaars in Mingora.',
 35.2227, 72.4258, 'swat.jpg', 1,
 'Mingora, Kalam, Malam Jabba, Butkara Stupa, White Palace, Fizagat Park, Bahrain, Mahodand Lake, Ushu Forest, Marghazar',
 '980 m', 'Apr–Sep', 'Budget'),

('Skardu', 'Pakistan', 'Gilgit-Baltistan',
 'Gateway to K2 and the world''s highest peaks. Cold desert plateau, turquoise Shangrila lake, and the confluence of Indus and Shigar rivers.',
 35.2977, 75.6333, 'skardu.jpeg', 1,
 'Shangrila Resort, Satpara Lake, K2 base camp, Shigar Fort, Kharphocho Fort, Deosai Plains, Upper Kachura, Concordia, Baltoro Glacier, Cold Desert',
 '2,228 m', 'Jun–Sep', 'Moderate'),

('Naran Kaghan', 'Pakistan', 'Khyber Pakhtunkhwa',
 'Home to the famous Saif-ul-Malook Lake — a high-altitude alpine lake surrounded by snow-capped peaks, glaciers and wildflower meadows.',
 34.9042, 73.6519, 'naran kaghan.jpg', 1,
 'Saif ul Malook Lake, Saiful Maluk, Lake Lulusar, Babusar Top, Lalazar, Shogran, Payye Meadows, Ansoo Lake, Batakundi, Mansehra',
 '2,409 m', 'Jun–Sep', 'Budget'),

('Lahore', 'Pakistan', 'Punjab',
 'Cultural capital of Pakistan — Mughal-era Badshahi Mosque, Lahore Fort, vibrant Food Street, and the bustling Anarkali Bazaar.',
 31.5497, 74.3436, 'lahore.jpg', 1,
 'Minar-e-Pakistan, Minare Pakistan, Minar e Pakistan, Badshahi Mosque, Lahore Fort, Shalimar Gardens, Walled City, Anarkali, Data Darbar, Food Street, Wagah Border, Wagah, Jahangir Tomb, Shahi Qila, Noor Jahan, Sunehri Masjid, Liberty Market, Gulberg, Hussain Agahi, Cooco Den, Hafiz Center, Orange Line',
 '217 m', 'Oct–Mar', 'Budget'),

('Islamabad', 'Pakistan', 'Capital Territory',
 'Pakistan''s modern capital — Faisal Mosque, Margalla Hills hiking trails, Daman-e-Koh viewpoint, and Shakarparian gardens.',
 33.6844, 73.0479, 'islamabad.jpeg', 1,
 'Faisal Mosque, Margalla Hills, Daman-e-Koh, Shakarparian, Pakistan Monument, Lake View Park, Rawal Lake, Centaurus, Trail 3, Trail 5, F-7, F-6, Saidpur Village, Lok Virsa, PIMS, Zero Point, Melody, Kohsar Market',
 '507 m', 'Oct–Apr', 'Budget'),

('Fairy Meadows', 'Pakistan', 'Gilgit-Baltistan',
 'A grassy plateau at the base of Nanga Parbat — the world''s 9th highest peak. Accessible only by jeep and foot, one of Pakistan''s most scenic campsites.',
 35.3850, 74.5891, 'fairyMeadows.jpeg', 1,
 'Nanga Parbat, Killer Mountain, Raikot Bridge, Tattu Village, Beyal Camp, Diamir, Rupal Face, basecamp, Nanga Parbat base camp, 9th highest peak',
 '3,300 m', 'Jun–Sep', 'Moderate'),

('Mohenjo Daro', 'Pakistan', 'Sindh',
 'One of the world''s earliest urban settlements dating back to 2500 BC. UNESCO World Heritage Site with remarkable ancient ruins of the Indus Valley Civilization.',
 27.3244, 68.1376, 'mohenjodaro.jpeg', 1,
 'Indus Valley Civilization, Great Bath, Dancing Girl, Priest King, Larkana, bronze age, Harappan, Mohenjodaro, Moenjodaro, ancient city, 2500 BC, UNESCO, archaeological site',
 '55 m', 'Nov–Feb', 'Budget'),

('Cholistan Desert', 'Pakistan', 'Punjab',
 'A vast desert in Bahawalpur with ancient Derawar Fort, camel safaris, and the famous Cholistan Desert Jeep Rally held every year.',
 28.2500, 71.5000, 'cholistanDesert.jpeg', 1,
 'Derawar Fort, Bahawalpur, camel safari, jeep rally, Yazman, Fort Abbas, Dingarh Fort, Marot, Islamgarh, desert camp, Cholistan rally, Abbasi',
 '150 m', 'Nov–Feb', 'Budget'),

('Peshawar', 'Pakistan', 'Khyber Pakhtunkhwa',
 'One of the oldest living cities in the world — Qissa Khwani Bazaar, historic Bala Hisar Fort, Mahabat Khan Mosque, and the rich Pashtun cultural heritage.',
 34.0151, 71.5249, 'peshawer.jpg', 1,
 'Qissa Khwani Bazaar, Bala Hisar Fort, Mahabat Khan Mosque, Peshawar Museum, Cunningham Clock Tower, Namak Mandi, Sethi House, Khyber Pass, Jamrud Fort, chappal kebab, Peshawari food',
 '327 m', 'Oct–Apr', 'Budget'),

('Azad Kashmir', 'Pakistan', 'Azad Jammu & Kashmir',
 'A paradise of green mountains, rushing rivers and deep valleys — Neelum Valley, Muzaffarabad, Rawalakot and the turquoise waters of Shounter Lake.',
 34.3700, 73.4700, 'kasmir.jpeg', 1,
 'Neelum Valley, Muzaffarabad, Rawalakot, Shounter Lake, Kel, Arang Kel, Ratti Gali Lake, Taobat, Dawarian, Athmuqam, AJK, Kashmir, Pir Chinasi, Banjosa Lake',
 '702 m', 'Apr–Oct', 'Moderate'),

('Karachi', 'Pakistan', 'Sindh',
 'Pakistan''s largest city and financial hub — Clifton Beach, Do Darya seafood, Quaid''s Mausoleum, Dolmen Mall, and a vibrant multicultural street food scene.',
 24.8607, 67.0011, 'karachi.webp', 1,
 'Clifton Beach, Sea View, Quaid Mausoleum, Mazar-e-Quaid, Do Darya, Port Grand, Empress Market, Dolmen Mall, Karachi Zoo, Pakistan Chowk, Defence, Korangi, Burns Road food, biryani, bun kebab',
 '8 m', 'Nov–Feb', 'Budget'),

('Gwadar', 'Pakistan', 'Balochistan',
 'Pakistan''s deep-sea port city on the Arabian Sea — Princess of Hope rock formation, Hammerhead viewpoint, fresh seafood, and the fast-developing CPEC hub.',
 25.1264, 62.3225, 'gawadar.jpeg', 1,
 'Princess of Hope, Hammerhead, CPEC, Arabian Sea, Gwadar Port, Jiwani, Astola Island, Pishukan Beach, Gwadar Fish Harbour, golden sand, sunset point',
 '33 m', 'Oct–Mar', 'Budget');

-- ── Hotels ───────────────────────────────────────────────────────────────────
INSERT INTO Hotels (destination_id, hotel_name, address, contact_number, star_rating, price_per_night, total_rooms, available_rooms, amenities, image_url, description, average_rating, total_reviews)
VALUES
(1, 'Eagle Nest Hotel',   'Duikar Heights, Hunza',       '03451234567', 4, 8500,  25, 12, 'WiFi,Parking,Restaurant,Mountain View',              'Eagle nest hotel.jpeg',     'Perched on a hilltop with panoramic views of Rakaposhi peak.',                          4.60,  89),
(1, 'Serena Hunza',       'Karimabad, Hunza',             '03451234568', 5, 18000, 80, 30, 'WiFi,Spa,Pool,Restaurant,Gym,Mountain View',          'serena hunza.jpeg',         'Pakistan''s most iconic 5-star luxury hotel in the heart of Hunza.',                   4.90, 134),
(1, 'Hunza Inn',          'Old Hunza Road, Karimabad',    '03451234569', 3, 4000,  20, 15, 'WiFi,Breakfast,Garden',                               'Hunza Inn.jpeg',            'Cozy budget-friendly guesthouse with warm Hunzai hospitality.',                         4.20,  62),
(2, 'Shangrila Resort',   'Mall Road, Murree',            '03451234570', 4, 7000,  40, 18, 'WiFi,Restaurant,Parking,Fireplace',                   'shengrilla resort.jpeg',    'Nestled in pine trees, just a short walk from Mall Road.',                              4.40,  78),
(2, 'Mall Hotel',         'The Mall, Murree',             '03451234571', 3, 3500,  30, 20, 'WiFi,Breakfast,Cable TV',                             'mall hotel.jpeg',           'Budget-friendly stay in the heart of Murree town.',                                     4.10,  55),
(3, 'Serena Swat',        'Saidu Sharif, Swat',           '03451234572', 5, 15000, 70, 25, 'WiFi,Pool,Spa,Restaurant,Garden,Room Service',        'sarena swat.jpg',           'Award-winning 5-star resort on the banks of the Swat River.',                          4.70, 101),
(3, 'Kalam Valley Hotel', 'Kalam, Upper Swat',            '03451234573', 3, 3000,  25, 18, 'WiFi,Parking,River View',                             'kalam valley hotel.jpeg',   'Simple mountain hotel with stunning river views in Kalam.',                             4.20,  44),
(4, 'Serena Skardu',      'Katpana, Skardu',              '03451234574', 5, 20000, 60, 20, 'WiFi,Spa,Restaurant,Mountain View,Library',           'sarena skardu.jpeg',        'Luxury property surrounded by 8000m peaks in Skardu valley.',                          4.80,  97),
(4, 'K2 Motel',           'Main Bazaar, Skardu',          '03451234575', 3, 4500,  25, 15, 'WiFi,Parking,Meals',                                  'k2 motel.jpeg',             'No-frills clean stay, perfect base for K2 trekkers.',                                  4.00,  38),
(5, 'Pine Park Hotel',    'Naran Valley Road, Naran',     '03451234576', 4, 6500,  35, 22, 'WiFi,Restaurant,Garden,River View',                   'pine park hotel.jpeg',      'Charming hotel overlooking the Kunhar River in Naran valley.',                          4.30,  67),
(5, 'Kaghan Resort',      'Kaghan Village, Kaghan',       '03451234577', 3, 3200,  20, 14, 'WiFi,Breakfast,Campfire',                             'kaghan resort.jpg',         'Rustic mountain resort perfect for adventure travellers.',                              4.00,  41),
-- Lahore (6)
(6,  'Pearl Continental Lahore',  'Shahrah-e-Quaid-e-Azam, Lahore',   '042-111505505', 5, 22000, 150, 60, 'WiFi,Pool,Spa,Restaurant,Gym,Valet Parking',            'PC hotel.webp',       'Lahore''s most prestigious 5-star hotel in the heart of the city.',                  4.80, 210),
(6,  'Avari Towers Lahore',       'Fatima Jinnah Road, Lahore',        '042-111282747', 5, 16000,  90, 40, 'WiFi,Restaurant,Pool,Conference Rooms',                  'Avari.webp',          'Iconic 5-star hotel offering luxury stays near Lahore''s top attractions.',            4.60, 155),
(6,  'Faletti''s Hotel',          'Egerton Road, Lahore',              '042-36304751',  4,  9500,  60, 25, 'WiFi,Restaurant,Garden,Heritage Architecture',           'falettis.webp',       'Heritage hotel established in 1880 — a slice of colonial Lahore.',                   4.40,  88),
-- Islamabad (7)
(7,  'Serena Islamabad',          'Khayaban-e-Suhrawardy, Islamabad',  '051-111133133', 5, 24000, 180, 70, 'WiFi,Pool,Spa,Restaurant,Gym,Business Centre',           'islamabad.jpeg',      'Islamabad''s landmark luxury hotel set in lush greenery.',                            4.85, 230),
(7,  'Marriott Islamabad',        'Aga Khan Road, Islamabad',          '051-2826121',   5, 20000, 160, 65, 'WiFi,Pool,Restaurant,Conference,Valet Parking',          'islamabad.jpeg',      'Classic 5-star hotel in the diplomatic enclave of Islamabad.',                        4.70, 198),
-- Fairy Meadows (8)
(8,  'Fairy Meadows Hut',         'Fairy Meadows, Diamer, GB',         '03001234580',   2,  3500,  12,  8, 'Meals,Bonfire,Mountain View,Trekking Support',           'fairyMeadows.jpeg',   'Basic wooden huts at the base of Nanga Parbat — a trekker''s paradise.',              4.50,  73),
(8,  'Raikot Bridge Camp',        'Raikot Bridge, Chilas Road, GB',    '03001234581',   2,  2500,  10,  7, 'Meals,Parking,River View',                               'fairyMeadows.jpeg',   'Simple guesthouse at the start of the Fairy Meadows trail.',                          4.20,  41),
-- Mohenjo Daro (9)
(9,  'Moenjodaro Rest House',     'Near Site Museum, Mohenjo Daro',    '0743-470012',   2,  2800,   8,  5, 'Meals,Parking,Archaeological Site Access',               'mohenjodaro.jpeg',    'Government rest house for visitors to the Indus Valley Civilization site.',            4.10,  29),
-- Cholistan Desert (10)
(10, 'Fort Derawar Desert Camp',  'Near Derawar Fort, Cholistan',      '03001234583',   3,  6000,  15, 10, 'Meals,Campfire,Camel Safari,Jeep Safari',                'cholistanDesert.jpeg','Luxury desert camp with breathtaking views of Derawar Fort.',                         4.50,  52),
(10, 'Cholistan Oasis Resort',    'Yazman Road, Bahawalpur',           '03001234584',   3,  4500,  20, 12, 'WiFi,Meals,Pool,Parking,Desert Tours',                   'cholistanDesert.jpeg','Modern resort serving as the best base for Cholistan Desert exploration.',             4.30,  38);

-- ── Room Types ────────────────────────────────────────────────────────────────
-- 2-3 room types per hotel; available_rooms < total_rooms to show realistic occupancy
INSERT INTO RoomTypes (hotel_id, type_name, capacity, price_per_night, total_rooms, available_rooms, amenities, description)
VALUES
-- Eagle Nest Hotel (1) ─────────────────────────────────────────────────────
(1, 'Standard Room',        2, 7000,  10, 6,  'WiFi,Mountain View,Attached Bath',       'Comfortable room with stunning Rakaposhi views.'),
(1, 'Deluxe Double',        2, 9500,   8, 4,  'WiFi,Mountain View,Attached Bath,AC,TV', 'Spacious deluxe room with floor-to-ceiling mountain views.'),
(1, 'Family Suite',         4, 16000,  4, 2,  'WiFi,Mountain View,Attached Bath,AC,TV,Mini Bar', 'Ideal for families — two bedrooms with panoramic views.'),
-- Serena Hunza (2) ────────────────────────────────────────────────────────
(2, 'Superior Room',        2, 16000, 30,12,  'WiFi,Spa Access,Breakfast,AC,TV,Mountain View',    'Elegant room with modern furnishings and valley views.'),
(2, 'Deluxe Suite',         2, 22000, 15, 6,  'WiFi,Spa,Pool Access,Breakfast,AC,TV,Balcony',     'Luxury suite with private balcony overlooking Hunza Valley.'),
(2, 'Presidential Suite',   4, 38000,  3, 1,  'WiFi,Private Pool,Butler,Breakfast,Full Board',    'Ultimate luxury — two bedrooms, private pool and butler.'),
-- Hunza Inn (3) ───────────────────────────────────────────────────────────
(3, 'Single Room',          1, 2800,   8, 6,  'WiFi,Breakfast,Shared Bath',             'Cozy single room perfect for solo travellers.'),
(3, 'Standard Double',      2, 4200,   9, 7,  'WiFi,Breakfast,Attached Bath,Garden View','Double room with garden views and Hunzai hospitality.'),
(3, 'Triple Room',          3, 5800,   3, 3,  'WiFi,Breakfast,Attached Bath,Garden View','Spacious triple room for small groups or families.'),
-- Shangrila Resort (4) ────────────────────────────────────────────────────
(4, 'Standard Room',        2, 6000,  15, 8,  'WiFi,Parking,TV,Attached Bath',          'Warm and comfortable room surrounded by pine trees.'),
(4, 'Deluxe Room',          2, 8000,  15,10,  'WiFi,Restaurant Access,TV,Fireplace',    'Cozy deluxe room with a wood fireplace — perfect for winters.'),
(4, 'Family Room',          4, 13000,  5, 3,  'WiFi,Restaurant Access,TV,Fireplace,Parking','Spacious family room sleeping up to 4 guests.'),
-- Mall Hotel (5) ──────────────────────────────────────────────────────────
(5, 'Single Room',          1, 2500,  12,10,  'WiFi,Breakfast,Cable TV',               'Budget single room right on Mall Road Murree.'),
(5, 'Standard Double',      2, 3800,  15,12,  'WiFi,Breakfast,Cable TV,Attached Bath', 'Comfortable double room for couples or friends.'),
-- Serena Swat (6) ─────────────────────────────────────────────────────────
(6, 'Superior Garden Room', 2, 13000, 25,10,  'WiFi,Pool,Spa,Restaurant,Garden View',  'Elegant room with lush garden views along the Swat River.'),
(6, 'Deluxe River View',    2, 17000, 20, 8,  'WiFi,Pool,Spa,Restaurant,River View,Balcony','Deluxe room with private balcony overlooking the Swat River.'),
(6, 'Family Suite',         4, 27000,  5, 2,  'WiFi,Pool,Spa,Restaurant,Butler,River View','Luxury family suite — two bedrooms with river and mountain views.'),
-- Kalam Valley Hotel (7) ──────────────────────────────────────────────────
(7, 'Standard Room',        2, 3200,  12, 9,  'WiFi,River View,Attached Bath',          'Simple clean room with stunning river views.'),
(7, 'Family Room',          4, 5500,   6, 4,  'WiFi,River View,Attached Bath,Balcony', 'Family room with balcony directly overlooking the river.'),
-- Serena Skardu (8) ───────────────────────────────────────────────────────
(8, 'Deluxe Mountain View', 2, 18000, 25, 9,  'WiFi,Spa,Restaurant,Mountain View,AC,TV','Breathtaking views of K2 and surrounding 8000m peaks.'),
(8, 'Luxury Suite',         2, 24000, 10, 4,  'WiFi,Spa,Restaurant,Balcony,Mini Bar',  'Elegant suite with private sitting area and mountain panorama.'),
(8, 'Presidential Suite',   4, 42000,  2, 1,  'WiFi,Butler,Full Board,Private Terrace,Mountain View','Exclusive two-bedroom suite — the pinnacle of Skardu luxury.'),
-- K2 Motel (9) ───────────────────────────────────────────────────────────
(9, 'Standard Room',        2, 4000,  14,10,  'WiFi,Meals Included,Attached Bath',      'Clean no-frills room — ideal base for K2 trekkers.'),
(9, 'Double Room',          2, 5000,   8, 6,  'WiFi,Meals Included,Attached Bath,TV',  'Slightly larger double room with TV.'),
-- Pine Park Hotel (10) ────────────────────────────────────────────────────
(10,'Standard Room',        2, 5500,  15,10,  'WiFi,River View,Restaurant,Attached Bath','Comfortable room with lovely Kunhar River views.'),
(10,'Deluxe River View',    2, 7500,  12, 7,  'WiFi,River View,Restaurant,Balcony,TV', 'Upgraded room with private balcony over the river.'),
(10,'Family Room',          4,12000,   5, 3,  'WiFi,River View,Restaurant,Balcony,TV', 'Spacious family room — garden and river on both sides.'),
-- Kaghan Resort (11) ──────────────────────────────────────────────────────
(11,'Standard Room',        2, 3000,  12, 9,  'WiFi,Campfire Access,Breakfast,Attached Bath','Rustic mountain room with access to evening campfire.'),
(11,'Family Room',          4, 5200,   5, 4,  'WiFi,Campfire Access,Breakfast,Attached Bath','Family room sleeping 4 — perfect for adventure groups.'),
-- Pearl Continental Lahore (12) ──────────────────────────────────────────
(12,'Executive Room',       2, 20000, 60,25,  'WiFi,Pool,Spa,Gym,Restaurant,AC,TV,Mini Bar','Refined room in Lahore''s most prestigious address.'),
(12,'Deluxe Suite',         2, 28000, 25,10,  'WiFi,Pool,Spa,Gym,Lounge Access,Butler', 'Spacious suite with exclusive lounge access.'),
(12,'Presidential Suite',   4, 50000,  5, 2,  'WiFi,Private Pool,Butler,Full Board,City View','The ultimate Lahore luxury experience — full city panorama.'),
-- Avari Towers Lahore (13) ────────────────────────────────────────────────
(13,'Superior Room',        2, 14000, 40,18,  'WiFi,Pool,Restaurant,AC,TV,City View',   'Classic superior room with skyline views.'),
(13,'Deluxe Suite',         2, 20000, 20, 8,  'WiFi,Pool,Restaurant,Lounge Access,City View','Expansive suite with floor-to-ceiling windows.'),
-- Faletti''s Hotel (14) ───────────────────────────────────────────────────
(14,'Heritage Room',        2,  8500, 25,12,  'WiFi,Restaurant,Garden View,AC,TV',      'Classic room in a beautifully preserved colonial building.'),
(14,'Deluxe Heritage Room', 2, 10500, 20, 9,  'WiFi,Restaurant,Garden View,AC,TV,Mini Bar','Upgraded heritage room with garden-facing balcony.'),
(14,'Family Suite',         4, 17000,  6, 3,  'WiFi,Restaurant,Garden View,AC,TV,Lounge','Elegant suite with two bedrooms in heritage style.'),
-- Serena Islamabad (15) ───────────────────────────────────────────────────
(15,'Deluxe Room',          2, 22000, 70,28,  'WiFi,Pool,Spa,Gym,Restaurant,Business Centre','Refined room in Islamabad''s landmark hotel.'),
(15,'Executive Suite',      2, 28000, 25,10,  'WiFi,Pool,Spa,Lounge,Butler,City View',  'Luxurious suite with panoramic Margalla Hills views.'),
(15,'Presidential Suite',   4, 52000,  3, 1,  'WiFi,Private Butler,Full Board,Private Terrace','Exceptional two-bedroom suite — unrivalled Islamabad luxury.'),
-- Marriott Islamabad (16) ─────────────────────────────────────────────────
(16,'Superior Room',        2, 18000, 65,30,  'WiFi,Pool,Restaurant,AC,TV,City View',   'Classic superior room in the diplomatic enclave.'),
(16,'Deluxe Suite',         2, 23000, 25,10,  'WiFi,Pool,Restaurant,Lounge,City View',  'Spacious suite with excellent Islamabad city views.'),
-- Fairy Meadows Hut (17) ──────────────────────────────────────────────────
(17,'Wooden Hut (2 pax)',   2,  3500,   6, 5,  'Meals Included,Bonfire,Mountain View,Trekking Support','Cozy wooden hut at the base of Nanga Parbat — surreal views.'),
(17,'Wooden Hut (4 pax)',   4,  6000,   4, 3,  'Meals Included,Bonfire,Mountain View,Trekking Support','Larger hut for families or groups — epic Nanga Parbat backdrop.'),
-- Raikot Bridge Camp (18) ─────────────────────────────────────────────────
(18,'Basic Room',           2,  2500,   6, 5,  'Meals Included,Parking,River View',      'Simple clean room at the trailhead of Fairy Meadows.'),
(18,'Triple Room',          3,  3500,   4, 3,  'Meals Included,Parking,River View',      'Slightly larger room for small groups.'),
-- Moenjodaro Rest House (19) ──────────────────────────────────────────────
(19,'Standard Room',        2,  2800,   5, 4,  'Meals,Parking,Archaeological Site Access','Government rest house — best base for exploring the ancient ruins.'),
(19,'Family Room',          4,  4800,   2, 1,  'Meals,Parking,Archaeological Site Access','Larger room for family visits to the UNESCO heritage site.'),
-- Fort Derawar Desert Camp (20) ───────────────────────────────────────────
(20,'Luxury Desert Tent',   2,  5000,   8, 6,  'Meals,Campfire,Camel Safari,Stargazing', 'Comfortable air-cooled tent with breathtaking Derawar Fort views.'),
(20,'Deluxe Tent',          4,  8000,   4, 3,  'Meals,Campfire,Camel Safari,Jeep Safari,Stargazing','Larger deluxe tent with attached washroom — perfect for families.'),
(20,'Desert Cabin',         6, 12000,   2, 1,  'Meals,Private Campfire,Jeep Safari,Camel Safari','Private cabin sleeping 6 — ideal for groups and premium experiences.'),
-- Cholistan Oasis Resort (21) ─────────────────────────────────────────────
(21,'Standard Room',        2,  4200,  10, 7,  'WiFi,Pool,Meals,Parking',               'Clean comfortable room — perfect base for Cholistan exploration.'),
(21,'Deluxe Room',          2,  5500,   7, 5,  'WiFi,Pool,Meals,Parking,Desert View',   'Upgraded room with desert views and pool access.'),
(21,'Family Room',          4,  8500,   3, 2,  'WiFi,Pool,Meals,Parking,Desert View,Balcony','Spacious family room with a private balcony facing the desert.');

-- ── Travel Guidelines (all categories for all 10 destinations) ───────────────
INSERT INTO TravelGuidelines (destination_id, title, content, category)
VALUES
-- Hunza Valley (1)
(1, 'Visa Requirements', 'Pakistani nationals need no visa. Foreign nationals should have a valid Pakistan visa. Some areas near the Chinese border require a special permit - obtain it from NADRA or a local travel agency before departure.', 'Visa'),
(1, 'Best Time to Visit', 'April to October is ideal for visiting Hunza. The cherry blossom season in April is spectacular. Winters (November to March) bring heavy snowfall and many roads become impassable.', 'Weather'),
(1, 'Cultural Etiquette', 'Dress modestly, especially in local villages. Ismaili Muslim customs are followed - greet locals with Assalam-o-Alaikum. Photography of women without consent is strictly prohibited. Alcohol is not available.', 'Culture'),
(1, 'Altitude & Health', 'Hunza sits at 2,400m above sea level. Altitude sickness is possible - ascend gradually and stay hydrated. Carry basic medicines. The nearest major hospital is in Gilgit city.', 'Health'),
(1, 'Getting There', 'Travel via Karakoram Highway (N-35) from Islamabad (~16 hours by road). Gilgit Airport has daily flights from Islamabad (weather permitting). Local jeeps and wagons connect Gilgit to Karimabad.', 'Transport'),

-- Murree (2)
(2, 'Visa Requirements', 'No special permits required for Pakistani nationals visiting Murree. It is a domestic tourist destination easily accessible from Islamabad and Rawalpindi.', 'Visa'),
(2, 'Winter Road Safety', 'Roads to Murree can be closed due to heavy snow from December to February. Always check NHMP road closure alerts before travelling. Carry chains or snow tyres in winter.', 'Safety'),
(2, 'Best Time to Visit', 'May to September is peak season with pleasant weather. Winter (December-February) is popular for snowfall but roads may be hazardous. Avoid long weekends as traffic congestion is extreme.', 'Weather'),
(2, 'Crowd & Weekend Tips', 'Murree is extremely crowded on public holidays and long weekends. Book hotels at least 2 weeks in advance. Plan to travel on weekdays to avoid hours of traffic on the main Mall Road.', 'General'),
(2, 'Getting There', 'Murree is 60 km from Islamabad via N-75. Daewoo Express and local coaches run from Rawalpindi. Taxis and ride-hailing apps are available from Islamabad. Drive time is 1.5-2.5 hours depending on traffic.', 'Transport'),

-- Swat Valley (3)
(3, 'Security Advisory', 'Check the latest security situation from Pakistan Tourism Development Corporation before visiting Swat. The valley has been peaceful for tourists in recent years. Register with local police if staying overnight in remote areas.', 'Safety'),
(3, 'Best Time to Visit', 'April to October is the best time. The spring season (April-May) brings lush greenery. Summers are mild and perfect for trekking. Winters are cold and snowy above 1,500m.', 'Weather'),
(3, 'Cultural Respect', 'Swat is a conservative area - dress modestly and cover shoulders and legs. Respect local Pashtun customs. Do not take photos of local women. Learn a few Pashto greetings - locals greatly appreciate the effort.', 'Culture'),
(3, 'Getting There', 'Travel via M-1 Motorway from Islamabad to Swabi, then N-95 to Mingora (~4 hours). Coaches run from Rawalpindi General Bus Stand. Domestic flights are not available to Swat currently.', 'Transport'),

-- Skardu (4)
(4, 'Permits Required', 'Skardu is in Gilgit-Baltistan - Pakistani nationals do not need a permit. Foreign nationals visiting restricted border zones (near Deosai, K2 base camp) need a NOC from the Ministry of Interior. Apply at least 4 weeks in advance.', 'Visa'),
(4, 'Altitude Sickness', 'Skardu is at 2,228m. K2 treks go above 5,000m. Acclimatise for at least 2 days in Skardu before trekking. Symptoms of altitude sickness: headache, nausea, dizziness. Descend immediately if symptoms worsen.', 'Health'),
(4, 'Best Time to Visit', 'June to September is ideal for trekking to K2 and Concordia. April-May for jeep safaris. The Deosai Plains are accessible July-September only. Avoid October to May for high-altitude treks.', 'Weather'),
(4, 'Trekking Safety', 'Always hire a licensed guide for treks above 3,000m. Inform local authorities of your trekking route. Carry a satellite phone or GPS device for remote treks. Emergency rescue is operated by Pakistan Army.', 'Safety'),
(4, 'Getting There', 'PIA operates daily flights from Islamabad to Skardu (subject to weather - cancellations are common). Road journey via Karakoram Highway takes 20-24 hours from Islamabad. Book flights and hotels well in advance.', 'Transport'),

-- Naran Kaghan (5)
(5, 'Best Time to Visit', 'July to September is peak season for Naran and Kaghan Valley. Babusar Top (4,173m) is accessible July-September only. Spring (May-June) is beautiful but some roads may still be recovering from winter damage.', 'Weather'),
(5, 'Road Conditions', 'The Babusar Top road is seasonal - open only July to September. Check with NHMP for current road status. The road from Balakot to Naran can be prone to landslides during monsoon rains.', 'Safety'),
(5, 'Local Health Tips', 'Carry basic first aid and medicines. The nearest large hospital is in Mansehra. Mobile connectivity is limited beyond Naran town - Zong and Telenor have the best coverage.', 'Health'),
(5, 'Cultural Tips', 'Naran is in Khyber Pakhtunkhwa - dress modestly and respect local customs. Bargaining is common at local shops. Try local trout fish - a regional specialty.', 'Culture'),
(5, 'Getting There', 'From Islamabad, take M-1 to Hazara Motorway, then towards Mansehra and Balakot to Naran (~5 hours). No flights available. Local coasters run from Mansehra. Jeeps are available from Naran for Babusar Top.', 'Transport'),

-- Lahore (6)
(6, 'Visa Requirements', 'Pakistani nationals need no visa. Foreign tourists should have a valid Pakistan visa. Citizens of India require special permission and entry is handled through the Wagah Border crossing only.', 'Visa'),
(6, 'Best Time to Visit', 'October to March is the best time. Winters are mild and pleasant (5-20C). Summers (May-August) are extremely hot (40-45C) and humid. Monsoon brings relief in July-August but humidity rises.', 'Weather'),
(6, 'Cultural Etiquette', 'Dress modestly when visiting mosques and shrines - cover head and remove shoes before entering. At Data Darbar and Badshahi Mosque, separate entrances exist for men and women. Photography inside shrines may be restricted.', 'Culture'),
(6, 'Health Tips', 'Drink bottled or filtered water only. Street food is delicious but choose busy, clean stalls. In summer, stay hydrated and avoid midday outdoor activity. Dengue fever is seasonal (July-October) - use mosquito repellent.', 'Health'),
(6, 'Getting Around', 'Lahore has the Orange Line Metro Train connecting major areas. Rickshaws and Careem/Uber are widely available. Lahore Airport (Allama Iqbal International) has domestic and international flights. Roads are busy - allow extra travel time during peak hours.', 'Transport'),

-- Islamabad (7)
(7, 'Visa Requirements', 'Pakistani nationals need no visa. Foreign tourists need a valid Pakistan visa - most nationalities can apply online via Pakistan e-Visa portal. The Islamabad International Airport is the main entry point for international visitors.', 'Visa'),
(7, 'Best Time to Visit', 'October to April offers pleasant weather (10-25C). Summers (June-August) are hot but milder than other cities (30-35C). Islamabad receives monsoon rains July-September, making the Margalla Hills lush and green.', 'Weather'),
(7, 'Safety', 'Islamabad is one of the safest cities in Pakistan for tourists. It is a planned city with clearly marked sectors. Carry your CNIC or passport at all times as security checkpoints are common near diplomatic areas.', 'Safety'),
(7, 'Cultural Tips', 'Dress modestly when visiting Faisal Mosque and other religious sites. The mosque has separate entrances and prayer areas for men and women. Non-Muslims are welcome outside prayer times.', 'Culture'),
(7, 'Getting Around', 'Islamabad International Airport (IATA: ISB) is 25 km from the city centre. Metro Bus connects Islamabad to Rawalpindi. Uber and Careem are widely available. Rental cars are available at the airport.', 'Transport'),

-- Fairy Meadows (8)
(8, 'Permits Required', 'Pakistani nationals do not need a special permit for Fairy Meadows. For trekking towards Nanga Parbat Base Camp, a registered guide is mandatory. Foreign nationals may need a NOC for high-altitude trekking.', 'Visa'),
(8, 'Best Time to Visit', 'June to September is the only accessible season. October to May the road is closed due to snow. July and August offer clearest views of Nanga Parbat (8,126m). Nights at the meadow (3,300m) can drop to 5C even in summer.', 'Weather'),
(8, 'Trekking Safety', 'The jeep track from Raikot Bridge to Tattu village is one of the most dangerous roads in the world - narrow, unpaved, with sheer drops. The 3 km hike from Tattu to Fairy Meadows takes about 1.5 hours. Hire a local guide for the Nanga Parbat base camp trek.', 'Safety'),
(8, 'Health & Altitude', 'Fairy Meadows sits at 3,300m. Acclimatise for at least 1 day before trekking higher. Carry sufficient water, snacks, and warm clothing. There are no medical facilities on-site - the nearest hospital is in Chilas town.', 'Health'),
(8, 'Getting There', 'Drive from Islamabad to Raikot Bridge on the Karakoram Highway (~6 hours). From Raikot Bridge, take a hired jeep (1 hour) to Tattu village. Then hike 3 km to Fairy Meadows. Book jeeps in advance through local operators.', 'Transport'),

-- Mohenjo Daro (9)
(9, 'Visa Requirements', 'Pakistani nationals need no permit. Foreign tourists need a valid Pakistan visa and are advised to register with local police upon arrival in Larkana district. Entry fees apply at the Mohenjo Daro site gate.', 'Visa'),
(9, 'Best Time to Visit', 'November to February is the best time. Winters are mild (10-20C) and comfortable for outdoor exploration. Summers (April-September) are brutally hot (45-50C) in interior Sindh and are strongly discouraged.', 'Weather'),
(9, 'Cultural Significance', 'Mohenjo Daro is one of the world oldest cities (3000 BCE), part of the ancient Indus Valley Civilisation. Do not touch or climb on any ruins. Photography is permitted but using flash or tripods inside the museum requires written permission.', 'Culture'),
(9, 'Health Precautions', 'Carry plenty of water - there are limited refreshment facilities at the site. The site is entirely outdoors with minimal shade. Wear sunscreen, a hat, and light cotton clothing. The nearest hospital is in Larkana city (~30 km).', 'Health'),
(9, 'Getting There', 'Fly to Moenjodaro Airport (IATA: MJD) from Karachi or Islamabad. Alternatively, take a train or bus to Larkana, then hire a local taxi to the site (~30 km). Site entry fee is approximately PKR 500 for Pakistani nationals.', 'Transport'),

-- Cholistan Desert (10)
(10, 'Best Time to Visit', 'November to February is ideal for Cholistan. Winters bring cool temperatures (5-20C). The Cholistan Desert Jeep Rally is held in February. Summers (May-September) are dangerously hot (50C+) and should be avoided.', 'Weather'),
(10, 'Desert Safety', 'Never enter the desert alone. Always hire a local guide or join an organised tour from Bahawalpur. Carry at least 4 litres of water per person per day. Sandstorms can occur suddenly - have a plan to shelter. Share your route before entering.', 'Safety'),
(10, 'Cultural Tips', 'The desert is home to nomadic communities and ancient Derawar Fort. Dress modestly and ask permission before photographing local people. The communities are welcoming but privacy must be respected.', 'Culture'),
(10, 'Health Tips', 'Carry oral rehydration salts and antihistamines for sand allergies. Sun protection (SPF 50+, full-sleeve clothing, sunglasses) is essential. Mobile signal is limited - Zong has the best coverage in Bahawalpur district.', 'Health'),
(10, 'Getting There', 'Bahawalpur is the gateway to Cholistan - fly from Karachi or Lahore, or take the Lahore-Bahawalpur Daewoo Express (~5 hours). From Bahawalpur, hire a 4x4 jeep to Derawar Fort (~100 km on desert tracks). A standard car cannot navigate the terrain.', 'Transport');

-- ── Safety Guidelines (UC15 — extended safety data for destinations 1–5) ─────
-- NOTE: These supplement the existing guidelines above. Do NOT run UC15_EmergencyData.sql
-- separately as it uses bare DELETE statements that wipe the TravelGuidelines table.
INSERT INTO TravelGuidelines (destination_id, title, content, category)
VALUES
-- Hunza Valley (1)
(1, 'Altitude Sickness Prevention', 'Hunza sits above 2,400m. Ascend slowly — max 500m gain per day. Drink 3-4 litres of water daily. Severe headache, nausea or confusion means descend immediately and seek help at DHQ Gilgit.', 'Safety'),
(1, 'NOC Requirements', 'Foreign nationals require a No Objection Certificate for areas beyond Karimabad including Khunjerab Pass. Obtain it from the Deputy Commissioner office in Gilgit before travel.', 'Safety'),
(1, 'Road Safety on KKH', 'The Karakoram Highway has narrow sections with steep drops. Travel only during daylight. Avoid driving after rain as landslides are common. Keep an emergency supply kit in your vehicle.', 'Safety'),
(1, 'Communication in Remote Areas', 'Mobile signal is weak or absent in many valleys beyond Karimabad. Inform someone of your route and expected return time. Satellite communicators are recommended for remote treks.', 'Safety'),

-- Murree (2)
(2, 'Hypothermia Risk', 'Temperatures fall below -10C in winter. Wear layered clothing, waterproof boots and gloves. If someone shows confusion or stops shivering, seek medical help immediately at THQ Murree.', 'Safety'),
(2, 'Flash Flood Warning', 'During monsoon July to August, heavy rain causes flash floods and landslides on mountain roads. Monitor PMD weather alerts. Do not camp near river banks during monsoon season.', 'Safety'),
(2, 'Crowd Safety', 'Murree gets extremely crowded during winter holidays. Plan your visit on weekdays. Keep a close eye on children in crowded areas. Avoid parking on roadsides as it blocks emergency vehicle access.', 'Safety'),

-- Swat Valley (3)
(3, 'River Safety', 'Do not swim in the Swat River during monsoon season July to August. Currents become dangerously fast. Keep children away from river banks. Only use designated safe areas for river activities.', 'Safety'),
(3, 'Medical Facilities', 'Saidu Teaching Hospital 0946-9230300 is the main hospital. Carry a basic first aid kit for remote valleys. Edhi Ambulance 115 covers most of the valley.', 'Safety'),
(3, 'Emergency in Kalam', 'Kalam is a remote area with very limited medical resources. The nearest hospital is THQ Bahrain. Carry all prescription medications, altitude sickness tablets, and a comprehensive first aid kit.', 'Safety'),

-- Skardu (4)
(4, 'Flight Cancellation Risk', 'Skardu airport flights are frequently cancelled due to bad weather. Always carry 2-3 extra days of cash, food and medications in case you are stranded. Book refundable tickets when possible.', 'Safety'),
(4, 'Altitude and Acclimatisation', 'Skardu is at 2,228m. Spend 1-2 days acclimatising before trekking higher. Common symptoms of altitude sickness are headache, nausea and shortness of breath. Descend immediately if symptoms worsen.', 'Safety'),
(4, 'Extreme Weather Conditions', 'Summer days can be warm at 25C but nights drop to 5-10C. Winters are extreme and the area is inaccessible October to May. Carry sunscreen as UV radiation is intense at high altitude.', 'Safety'),
(4, 'Carry Cash Only', 'ATMs are limited and frequently out of service in Skardu. Carry sufficient PKR cash for the entire trip. Credit cards are rarely accepted. Nearest reliable banking is in Gilgit city.', 'Safety'),

-- Naran Kaghan (5)
(5, 'Seasonal Access Window', 'Naran is accessible only June to September. Babusar Top pass at 4,173m closes the rest of the year due to heavy snow. Always verify pass conditions with local police before attempting to cross.', 'Safety'),
(5, 'Cold Night Temperatures', 'Even in peak summer, night temperatures near Saif-ul-Malook Lake drop to 0C or below. Pack a warm sleeping bag, thermal undergarments, and a weatherproof jacket. Do not underestimate the cold.', 'Safety'),
(5, 'Flash Flood Risk', 'The trail to Lake Saif-ul-Malook is steep and dangerous after rain. Only take the jeep trail — do not attempt on foot alone. Always hire a local guide for high-altitude treks.', 'Safety'),
(5, 'Vehicle Requirements', 'Beyond Naran town, roads are unpaved, steep and rocky. Only 4x4 vehicles should be used — standard cars will get stranded. Hire a local jeep driver who knows the routes well.', 'Safety');

-- ── Emergency Info (complete data for all 10 destinations) ───────────────────
-- Uses UC15 verified local numbers. Covers police, ambulance, fire, tourist helpline,
-- nearest hospital, embassy contact, and COVID-19 guidelines for all 10 destinations.
INSERT INTO EmergencyInfo (destination_id, police_number, ambulance_number, fire_service_number, tourist_helpline, nearest_hospital, embassy_contact, covid_rules)
VALUES
(1, '05811-920070', '1122', '16', '1422', 'DHQ Hospital Gilgit',          '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No PCR test required for domestic travel. Carry your vaccination card if available. Masks are optional but recommended in crowded bazaars. Health screening may apply at Gilgit airport.'),
(2, '051-3465010',  '1122', '16', '1422', 'THQ Hospital Murree',          '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No PCR test or quarantine required for domestic travel. During peak tourist season, Murree can become overcrowded — keep hand sanitizer handy. Restaurants and hotels are fully operational.'),
(3, '0946-9230100', '1122', '16', '1422', 'Saidu Teaching Hospital',      '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No special entry requirements for Swat Valley. Vaccination recommended before travel. Hotels, guesthouses and public transport are operating normally. Carry personal hygiene supplies for remote treks.'),
(4, '05815-920070', '1122', '16', '1422', 'DHQ Hospital Skardu',          '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No PCR test required for domestic flights to Skardu. Vaccination card is recommended. Remote high-altitude areas have extremely limited medical facilities — ensure you are fully vaccinated. Carry personal medicines for extended stays.'),
(5, '0997-360011',  '1122', '16', '1422', 'THQ Hospital Mansehra',        '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No special protocols required for Naran-Kaghan. Vaccination recommended. Medical facilities are very limited in the valley — carry personal medicines. During July-August peak season, practice standard hygiene in crowded tourist spots.'),
(6, '042-99213590', '1122', '16', '1422', 'Services Hospital Lahore',     '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No PCR test or quarantine required for domestic travel to Lahore. Vaccination card recommended but not mandatory. All restaurants, hotels, museums and tourist sites are fully operational. Standard hygiene practices advised in crowded markets like Anarkali and Food Street.'),
(7, '051-9261100',  '1122', '16', '1422', 'PIMS Hospital Islamabad',      '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No special health requirements for travel to Islamabad. Vaccination recommended. All public spaces, Faisal Mosque, Margalla Hills trails and shopping centres are fully open. No mask mandate in effect — carry hand sanitizer as a precaution.'),
(8, '05811-920070', '1122', '16', '1422', 'DHQ Hospital Gilgit',          '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No PCR test required for travel to Fairy Meadows. Vaccination recommended before trekking. Medical facilities are virtually non-existent in the area — carry a comprehensive first aid kit and personal medicines. Nearest hospital is in Gilgit city, several hours away.'),
(9, '0746-450001',  '1122', '16', '1422', 'Civil Hospital Larkana',       '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No special entry requirements for Mohenjo Daro. Vaccination recommended, especially in Sindh''s hot climate. The site is fully open to visitors. Carry personal hygiene supplies and drinking water as facilities at the archaeological site are limited.'),
(10,'0621-9255225', '1122', '16', '1422', 'Victoria Hospital Bahawalpur', '051-2279770', 'COVID-19 restrictions have been lifted in Pakistan. No special health requirements for Cholistan Desert travel. Vaccination recommended. All desert camps and Derawar Fort are accessible. Extreme heat in summer (May-August) poses a greater health risk than COVID — carry ample water, sunscreen and oral rehydration salts.');

-- ── Patch covid_rules for destinations 1-5 in case DB has old rows without this data ─
UPDATE EmergencyInfo SET covid_rules = 'COVID-19 restrictions have been lifted in Pakistan. No PCR test required for domestic travel. Carry your vaccination card if available. Masks are optional but recommended in crowded bazaars. Health screening may apply at Gilgit airport.'
WHERE destination_id = 1 AND (covid_rules IS NULL OR covid_rules = '');
UPDATE EmergencyInfo SET covid_rules = 'COVID-19 restrictions have been lifted in Pakistan. No PCR test or quarantine required for domestic travel. During peak tourist season, Murree can become overcrowded — keep hand sanitizer handy. Restaurants and hotels are fully operational.'
WHERE destination_id = 2 AND (covid_rules IS NULL OR covid_rules = '');
UPDATE EmergencyInfo SET covid_rules = 'COVID-19 restrictions have been lifted in Pakistan. No special entry requirements for Swat Valley. Vaccination recommended before travel. Hotels, guesthouses and public transport are operating normally. Carry personal hygiene supplies for remote treks.'
WHERE destination_id = 3 AND (covid_rules IS NULL OR covid_rules = '');
UPDATE EmergencyInfo SET covid_rules = 'COVID-19 restrictions have been lifted in Pakistan. No PCR test required for domestic flights to Skardu. Vaccination card is recommended. Remote high-altitude areas have extremely limited medical facilities — ensure you are fully vaccinated. Carry personal medicines for extended stays.'
WHERE destination_id = 4 AND (covid_rules IS NULL OR covid_rules = '');
UPDATE EmergencyInfo SET covid_rules = 'COVID-19 restrictions have been lifted in Pakistan. No special protocols required for Naran-Kaghan. Vaccination recommended. Medical facilities are very limited in the valley — carry personal medicines. During July-August peak season, practice standard hygiene in crowded tourist spots.'
WHERE destination_id = 5 AND (covid_rules IS NULL OR covid_rules = '');

-- ── Souvenirs ─────────────────────────────────────────────────────────────────
INSERT INTO Souvenirs (destination_id, name, description, price, vendor_name)
VALUES
(1, 'Hunza Cap',    'Traditional woolen cap',       500,  'Karimabad Handicrafts'),
(1, 'Apricot Jam',  'Local organic apricot jam',    300,  'Hunza Organic'),
(2, 'Shawls',       'Handmade woolen shawls',       2000, 'Murree Crafts'),
(3, 'Emerald Stone','Natural emerald from Swat',    5000, 'Swat Gems');

-- ── Seasonal Data — full 12 months for all 5 destinations ────────────────────
-- Source: SeasonalData_AllDests.sql

-- Hunza Valley (id=1)
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost) VALUES
(1,  1,  -5.0,  15.0, 0,  8000),
(1,  2,  -2.0,  20.0, 0,  9000),
(1,  3,   5.0,  35.0, 0, 12000),
(1,  4,  15.5,  30.2, 1, 18000),
(1,  5,  20.3,  25.5, 1, 20000),
(1,  6,  25.1,  15.3, 1, 22000),
(1,  7,  28.5,  10.2, 1, 25000),
(1,  8,  27.8,  12.5, 1, 24000),
(1,  9,  22.4,  18.7, 1, 20000),
(1, 10,  16.2,  25.3, 0, 15000),
(1, 11,   5.0,  20.0, 0, 10000),
(1, 12,  -3.0,  12.0, 0,  8000);

-- Murree (id=2)
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost) VALUES
(2,  1,   2.0,  80.0, 1, 12000),
(2,  2,   3.0,  75.0, 1, 11000),
(2,  3,   8.0,  90.0, 0,  8000),
(2,  4,  13.0,  85.0, 0,  9000),
(2,  5,  17.0,  60.0, 0, 10000),
(2,  6,  21.0,  55.0, 0, 11000),
(2,  7,  22.0, 100.0, 1, 18000),
(2,  8,  21.0,  95.0, 1, 17000),
(2,  9,  18.0,  65.0, 1, 15000),
(2, 10,  13.0,  45.0, 0, 12000),
(2, 11,   8.0,  50.0, 0,  9000),
(2, 12,   4.0,  70.0, 1, 13000);

-- Swat Valley (id=3)
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost) VALUES
(3,  1,   5.0,  45.0, 0,  8000),
(3,  2,   8.0,  50.0, 0,  8500),
(3,  3,  14.0,  55.0, 0, 10000),
(3,  4,  19.0,  40.0, 1, 14000),
(3,  5,  24.0,  25.0, 1, 16000),
(3,  6,  29.0,  15.0, 1, 18000),
(3,  7,  31.0,  30.0, 0, 15000),
(3,  8,  30.0,  35.0, 0, 14000),
(3,  9,  26.0,  20.0, 1, 16000),
(3, 10,  20.0,  15.0, 1, 14000),
(3, 11,  13.0,  30.0, 0, 10000),
(3, 12,   7.0,  40.0, 0,  8000);

-- Skardu (id=4)
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost) VALUES
(4,  1,  -8.0,   8.0, 0,  7000),
(4,  2,  -5.0,  10.0, 0,  7500),
(4,  3,   2.0,  15.0, 0,  9000),
(4,  4,  10.0,  20.0, 0, 12000),
(4,  5,  16.0,  15.0, 1, 18000),
(4,  6,  21.0,  10.0, 1, 22000),
(4,  7,  25.0,   8.0, 1, 25000),
(4,  8,  24.0,  10.0, 1, 24000),
(4,  9,  18.0,  12.0, 1, 20000),
(4, 10,  10.0,  15.0, 0, 15000),
(4, 11,   1.0,  12.0, 0,  9000),
(4, 12,  -5.0,  10.0, 0,  7000);

-- Naran Kaghan (id=5)
INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost) VALUES
(5,  1, -10.0,  20.0, 0,  6000),
(5,  2,  -8.0,  25.0, 0,  6500),
(5,  3,  -2.0,  30.0, 0,  8000),
(5,  4,   5.0,  35.0, 0, 10000),
(5,  5,  12.0,  30.0, 1, 15000),
(5,  6,  18.0,  20.0, 1, 20000),
(5,  7,  22.0,  15.0, 1, 24000),
(5,  8,  21.0,  18.0, 1, 23000),
(5,  9,  15.0,  22.0, 1, 18000),
(5, 10,   8.0,  28.0, 0, 12000),
(5, 11,   0.0,  25.0, 0,  7000),
(5, 12,  -8.0,  20.0, 0,  5500);

-- ── System Settings ───────────────────────────────────────────────────────────
INSERT INTO SystemSettings (setting_key, setting_value, description)
VALUES
('BASE_TRAVEL_COST_PER_DAY',        '5000',            'Base cost per person per day for trip calculation'),
('WEATHER_API_KEY',                 'your_api_key_here','OpenWeatherMap API Key'),
('GOOGLE_MAPS_API_KEY',             'your_api_key_here','Google Maps API Key'),
('FEATURE_USER_REGISTRATION',       'true',            'Allow new tourists to sign up'),
('FEATURE_HM_REGISTRATION',         'true',            'Allow new hotel managers to register'),
('FEATURE_WEATHER_SCHEDULER',       'true',            'Hourly background job that generates weather alerts'),
('FEATURE_BOOKING',                 'true',            'Allow tourists to make hotel bookings'),
('FEATURE_REVIEWS',                 'true',            'Allow tourists to post destination and hotel reviews'),
('FEATURE_MAINTENANCE_MODE',        'false',           'Show maintenance page to all non-admin users');

SELECT 'TripifyDB setup complete!' AS Status;

-- ============================================
-- MIGRATION: Hotels data fix (2026-03-18)
-- ============================================
-- Replaced 5 placeholder hotel rows (no images, wrong names) with
-- 11 correct hotels matching the frontend HOTELS array.
-- Each hotel now has: image_url, description, average_rating, total_reviews.
-- Run this block ONLY on an existing DB (no DROP needed).
-- ─────────────────────────────────────────────────────────────
-- DELETE FROM Hotels WHERE hotel_id IN (1,2,3,4,5);
-- ALTER TABLE Hotels AUTO_INCREMENT = 1;
-- INSERT INTO Hotels (destination_id, hotel_name, address, contact_number, star_rating, price_per_night, total_rooms, available_rooms, amenities, image_url, description, average_rating, total_reviews)
-- VALUES
-- (1, 'Eagle Nest Hotel',   'Duikar Heights, Hunza',       '03451234567', 4, 8500,  25, 12, 'WiFi,Parking,Restaurant,Mountain View',              'Eagle nest hotel.jpeg',     'Perched on a hilltop with panoramic views of Rakaposhi peak.',                        4.60,  89),
-- (1, 'Serena Hunza',       'Karimabad, Hunza',             '03451234568', 5, 18000, 80, 30, 'WiFi,Spa,Pool,Restaurant,Gym,Mountain View',          'serena hunza.jpeg',         'Pakistan''s most iconic 5-star luxury hotel in the heart of Hunza.',                 4.90, 134),
-- (1, 'Hunza Inn',          'Old Hunza Road, Karimabad',    '03451234569', 3, 4000,  20, 15, 'WiFi,Breakfast,Garden',                               'Hunza Inn.jpeg',            'Cozy budget-friendly guesthouse with warm Hunzai hospitality.',                       4.20,  62),
-- (2, 'Shangrila Resort',   'Mall Road, Murree',            '03451234570', 4, 7000,  40, 18, 'WiFi,Restaurant,Parking,Fireplace',                   'shengrilla resort.jpeg',    'Nestled in pine trees, just a short walk from Mall Road.',                            4.40,  78),
-- (2, 'Mall Hotel',         'The Mall, Murree',             '03451234571', 3, 3500,  30, 20, 'WiFi,Breakfast,Cable TV',                             'mall hotel.jpeg',           'Budget-friendly stay in the heart of Murree town.',                                   4.10,  55),
-- (3, 'Serena Swat',        'Saidu Sharif, Swat',           '03451234572', 5, 15000, 70, 25, 'WiFi,Pool,Spa,Restaurant,Garden,Room Service',        'sarena swat.jpg',           'Award-winning 5-star resort on the banks of the Swat River.',                        4.70, 101),
-- (3, 'Kalam Valley Hotel', 'Kalam, Upper Swat',            '03451234573', 3, 3000,  25, 18, 'WiFi,Parking,River View',                             'kalam valley hotel.jpeg',   'Simple mountain hotel with stunning river views in Kalam.',                           4.20,  44),
-- (4, 'Serena Skardu',      'Katpana, Skardu',              '03451234574', 5, 20000, 60, 20, 'WiFi,Spa,Restaurant,Mountain View,Library',           'sarena skardu.jpeg',        'Luxury property surrounded by 8000m peaks in Skardu valley.',                        4.80,  97),
-- (4, 'K2 Motel',           'Main Bazaar, Skardu',          '03451234575', 3, 4500,  25, 15, 'WiFi,Parking,Meals',                                  'k2 motel.jpeg',             'No-frills clean stay, perfect base for K2 trekkers.',                                 4.00,  38),
-- (5, 'Pine Park Hotel',    'Naran Valley Road, Naran',     '03451234576', 4, 6500,  35, 22, 'WiFi,Restaurant,Garden,River View',                   'pine park hotel.jpeg',      'Charming hotel overlooking the Kunhar River in Naran valley.',                        4.30,  67),
-- (5, 'Kaghan Resort',      'Kaghan Village, Kaghan',       '03451234577', 3, 3200,  20, 14, 'WiFi,Breakfast,Campfire',                             'kaghan resort.jpg',         'Rustic mountain resort perfect for adventure travellers.',                             4.00,  41);
-- STATUS: Already applied on 2026-03-18 via CLI — no action needed on fresh run.

-- Assign hotels to HotelManagers by email (update emails to match registered accounts)
-- UPDATE Hotels SET manager_id = (SELECT user_id FROM Users WHERE email = 'shahzaib@example.com') WHERE destination_id IN (1,2,3,4,5,6);
-- UPDATE Hotels SET manager_id = (SELECT user_id FROM Users WHERE email = 'manager2@example.com') WHERE destination_id IN (7,8,9,10);


SELECT *FROM RoomTypes;
SELECT *FROM Users;
SELECT *FROM Hotels;
SELECT *FROM Bookings;
SELECT *FROM Destinations;
SELECT *FROM HotelReviews;
SELECT *FROM EmergencyInfo;
SELECT *FROM Souvenirs;
SELECT *FROM SeasonalData;
SELECT *FROM SystemSettings;
SELECT *FROM TravelGuidelines;
SELECT *FROM UserPreferences;
SELECT *FROM ActivityLogs;
SELECT *FROM Notifications;
SELECT *FROM Trips;
SELECT *FROM TripDestinations;
SELECT *FROM Reviews;
SELECT *FROM FlaggedContent;
SELECT *FROM Favorites;


-- ============================================
-- MIGRATION: Fix NULL ratings (2026-03-18)
-- ============================================
-- Run this on any existing DB where destinations were added
-- without explicit average_rating / total_reviews values.
SET SQL_SAFE_UPDATES = 0;
UPDATE Destinations SET average_rating = 0.00 WHERE average_rating IS NULL;
UPDATE Destinations SET total_reviews  = 0    WHERE total_reviews  IS NULL;

-- ============================================
-- SEED DATA: ActivityLogs (UC-20 User Logs)
-- ============================================
-- user_id = 1 is the Admin (admin@tripify.com).
-- NULL user_id = action performed before/without a login context.
INSERT INTO ActivityLogs (user_id, action, ip_address, created_at) VALUES
(NULL, 'USER_REGISTER',       '103.255.4.22',  '2026-01-10 10:15:00'),
(NULL, 'USER_LOGIN',          '103.255.4.22',  '2026-01-10 10:20:00'),
(NULL, 'BOOKING_CREATED',     '103.255.4.22',  '2026-01-10 11:05:00'),
(1,    'ADMIN_LOGIN',         '192.168.1.10',  '2026-01-15 09:00:00'),
(NULL, 'USER_REGISTER',       '103.62.11.99',  '2026-02-03 14:30:00'),
(NULL, 'USER_LOGIN',          '103.62.11.99',  '2026-02-03 14:35:00'),
(NULL, 'REVIEW_SUBMITTED',    '103.62.11.99',  '2026-02-04 16:20:00'),
(NULL, 'PROFILE_UPDATED',     '103.255.4.22',  '2026-02-08 09:50:00'),
(1,    'ADMIN_LOGIN',         '192.168.1.10',  '2026-02-12 08:45:00'),
(NULL, 'USER_REGISTER',       '117.55.22.10',  '2026-02-20 13:00:00'),
(NULL, 'USER_LOGIN',          '117.55.22.10',  '2026-02-20 13:05:00'),
(NULL, 'BOOKING_CREATED',     '117.55.22.10',  '2026-02-21 10:30:00'),
(NULL, 'BOOKING_CANCELLED',   '103.62.11.99',  '2026-03-02 09:15:00'),
(1,    'ADMIN_LOGIN',         '192.168.1.10',  '2026-03-05 09:00:00'),
(NULL, 'USER_REGISTER',       '202.143.9.55',  '2026-03-07 11:20:00'),
(NULL, 'USER_LOGIN',          '202.143.9.55',  '2026-03-07 11:25:00'),
(NULL, 'TRIP_CREATED',        '117.55.22.10',  '2026-03-10 15:45:00'),
(NULL, 'REVIEW_SUBMITTED',    '202.143.9.55',  '2026-03-14 17:00:00'),
(1,    'ADMIN_LOGIN',         '192.168.1.10',  '2026-03-18 08:30:00'),
(NULL, 'USER_LOGIN',          '103.255.4.22',  '2026-03-19 10:00:00');


-- ── Fix NULL ratings/reviews on Hotels (safety update for existing data) ──────
UPDATE Hotels SET star_rating   = 0    WHERE star_rating    IS NULL;
UPDATE Hotels SET average_rating = 0.00 WHERE average_rating IS NULL;
UPDATE Hotels SET total_reviews  = 0    WHERE total_reviews   IS NULL;

-- ── MIGRATION: Unique hotel name + phone constraints (2026-03-19) ─────────────
-- Run on existing DB if not already applied (ignore "Duplicate key name" if already done)
ALTER TABLE Hotels ADD UNIQUE KEY unique_hotel_name (hotel_name);
ALTER TABLE Hotels ADD UNIQUE KEY unique_hotel_phone (contact_number);

-- ── MIGRATION: Fix destination image_url to match actual asset filenames (2026-03-19) ─
UPDATE Destinations SET image_url = 'hunza-valley.jpg' WHERE name = 'Hunza Valley';
UPDATE Destinations SET image_url = 'murree.jpeg'      WHERE name = 'Murree';
UPDATE Destinations SET image_url = 'skardu.jpeg'      WHERE name = 'Skardu';
UPDATE Destinations SET image_url = 'naran kaghan.jpg' WHERE name = 'Naran Kaghan';
UPDATE Destinations SET image_url = 'peshawer.jpg'     WHERE name = 'Peshawar';
UPDATE Destinations SET image_url = 'kasmir.jpeg'      WHERE name LIKE '%Kashmir%';
UPDATE Destinations SET image_url = 'karachi.webp'     WHERE name = 'Karachi';
UPDATE Destinations SET image_url = 'gawadar.jpeg'     WHERE name LIKE '%Gwadar%';
