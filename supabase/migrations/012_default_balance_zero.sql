-- 012_default_balance_zero.sql
-- Sets default starting_balance and current_balance to 0 for teams
-- Only investors can have balance assigned by admin later; innovators and pending teams always have 0 balance.

ALTER TABLE teams ALTER COLUMN starting_balance SET DEFAULT 0;
ALTER TABLE teams ALTER COLUMN current_balance SET DEFAULT 0;

-- Reset existing teams where balance is still the old default 1000000 or for non-investors
UPDATE teams
SET starting_balance = 0, current_balance = 0
WHERE role != 'INVESTOR' OR starting_balance = 1000000;
