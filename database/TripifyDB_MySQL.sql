-- ============================================
-- TRIPIFY DATABASE SCHEMA (MySQL)
-- ============================================

CREATE DATABASE IF NOT EXISTS TripifyDB;
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
    name VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_url VARCHAR(500),
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
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
    star_rating INT CHECK (star_rating BETWEEN 1 AND 5),
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
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- ============================================
-- 4. BOOKINGS TABLE
-- ============================================
CREATE TABLE Bookings (
    booking_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    hotel_id INT NOT NULL,
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
    FOREIGN KEY (hotel_id) REFERENCES Hotels(hotel_id) ON DELETE CASCADE
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
    comment TEXT,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    is_flagged TINYINT(1) DEFAULT 0,
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
-- INDEXES
-- ============================================
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_type ON Users(user_type);
CREATE INDEX idx_destinations_country ON Destinations(country);
CREATE INDEX idx_destinations_name ON Destinations(name);
CREATE INDEX idx_hotels_destination ON Hotels(destination_id);
CREATE INDEX idx_hotels_manager ON Hotels(manager_id);
CREATE INDEX idx_bookings_user ON Bookings(user_id);
CREATE INDEX idx_bookings_hotel ON Bookings(hotel_id);
CREATE INDEX idx_bookings_dates ON Bookings(check_in_date, check_out_date);
CREATE INDEX idx_bookings_payment ON Bookings(payment_status);
CREATE INDEX idx_favorites_user ON Favorites(user_id);
CREATE INDEX idx_reviews_destination ON Reviews(destination_id);
CREATE INDEX idx_reviews_user ON Reviews(user_id);
CREATE INDEX idx_hotelreviews_hotel ON HotelReviews(hotel_id);
CREATE INDEX idx_hotelreviews_user ON HotelReviews(user_id);
CREATE INDEX idx_trips_user ON Trips(user_id);
CREATE INDEX idx_trips_status ON Trips(trip_status);
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

INSERT INTO Destinations (name, country, city, description, latitude, longitude, image_url)
VALUES
('Hunza Valley', 'Pakistan', 'Gilgit-Baltistan', 'Beautiful mountain valley with stunning views', 36.3167, 74.6500, 'hunza.jpg'),
('Murree', 'Pakistan', 'Punjab', 'Popular hill station near Islamabad', 33.9062, 73.3903, 'murree.jpg'),
('Swat Valley', 'Pakistan', 'Khyber Pakhtunkhwa', 'Switzerland of Pakistan', 35.2227, 72.4258, 'swat.jpg'),
('Skardu', 'Pakistan', 'Gilgit-Baltistan', 'Gateway to K2 and mighty peaks', 35.2977, 75.6333, 'skardu.jpg'),
('Naran Kaghan', 'Pakistan', 'Khyber Pakhtunkhwa', 'Scenic valley with lakes and mountains', 34.9042, 73.6519, 'naran.jpg');

-- ----------------------Some More Destinations-------------------------------------
 INSERT INTO Destinations (name, country, city, description, latitude, longitude, image_url, is_active)
  VALUES
  ('Lahore', 'Pakistan', 'Punjab',
   'Cultural capital of Pakistan — Mughal-era Badshahi Mosque, Lahore Fort, vibrant Food Street, and the bustling Anarkali Bazaar.',
   31.5497, 74.3436, 'lahore.jpg', 1),

  ('Islamabad', 'Pakistan', 'Capital Territory',
   'Pakistan''s modern capital — Faisal Mosque, Margalla Hills hiking trails, Daman-e-Koh viewpoint, and Shakarparian gardens.',
   33.6844, 73.0479, 'islamabad.jpg', 1),

  ('Fairy Meadows', 'Pakistan', 'Gilgit-Baltistan',
   'A grassy plateau at the base of Nanga Parbat — the world''s 9th highest peak. Accessible only by jeep and foot, one of
  Pakistan''s most scenic campsites.',
   35.3850, 74.5891, 'fairy-meadows.jpg', 1),

  ('Mohenjo Daro', 'Pakistan', 'Sindh',
   'One of the world''s earliest urban settlements dating back to 2500 BC. UNESCO World Heritage Site with remarkable ancient ruins
  of the Indus Valley Civilization.',
   27.3244, 68.1376, 'mohenjo-daro.jpg', 1),

  ('Cholistan Desert', 'Pakistan', 'Punjab',
   'A vast desert in Bahawalpur with ancient Derawar Fort, camel safaris, and the famous Cholistan Desert Jeep Rally held every
  year.',
   28.2500, 71.5000, 'cholistan.jpg', 1);
   
-- Fix destination descriptions and image_url values
-- Run these in MySQL Workbench if you have already seeded the DB:
UPDATE Destinations SET
    image_url   = 'hunza.jpg',
    description = 'A breathtaking mountain valley nestled between Karakoram peaks, famous for ancient Baltit Fort, pristine Attabad Lake, cherry blossoms in spring, and stunning K2 views.'
WHERE name = 'Hunza Valley';

UPDATE Destinations SET
    image_url   = 'murree.jpg',
    description = 'Pakistan''s most beloved hill station — cool pine forests, colonial Mall Road, chairlift rides, and fresh Kashmiri chai. Only 50 km from Islamabad.'
WHERE name = 'Murree';

UPDATE Destinations SET
    image_url   = 'swat.jpg',
    description = 'The "Switzerland of Pakistan" — lush green mountains, clear rivers, ancient Buddhist stupas at Butkara, and vibrant bazaars in Mingora.'
WHERE name = 'Swat Valley';

UPDATE Destinations SET
    image_url   = 'skardu.jpg',
    description = 'Gateway to K2 and the world''s highest peaks. Cold desert plateau, turquoise Shangrila lake, and the confluence of Indus and Shigar rivers.'
WHERE name = 'Skardu';

UPDATE Destinations SET
    image_url   = 'naran.jpg',
    description = 'Home to the famous Saif-ul-Malook Lake — a high-altitude alpine lake surrounded by snow-capped peaks, glaciers and wildflower meadows.'
WHERE name = 'Naran Kaghan';


  UPDATE Destinations SET image_url = 'islamabad.jpeg'     WHERE name = 'Islamabad';
  UPDATE Destinations SET image_url = 'fairyMeadows.jpeg'  WHERE name = 'Fairy Meadows';
  UPDATE Destinations SET image_url = 'mohenjodaro.jpeg'   WHERE name = 'Mohenjo Daro';
  UPDATE Destinations SET image_url = 'cholistanDesert.jpeg' WHERE name = 'Cholistan Desert';


INSERT INTO Hotels (destination_id, hotel_name, address, contact_number, star_rating, price_per_night, total_rooms, available_rooms, amenities)
VALUES
(1, 'Hunza Serena Inn', 'Karimabad, Hunza', '03451234567', 4, 15000, 50, 45, 'WiFi, Restaurant, Parking'),
(2, 'Pearl Continental Bhurban', 'Bhurban Road, Murree', '03451234568', 5, 25000, 100, 90, 'WiFi, Pool, Spa, Restaurant'),
(3, 'Swat Serena Hotel', 'Saidu Sharif, Swat', '03451234569', 4, 18000, 60, 55, 'WiFi, Restaurant, Garden'),
(4, 'Skardu Inn', 'Main Bazaar, Skardu', '03451234570', 3, 8000, 30, 28, 'WiFi, Restaurant'),
(5, 'Naran Pines Hotel', 'Naran Valley', '03451234571', 3, 10000, 40, 35, 'WiFi, Restaurant, Parking');

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

INSERT INTO EmergencyInfo (destination_id, police_number, ambulance_number, tourist_helpline, nearest_hospital)
VALUES
(1, '15', '1122', '051-111-888-444', 'District Hospital Gilgit'),
(2, '15', '1122', '051-111-888-444', 'CMH Murree'),
(3, '15', '1122', '0946-9230401', 'Saidu Teaching Hospital');

INSERT INTO Souvenirs (destination_id, name, description, price, vendor_name, image_url)
VALUES
-- Hunza
(1, 'Hunza Cap', 'Handcrafted traditional woolen cap worn by the people of Karimabad. A timeless symbol of Hunza culture.', 500, 'Karimabad Handicrafts',
 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80'),
(1, 'Organic Apricot Jam', 'Sun-dried and slow-cooked apricot jam made from the famous Hunza apricots. Rich, natural flavour with no preservatives.', 350, 'Hunza Organic',
 'https://images.unsplash.com/photo-1597528380307-a8e21c47cd5a?w=600&q=80'),
(1, 'Dried Apricots', 'Premium sun-dried apricots sourced directly from Hunza Valley orchards. A healthy and delicious local snack.', 800, 'Hunza Organic',
 'https://images.unsplash.com/photo-1562841773-8f04f5c8c877?w=600&q=80'),
(1, 'Walnut Honey', 'Pure mountain honey blended with crushed Hunza walnuts. A signature gift from the valley.', 1200, 'Karimabad Handicrafts',
 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600&q=80'),
-- Murree
(2, 'Woolen Shawl', 'Handwoven woolen shawl with intricate geometric patterns. Warm, soft, and perfect for cold nights.', 2500, 'Murree Crafts',
 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&q=80'),
(2, 'Pine Wood Craft', 'Beautifully carved wooden figurines and keepsakes made from Murree pine wood by local artisans.', 1500, 'Mall Road Crafts',
 'https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=600&q=80'),
(2, 'Hand-knitted Socks', 'Thick, warm hand-knitted socks made from pure wool. Ideal for mountain winters.', 400, 'Murree Crafts',
 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&q=80'),
-- Swat
(3, 'Swat Emerald', 'Authentic natural emerald gemstone sourced from the mines of Swat Valley. Each piece is unique.', 6000, 'Swat Gems',
 'https://images.unsplash.com/photo-1551122087-f353c3d30e97?w=600&q=80'),
(3, 'Swati Embroidery Cloth', 'Fine hand-embroidered fabric featuring traditional Swati floral and geometric motifs in vibrant colours.', 3500, 'Mingora Textiles',
 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&q=80'),
(3, 'Handmade Pottery', 'Traditional Swat pottery glazed with natural earthy tones. Includes bowls, vases, and decorative plates.', 1800, 'Swat Artisans',
 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&q=80'),
-- Skardu
(4, 'Baltit Stone Carving', 'Hand-carved stone art depicting mountains and Karakoram landscapes, crafted by local Balti artisans.', 4000, 'Skardu Stone Art',
 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80'),
(4, 'Yak Wool Blanket', 'Soft and warm blanket woven from genuine yak wool. Ideal for cold high-altitude nights.', 5500, 'Baltistan Weavers',
 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80'),
-- Naran
(5, 'Kaghan Honey', 'Pure wildflower honey collected from the meadows of Kaghan Valley. Naturally rich and aromatic.', 1500, 'Naran Valley Farms',
 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&q=80'),
(5, 'Mountain Herb Tea', 'A blend of wild herbs and flowers hand-picked from the alpine meadows of Naran. Soothing and caffeine-free.', 600, 'Kaghan Botanicals',
 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80');

INSERT INTO SeasonalData (destination_id, month, avg_temperature, avg_rainfall, peak_season, avg_hotel_cost)
VALUES
(1, 4, 15.5, 30.2, 1, 18000),
(1, 5, 20.3, 25.5, 1, 20000),
(1, 6, 25.1, 15.3, 1, 22000),
(1, 7, 28.5, 10.2, 1, 25000),
(1, 8, 27.8, 12.5, 1, 24000),
(1, 9, 22.4, 18.7, 1, 20000),
(1, 10, 16.2, 25.3, 0, 15000);

INSERT INTO SystemSettings (setting_key, setting_value, description)
VALUES
('BASE_TRAVEL_COST_PER_DAY', '5000', 'Base cost per person per day for trip calculation'),
('WEATHER_API_KEY', 'your_api_key_here', 'OpenWeatherMap API Key'),
('GOOGLE_MAPS_API_KEY', 'your_api_key_here', 'Google Maps API Key');

-- ============================================
-- 18. USER PREFERENCES TABLE
-- ============================================
CREATE TABLE user_preferences (
      preference_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL UNIQUE,
      age_group VARCHAR(20) DEFAULT '18-25',
      travel_preferences JSON,
      updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
      FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
  );

SELECT 'Database setup complete!' AS Status;

UPDATE Users
SET password_hash = '$2a$10$UBSS3mzzbjAmJvwSRZTaKOniKif8HJ/.plSnztlOXtD81TYJmV5I6'
WHERE email = 'admin@tripify.com';

SELECT *FROM USERS;
SELECT *FROM Destinations;
SELECT *FROM user_preferences;
ALTER TABLE Reviews ADD COLUMN review_text TEXT;
ALTER TABLE Trips ADD COLUMN status ENUM('PLANNED','COMPLETED') NOT NULL DEFAULT 'PLANNED';

 DROP TABLE IF EXISTS TripDestinations;
DROP TABLE IF EXISTS Trips;






