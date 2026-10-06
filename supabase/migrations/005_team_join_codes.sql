-- 005_team_join_codes.sql

-- Add a unique join code to the teams table
ALTER TABLE teams ADD COLUMN join_code TEXT UNIQUE;
