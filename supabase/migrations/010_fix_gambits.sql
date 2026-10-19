-- Function to lock a gambit atomically
CREATE OR REPLACE FUNCTION lock_gambit(p_match_id UUID, p_investor_team_id UUID, p_selected_team_id UUID, p_amount BIGINT)
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

-- Fix settle_match_gambits so it doesn't double-deduct
CREATE OR REPLACE FUNCTION settle_match_gambits(p_match_id UUID, p_red_votes INT, p_blue_votes INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_record RECORD;
    v_multiplier_red NUMERIC(4,2);
    v_multiplier_blue NUMERIC(4,2);
    v_gambit RECORD;
    v_gross_return BIGINT;
    v_gambits_processed INT := 0;
    v_total_payout BIGINT := 0;
BEGIN
    -- Verify vote counts
    IF p_red_votes + p_blue_votes != 5 THEN
        RAISE EXCEPTION 'Total votes must equal 5';
    END IF;

    -- Look up the match and verify it is ready for settlement
    SELECT * INTO v_match_record FROM matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_match_record.status IN ('MATCH_COMPLETE', 'COMPLETED', 'PROCESSING_RESULT') THEN
        RAISE EXCEPTION 'Match has already been settled';
    END IF;

    IF v_match_record.status NOT IN ('GAMBITS_CLOSED', 'AWAITING_JUDGE_RESULT', 'LIVE') THEN
        RAISE EXCEPTION 'Gambits must be closed before entering a result';
    END IF;

    -- Guard against double-settle
    IF EXISTS (SELECT 1 FROM judge_results WHERE match_id = p_match_id) THEN
        RAISE EXCEPTION 'Match has already been settled';
    END IF;

    -- Determine multipliers based on vote distribution
    IF p_red_votes = 5 AND p_blue_votes = 0 THEN
        v_multiplier_red := 3.0;
        v_multiplier_blue := 0.0;
    ELSIF p_red_votes = 4 AND p_blue_votes = 1 THEN
        v_multiplier_red := 2.2;
        v_multiplier_blue := 0.5;
    ELSIF p_red_votes = 3 AND p_blue_votes = 2 THEN
        v_multiplier_red := 1.6;
        v_multiplier_blue := 0.8;
    ELSIF p_blue_votes = 5 AND p_red_votes = 0 THEN
        v_multiplier_blue := 3.0;
        v_multiplier_red := 0.0;
    ELSIF p_blue_votes = 4 AND p_red_votes = 1 THEN
        v_multiplier_blue := 2.2;
        v_multiplier_red := 0.5;
    ELSIF p_blue_votes = 3 AND p_red_votes = 2 THEN
        v_multiplier_blue := 1.6;
        v_multiplier_red := 0.8;
    ELSE
        RAISE EXCEPTION 'Invalid vote distribution';
    END IF;

    -- Create judge_results record
    INSERT INTO judge_results (match_id, red_votes, blue_votes, multiplier_red, multiplier_blue)
    VALUES (p_match_id, p_red_votes, p_blue_votes, v_multiplier_red, v_multiplier_blue);

    -- Process each LOCKED gambit for this match
    FOR v_gambit IN 
        SELECT * FROM gambits WHERE match_id = p_match_id AND status = 'LOCKED' FOR UPDATE
    LOOP
        -- Calculate gross return based on which team the investor selected
        IF v_gambit.selected_team_id = v_match_record.red_team_id THEN
            v_gross_return := (v_gambit.amount * v_multiplier_red)::BIGINT;
        ELSIF v_gambit.selected_team_id = v_match_record.blue_team_id THEN
            v_gross_return := (v_gambit.amount * v_multiplier_blue)::BIGINT;
        ELSE
            RAISE EXCEPTION 'Gambit selected team not in match';
        END IF;

        -- Update team balance: just ADD the gross return (since amount was already deducted at lock time)
        UPDATE teams 
        SET current_balance = current_balance + v_gross_return
        WHERE id = v_gambit.investor_team_id;

        -- Mark gambit as SETTLED
        UPDATE gambits 
        SET status = 'SETTLED', settled_at = NOW()
        WHERE id = v_gambit.id;

        v_gambits_processed := v_gambits_processed + 1;
        v_total_payout := v_total_payout + v_gross_return;
    END LOOP;

    -- Mark match as COMPLETED
    UPDATE matches
    SET status = 'COMPLETED', result_submitted_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'gambits_processed', v_gambits_processed,
        'total_payout', v_total_payout
    );
END;
$$;
