-- Seed data for THE FOUNDER'S GAMBIT
-- This file populates the database with demo data for testing

-- Initialize event state
INSERT INTO event_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Insert 20 teams across 4 categories (5 per category)
-- Mix of INNOVATOR and INVESTOR roles

-- Category: Technology
INSERT INTO teams (id, category, team_name, role, starting_balance, current_balance) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'Technology', 'NeuralForge', 'INNOVATOR', 0, 0),
  ('a1000001-0000-0000-0000-000000000002', 'Technology', 'QuantumLeap', 'INNOVATOR', 0, 0),
  ('a1000001-0000-0000-0000-000000000003', 'Technology', 'CyberVault', 'INVESTOR', 1000000, 1000000),
  ('a1000001-0000-0000-0000-000000000004', 'Technology', 'DataPulse', 'INVESTOR', 1000000, 1000000),
  ('a1000001-0000-0000-0000-000000000005', 'Technology', 'CloudNine', 'INVESTOR', 1000000, 1000000);

-- Category: Healthcare
INSERT INTO teams (id, category, team_name, role, starting_balance, current_balance) VALUES
  ('a2000001-0000-0000-0000-000000000001', 'Healthcare', 'MediSync', 'INNOVATOR', 0, 0),
  ('a2000001-0000-0000-0000-000000000002', 'Healthcare', 'GeneCraft', 'INNOVATOR', 0, 0),
  ('a2000001-0000-0000-0000-000000000003', 'Healthcare', 'VitaCore', 'INVESTOR', 1000000, 1000000),
  ('a2000001-0000-0000-0000-000000000004', 'Healthcare', 'PharmaEdge', 'INVESTOR', 1000000, 1000000),
  ('a2000001-0000-0000-0000-000000000005', 'Healthcare', 'BioNex', 'INVESTOR', 1000000, 1000000);

-- Category: Finance
INSERT INTO teams (id, category, team_name, role, starting_balance, current_balance) VALUES
  ('a3000001-0000-0000-0000-000000000001', 'Finance', 'FinStack', 'INNOVATOR', 0, 0),
  ('a3000001-0000-0000-0000-000000000002', 'Finance', 'LedgerPrime', 'INNOVATOR', 0, 0),
  ('a3000001-0000-0000-0000-000000000003', 'Finance', 'WealthGrid', 'INVESTOR', 1000000, 1000000),
  ('a3000001-0000-0000-0000-000000000004', 'Finance', 'TradeCraft', 'INVESTOR', 1000000, 1000000),
  ('a3000001-0000-0000-0000-000000000005', 'Finance', 'CoinForge', 'INVESTOR', 1000000, 1000000);

-- Category: Social Impact
INSERT INTO teams (id, category, team_name, role, starting_balance, current_balance) VALUES
  ('a4000001-0000-0000-0000-000000000001', 'Social Impact', 'ImpactHub', 'INNOVATOR', 0, 0),
  ('a4000001-0000-0000-0000-000000000002', 'Social Impact', 'GreenShift', 'INNOVATOR', 0, 0),
  ('a4000001-0000-0000-0000-000000000003', 'Social Impact', 'EcoVenture', 'INVESTOR', 1000000, 1000000),
  ('a4000001-0000-0000-0000-000000000004', 'Social Impact', 'SolarMind', 'INVESTOR', 1000000, 1000000),
  ('a4000001-0000-0000-0000-000000000005', 'Social Impact', 'AquaPure', 'INVESTOR', 1000000, 1000000);

-- Note: Auth users and users table entries should be created via the API
-- using the admin setup flow or the seed script.
-- Demo credentials pattern:
--   Admin: admin@foundersgambit.com / admin123456
--   Team:  {team-slug}@foundersgambit.com / gambit-{team-slug}-2024
--   Example: neuralforge@foundersgambit.com / gambit-neuralforge-2024
