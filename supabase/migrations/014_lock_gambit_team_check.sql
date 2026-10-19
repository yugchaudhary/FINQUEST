-- 014_lock_gambit_team_check.sql
-- Run AFTER the updated 010_fix_gambits.sql.
-- Adds the missing check that the chosen team is actually Red or Blue in this match.
-- Without it, one bet on any other team makes settle_match_gambits() fail for the whole round
-- ("Gambit selected team not in match"), leaving every stake stuck.
-- Also refuses inactive investor teams and keeps a clear message for double-clicks.
CREATE OR REPLACE FUNCTION lock_gambit(p_match_id UUID, p_investor_team_id UUID,
p_selected_team_id UUID, p_amount BIGINT)
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
    -- Verify match is accepting bets
    SELECT status, red_team_id, blue_team_id INTO v_match_status, v_red, v_blue
    FROM matches WHERE id = p_match_id FOR UPDATE;
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
    SELECT current_balance INTO v_current_balance FROM teams
    WHERE id = p_investor_team_id AND role = 'INVESTOR' AND is_active IS TRUE FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Investor team not found or not an investor';
    END IF;
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF; 
    -- Insert gambit (unique (match_id, investor_team_id) blocks double-clicks)
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
