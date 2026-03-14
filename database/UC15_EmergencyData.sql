-- ============================================================
-- UC15 — Emergency Info & Safety Guidelines
-- Only for the 5 destinations present in the project:
-- Hunza Valley, Murree, Swat Valley, Skardu, Naran Kaghan
-- ============================================================

USE TripifyDB;

-- ============================================================
-- STEP 1: Create tables if they don't exist
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_info (
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

CREATE TABLE IF NOT EXISTS travel_guidelines (
    guideline_id INT PRIMARY KEY AUTO_INCREMENT,
    destination_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
    FOREIGN KEY (destination_id) REFERENCES Destinations(destination_id) ON DELETE CASCADE
);

-- ============================================================
-- STEP 2: Clear existing data cleanly
-- ============================================================
SET SQL_SAFE_UPDATES = 0;

DELETE FROM emergency_info;
DELETE FROM travel_guidelines;

SET SQL_SAFE_UPDATES = 1;

-- Reset auto increment
ALTER TABLE emergency_info AUTO_INCREMENT = 1;
ALTER TABLE travel_guidelines AUTO_INCREMENT = 1;

-- ============================================================
-- STEP 3: Insert emergency contacts for 5 destinations
-- ============================================================
INSERT INTO emergency_info (destination_id, police_number, ambulance_number, fire_service_number, tourist_helpline, nearest_hospital, embassy_contact)
SELECT d.destination_id,
    CASE d.name
        WHEN 'Hunza Valley' THEN '05811-920070'
        WHEN 'Murree'       THEN '051-3465010'
        WHEN 'Swat Valley'  THEN '0946-9230100'
        WHEN 'Skardu'       THEN '05815-920070'
        WHEN 'Naran Kaghan' THEN '0997-360011'
    END,
    '1122', '16', '1422',
    CASE d.name
        WHEN 'Hunza Valley' THEN 'DHQ Hospital Gilgit'
        WHEN 'Murree'       THEN 'THQ Hospital Murree'
        WHEN 'Swat Valley'  THEN 'Saidu Teaching Hospital'
        WHEN 'Skardu'       THEN 'DHQ Hospital Skardu'
        WHEN 'Naran Kaghan' THEN 'THQ Hospital Mansehra'
    END,
    '051-2279770'
FROM Destinations d
WHERE d.name IN ('Hunza Valley','Murree','Swat Valley','Skardu','Naran Kaghan');

-- ============================================================
-- STEP 4: Insert safety guidelines for 5 destinations
-- ============================================================
INSERT INTO travel_guidelines (destination_id, title, content, category)
SELECT d.destination_id, g.title, g.content, 'Safety'
FROM Destinations d
JOIN (
    -- Hunza Valley
    SELECT 'Hunza Valley' AS dest, 'Altitude Sickness Prevention' AS title,
           'Hunza sits above 2,400m. Ascend slowly — max 500m gain per day. Drink 3-4 litres of water daily. Severe headache, nausea or confusion means descend immediately and seek help at DHQ Gilgit.' AS content
    UNION ALL SELECT 'Hunza Valley','NOC Requirements',
           'Foreign nationals require a No Objection Certificate for areas beyond Karimabad including Khunjerab Pass. Obtain it from the Deputy Commissioner office in Gilgit before travel.'
    UNION ALL SELECT 'Hunza Valley','Road Safety on KKH',
           'The Karakoram Highway has narrow sections with steep drops. Travel only during daylight. Avoid driving after rain as landslides are common. Keep an emergency supply kit in your vehicle.'
    UNION ALL SELECT 'Hunza Valley','Communication in Remote Areas',
           'Mobile signal is weak or absent in many valleys beyond Karimabad. Inform someone of your route and expected return time. Satellite communicators are recommended for remote treks.'
    -- Murree
    UNION ALL SELECT 'Murree','Winter Road Safety',
           'Roads to Murree can become icy or blocked by snow from December to February. Check PDMA road closure updates before travel. Carry snow chains and never drive at night during snowfall.'
    UNION ALL SELECT 'Murree','Crowd Safety',
           'Murree gets extremely crowded during winter holidays. Plan your visit on weekdays. Keep a close eye on children in crowded areas. Avoid parking on roadsides as it blocks emergency vehicle access.'
    UNION ALL SELECT 'Murree','Hypothermia Risk',
           'Temperatures fall below -10C in winter. Wear layered clothing, waterproof boots and gloves. If someone shows confusion or stops shivering, seek medical help immediately at THQ Murree.'
    UNION ALL SELECT 'Murree','Flash Flood Warning',
           'During monsoon July to August, heavy rain causes flash floods and landslides on mountain roads. Monitor PMD weather alerts. Do not camp near river banks during monsoon season.'
    -- Swat Valley
    UNION ALL SELECT 'Swat Valley','River Safety',
           'Do not swim in the Swat River during monsoon season July to August. Currents become dangerously fast. Keep children away from river banks. Only use designated safe areas for river activities.'
    UNION ALL SELECT 'Swat Valley','Security Advisory',
           'Check the latest security advisory from MOFA before travel to remote parts of Swat. Travel in groups and inform the local police station of your route for extended treks in northern areas.'
    UNION ALL SELECT 'Swat Valley','Medical Facilities',
           'Saidu Teaching Hospital 0946-9230300 is the main hospital. Carry a basic first aid kit for remote valleys. Edhi Ambulance 115 covers most of the valley.'
    UNION ALL SELECT 'Swat Valley','Emergency in Kalam',
           'Kalam is a remote area with very limited medical resources. The nearest hospital is THQ Bahrain. Carry all prescription medications, altitude sickness tablets, and a comprehensive first aid kit.'
    -- Skardu
    UNION ALL SELECT 'Skardu','Flight Cancellation Risk',
           'Skardu airport flights are frequently cancelled due to bad weather. Always carry 2-3 extra days of cash, food and medications in case you are stranded. Book refundable tickets when possible.'
    UNION ALL SELECT 'Skardu','Altitude and Acclimatisation',
           'Skardu is at 2,228m. Spend 1-2 days acclimatising before trekking higher. Common symptoms of altitude sickness are headache, nausea and shortness of breath. Descend immediately if symptoms worsen.'
    UNION ALL SELECT 'Skardu','Extreme Weather Conditions',
           'Summer days can be warm at 25C but nights drop to 5-10C. Winters are extreme and the area is inaccessible October to May. Carry sunscreen as UV radiation is intense at high altitude.'
    UNION ALL SELECT 'Skardu','Carry Cash Only',
           'ATMs are limited and frequently out of service in Skardu. Carry sufficient PKR cash for the entire trip. Credit cards are rarely accepted. Nearest reliable banking is in Gilgit city.'
    -- Naran Kaghan
    UNION ALL SELECT 'Naran Kaghan','Seasonal Access Window',
           'Naran is accessible only June to September. Babusar Top pass at 4,173m closes the rest of the year due to heavy snow. Always verify pass conditions with local police before attempting to cross.'
    UNION ALL SELECT 'Naran Kaghan','Cold Night Temperatures',
           'Even in peak summer, night temperatures near Saif-ul-Malook Lake drop to 0C or below. Pack a warm sleeping bag, thermal undergarments, and a weatherproof jacket. Do not underestimate the cold.'
    UNION ALL SELECT 'Naran Kaghan','Flash Flood Risk',
           'The trail to Lake Saif-ul-Malook is steep and dangerous after rain. Only take the jeep trail — do not attempt on foot alone. Always hire a local guide for high-altitude treks.'
    UNION ALL SELECT 'Naran Kaghan','Vehicle Requirements',
           'Beyond Naran town, roads are unpaved, steep and rocky. Only 4x4 vehicles should be used — standard cars will get stranded. Hire a local jeep driver who knows the routes well.'
) g ON d.name = g.dest;

-- ============================================================
-- STEP 5: Verify final counts
-- ============================================================
SELECT 'emergency_info rows' AS info, COUNT(*) AS total FROM emergency_info
UNION ALL
SELECT 'travel_guidelines rows', COUNT(*) FROM travel_guidelines;

SELECT d.name, ei.police_number, ei.nearest_hospital
FROM emergency_info ei
JOIN Destinations d ON d.destination_id = ei.destination_id
ORDER BY ei.emergency_id;
