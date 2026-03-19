-- ============================================================
-- MIGRATION: Add altitude, best_time, budget_level columns
-- to Destinations table WITHOUT dropping any data.
--
-- Run this in MySQL Workbench on TripifyDB (NOT the full SQL).
-- ============================================================

USE TripifyDB;

-- Add columns if they don't already exist
ALTER TABLE Destinations
    ADD COLUMN IF NOT EXISTS altitude     VARCHAR(50)  NULL,
    ADD COLUMN IF NOT EXISTS best_time    VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS budget_level VARCHAR(50)  NULL;

-- Populate values for the 10 seed destinations
UPDATE Destinations SET altitude = '2,438 m', best_time = 'Apr–Oct',  budget_level = 'Moderate' WHERE name = 'Hunza Valley';
UPDATE Destinations SET altitude = '2,291 m', best_time = 'Apr–Oct',  budget_level = 'Budget'   WHERE name = 'Murree';
UPDATE Destinations SET altitude = '980 m',   best_time = 'Apr–Sep',  budget_level = 'Budget'   WHERE name = 'Swat Valley';
UPDATE Destinations SET altitude = '2,228 m', best_time = 'Jun–Sep',  budget_level = 'Moderate' WHERE name = 'Skardu';
UPDATE Destinations SET altitude = '2,409 m', best_time = 'Jun–Sep',  budget_level = 'Budget'   WHERE name = 'Naran Kaghan';
UPDATE Destinations SET altitude = '217 m',   best_time = 'Oct–Mar',  budget_level = 'Budget'   WHERE name = 'Lahore';
UPDATE Destinations SET altitude = '507 m',   best_time = 'Oct–Apr',  budget_level = 'Budget'   WHERE name = 'Islamabad';
UPDATE Destinations SET altitude = '3,300 m', best_time = 'Jun–Sep',  budget_level = 'Moderate' WHERE name = 'Fairy Meadows';
UPDATE Destinations SET altitude = '55 m',    best_time = 'Nov–Feb',  budget_level = 'Budget'   WHERE name = 'Mohenjo Daro';
UPDATE Destinations SET altitude = '150 m',   best_time = 'Nov–Feb',  budget_level = 'Budget'   WHERE name = 'Cholistan Desert';
