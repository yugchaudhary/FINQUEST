-- 003_functions.sql

-- 1. settle_match_gambits(p_match_id UUID, p_red_votes INT, p_blue_votes INT)
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

    -- Look up the match and verify it is LIVE
    SELECT * INTO v_match_record FROM matches WHERE id = p_match_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    IF v_match_record.status != 'LIVE' THEN
        RAISE EXCEPTION 'Match is not LIVE';
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

        -- Update team balance
        -- We don't need a separate FOR UPDATE lock query here if we just execute UPDATE, 
        -- but a direct UPDATE is thread-safe inside this PL/pgSQL function.
        UPDATE teams 
        SET current_balance = current_balance - v_gambit.amount + v_gross_return
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


-- 2. calculate_finalist_score(p_finalist_team_id UUID, p_judges_average NUMERIC)
CREATE OR REPLACE FUNCTION calculate_finalist_score(p_finalist_team_id UUID, p_judges_average NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_investor_average NUMERIC(4,2);
    v_final_score NUMERIC(5,2);
BEGIN
    -- Validate inputs
    IF p_judges_average < 1.0 OR p_judges_average > 10.0 THEN
        RAISE EXCEPTION 'Judges average must be between 1.0 and 10.0';
    END IF;

    -- Calculate investor average from final_round_scores
    SELECT COALESCE(AVG(score), 0) INTO v_investor_average
    FROM final_round_scores
    WHERE finalist_team_id = p_finalist_team_id;

    -- Calculate final score (50% judges, 50% investors)
    IF v_investor_average = 0 THEN
        -- Fallback if no investors voted
        v_final_score := p_judges_average;
    ELSE
        v_final_score := (v_investor_average * 0.5) + (p_judges_average * 0.5);
    END IF;

    -- Upsert into final_judge_results
    INSERT INTO final_judge_results (finalist_team_id, judges_average, investor_average, final_score)
    VALUES (p_finalist_team_id, p_judges_average, v_investor_average, v_final_score)
    ON CONFLICT (finalist_team_id) DO UPDATE
    SET judges_average = EXCLUDED.judges_average,
        investor_average = EXCLUDED.investor_average,
        final_score = EXCLUDED.final_score,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'finalist_team_id', p_finalist_team_id,
        'judges_average', p_judges_average,
        'investor_average', v_investor_average,
        'final_score', v_final_score
    );
END;
$$;


-- 3. get_phase1_leaderboard()
CREATE OR REPLACE FUNCTION get_phase1_leaderboard()
RETURNS TABLE (
    rank BIGINT,
    team_name TEXT,
    category TEXT,
    net_profit_loss BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        RANK() OVER (ORDER BY (current_balance - starting_balance) DESC) as rank,
        team_name,
        category,
        (current_balance - starting_balance) as net_profit_loss
    FROM teams
    WHERE role = 'INVESTOR' AND is_active = TRUE
    ORDER BY net_profit_loss DESC;
$$;


-- 4. get_finals_leaderboard()
CREATE OR REPLACE FUNCTION get_finals_leaderboard()
RETURNS TABLE (
    rank BIGINT,
    team_name TEXT,
    category TEXT,
    final_score NUMERIC(5,2)
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        RANK() OVER (ORDER BY fjr.final_score DESC) as rank,
        t.team_name,
        t.category,
        fjr.final_score
    FROM final_judge_results fjr
    JOIN teams t ON t.id = fjr.finalist_team_id
    WHERE t.is_finalist = TRUE
    ORDER BY fjr.final_score DESC;
$$;
