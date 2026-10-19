-- 016_optimize_concurrency_and_indexes.sql
-- Optimizations for high-concurrency live matches (50+ simultaneous participants)

-- 1. Performance Indexes for fast reads under high traffic
CREATE INDEX IF NOT EXISTS idx_matches_status_round ON matches(status, round_number DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_lower_name ON teams(lower(team_name));

-- 2. Optimized lock_gambit Stored Procedure:
-- REMOVES the exclusive row lock (FOR UPDATE) on the shared "matches" table row.
-- Under 50 simultaneous participant investments, locking "matches" FOR UPDATE forces all 50
-- transactions into a strict serial queue on PostgreSQL, creating high latency and lock contention.
-- Since lock_gambit only READS match status/teams and only WRITES to the participant's OWN team row,
-- a standard SELECT on matches allows all 50 participants to execute concurrently in parallel!

CREATE OR REPLACE FUNCTION lock_gambit(
    p_match_id UUID, 
    p_investor_team_id UUID, 
    p_selected_team_id UUID, 
    p_amount BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_status TEXT;
    v_red UUID;
    v_blue UUID;
    v_current_balance BIGINT;
    v_gambit_id UUID;
BEGIN
    -- Verify match is accepting bets (NO "FOR UPDATE" on shared match row to allow parallel reads)
    SELECT status, red_team_id, blue_team_id INTO v_match_status, v_red, v_blue
    FROM matches WHERE id = p_match_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_match_status NOT IN ('GAMBITS_OPEN', 'MATCH_LIVE', 'LIVE') THEN
        RAISE EXCEPTION 'Match is not accepting Gambits';
    END IF;

    -- The chosen team must be one of the two teams in this match
    IF p_selected_team_id IS NULL OR p_selected_team_id NOT IN (v_red, v_blue) THEN
        RAISE EXCEPTION 'Selected team is not in this match';
    END IF;

    -- Amount validation
    IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 250000 THEN
        RAISE EXCEPTION 'Gambit amount must be between 1 and 250000';
    END IF;

    -- Verify balance, role and that the team is active
    -- Only lock the specific investor's row, preventing cross-participant lock contention
    SELECT current_balance INTO v_current_balance FROM teams
    WHERE id = p_investor_team_id AND role = 'INVESTOR' AND is_active IS TRUE FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investor team not found or not an investor';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF; 

    -- Insert gambit (unique (match_id, investor_team_id) constraint blocks double-clicks)
    INSERT INTO gambits (match_id, investor_team_id, selected_team_id, amount, status)
    VALUES (p_match_id, p_investor_team_id, p_selected_team_id, p_amount, 'LOCKED')
    RETURNING id INTO v_gambit_id;

    -- Deduct balance immediately
    UPDATE teams SET current_balance = current_balance - p_amount WHERE id = p_investor_team_id;

    RETURN jsonb_build_object('status', 'success', 'gambit_id', v_gambit_id);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already placed a Gambit for this match' USING ERRCODE = '23505';
END;
$$;
