-- Add new columns
ALTER TABLE matches ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS broadcasted_by UUID;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_by UUID;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS multiplier NUMERIC(4,2);

-- Update check constraints on status (drop old, add new if it exists)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
