-- ══════════════════════════════════════════════════════════════════
-- Seasonal Data — All Destinations (12 months each)
-- Run this once in MySQL Workbench after TripifyDB_MySQL.sql
-- Destination IDs: 1=Hunza, 2=Murree, 3=Swat, 4=Skardu, 5=Naran
-- ══════════════════════════════════════════════════════════════════

-- Remove existing partial data first (clean slate)
DELETE FROM SeasonalData WHERE destination_id IN (1, 2, 3, 4, 5);

-- ── Hunza Valley (id=1) — all 12 months ──────────────────────────
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

-- ── Murree (id=2) — all 12 months ────────────────────────────────
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

-- ── Swat Valley (id=3) — all 12 months ───────────────────────────
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

-- ── Skardu (id=4) — all 12 months ────────────────────────────────
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

-- ── Naran Kaghan (id=5) — all 12 months ──────────────────────────
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

SELECT CONCAT('Inserted ', COUNT(*), ' seasonal records') AS Result FROM SeasonalData WHERE destination_id IN (1,2,3,4,5);
