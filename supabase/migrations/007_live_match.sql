-- 007_live_match.sql
-- Production Live Match: match state machine, ledger, atomic lock/settle RPCs

-- Match columns
ALTER TABLE matches ADD COLUMN IF NOT EXISTS broadcasted_by UUID REFERENCES users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS multiplier NUMERIC(4,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_matches_modtime ON matches;
CREATE TRIGGER update_matches_modtime
BEFORE UPDATE ON matches
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Expand match statuses (keep legacy LIVE/PENDING/COMPLETED readable during rollout)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
UPDATE matches SET status = 'GAMBITS_OPEN' WHERE status = 'LIVE';
UPDATE matches SET status = 'MATCH_COMPLETE' WHERE status = 'COMPLETED';
UPDATE matches SET status = 'WAITING_FOR_MATCH' WHERE status = 'PENDING';
ALTER TABLE matches ADD CONSTRAINT matches_status_check CHECK (status IN (
  'WAITING_FOR_MATCH',
  'MATCH_LIVE',
  'GAMBITS_OPEN',
  'GAMBITS_CLOSED',
  'AWAITING_JUDGE_RESULT',
  'PROCESSING_RESULT',
  'MATCH_COMPLETE',
  'PENDING',
  'LIVE',
  'COMPLETED'
));

CREATE UNIQUE INDEX IF NOT EXISTS matches_round_number_unique ON matches (round_number);

-- Allow a zero Gambit
ALTER TABLE gambits DROP CONSTRAINT IF EXISTS gambits_amount_check;
ALTER TABLE gambits ADD CONSTRAINT gambits_amount_check CHECK (amount >= 0 AND amount <= 250000);

-- Immutable ledger
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'GAMBIT_RESERVE',
    'GAMBIT_RETURN',
    'GAMBIT_LOSS',
    'MANUAL_ADJUSTMENT'
  )),
  amount BIGINT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_team_id ON ledger_transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_ledger_reference ON ledger_transactions(reference_type, reference_id);

ALTER TABLE ledger_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to ledger" ON ledger_transactions;
CREATE POLICY "Admins have full access to ledger"
ON ledger_transactions FOR ALL TO authenticated USING (public.is_admin());

-- Atomic gambit lock with row locks, unique constraint, and ledger
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
  v_match RECORD;
  v_team RECORD;
  v_gambit_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 OR p_amount > 250000 THEN
    RAISE EXCEPTION 'Invalid Gambit amount';
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;

  IF v_match.status NOT IN ('GAMBITS_OPEN', 'MATCH_LIVE', 'LIVE') THEN
    RAISE EXCEPTION 'Match is not accepting Gambits';
  END IF;

  IF p_selected_team_id IS DISTINCT FROM v_match.red_team_id
     AND p_selected_team_id IS DISTINCT FROM v_match.blue_team_id THEN
    RAISE EXCEPTION 'Selected team is not in this match';
  END IF;

  SELECT * INTO v_team FROM teams WHERE id = p_investor_team_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investor team not found';
  END IF;

  IF v_team.role IS DISTINCT FROM 'INVESTOR' OR v_team.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Only eligible Investor teams can place Gambits';
  END IF;

  IF EXISTS (
    SELECT 1 FROM gambits WHERE match_id = p_match_id AND investor_team_id = p_investor_team_id
  ) THEN
    RAISE EXCEPTION 'You have already placed a Gambit for this match';
  END IF;

  IF p_amount > COALESCE(v_team.current_balance, 0) THEN
    RAISE EXCEPTION 'Insufficient balance for this Gambit';
  END IF;

  INSERT INTO gambits (
    match_id, investor_team_id, selected_team_id, amount, status, locked_at
  ) VALUES (
    p_match_id, p_investor_team_id, p_selected_team_id, p_amount, 'LOCKED', NOW()
  )
  RETURNING id INTO v_gambit_id;

  INSERT INTO ledger_transactions (
    team_id, transaction_type, amount, reference_type, reference_id
  ) VALUES (
    p_investor_team_id, 'GAMBIT_RESERVE', p_amount, 'gambit', v_gambit_id
  );

  UPDATE teams
  SET current_balance = current_balance - p_amount
  WHERE id = p_investor_team_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'gambit_id', v_gambit_id,
    'amount', p_amount
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already placed a Gambit for this match';
END;
$$;

-- Settlement: amount already reserved; credit gross return only. Never settle twice.
CREATE OR REPLACE FUNCTION settle_match_gambits(p_match_id UUID, p_red_votes INT, p_blue_votes INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_match_record RECORD;
    v_multiplier_red NUMERIC(4,2);
    v_multiplier_blue NUMERIC(4,2);
    v_listed_multiplier NUMERIC(4,2);
    v_gambit RECORD;
    v_gross_return BIGINT;
    v_gambits_processed INT := 0;
    v_total_payout BIGINT := 0;
BEGIN
    IF p_red_votes + p_blue_votes != 5 THEN
        RAISE EXCEPTION 'Total votes must equal 5';
    END IF;

    SELECT * INTO v_match_record FROM matches WHERE id = p_match_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;

    IF v_match_record.status IN ('MATCH_COMPLETE', 'COMPLETED', 'PROCESSING_RESULT') THEN
        RAISE EXCEPTION 'Match has already been settled';
    END IF;

    IF v_match_record.status NOT IN ('GAMBITS_CLOSED', 'AWAITING_JUDGE_RESULT') THEN
        RAISE EXCEPTION 'Gambits must be closed before entering a result';
    END IF;

    IF EXISTS (SELECT 1 FROM judge_results WHERE match_id = p_match_id) THEN
        RAISE EXCEPTION 'Match has already been settled';
    END IF;

    -- Listed multiplier is from the Red-Blue score line (5-0 → 3x, 0-5 → 0x)
    IF p_red_votes = 5 AND p_blue_votes = 0 THEN
        v_listed_multiplier := 3.0; v_multiplier_red := 3.0; v_multiplier_blue := 0.0;
    ELSIF p_red_votes = 4 AND p_blue_votes = 1 THEN
        v_listed_multiplier := 2.2; v_multiplier_red := 2.2; v_multiplier_blue := 0.5;
    ELSIF p_red_votes = 3 AND p_blue_votes = 2 THEN
        v_listed_multiplier := 1.6; v_multiplier_red := 1.6; v_multiplier_blue := 0.8;
    ELSIF p_red_votes = 2 AND p_blue_votes = 3 THEN
        v_listed_multiplier := 0.8; v_multiplier_red := 0.8; v_multiplier_blue := 1.6;
    ELSIF p_red_votes = 1 AND p_blue_votes = 4 THEN
        v_listed_multiplier := 0.5; v_multiplier_red := 0.5; v_multiplier_blue := 2.2;
    ELSIF p_red_votes = 0 AND p_blue_votes = 5 THEN
        v_listed_multiplier := 0.0; v_multiplier_red := 0.0; v_multiplier_blue := 3.0;
    ELSE
        RAISE EXCEPTION 'Invalid vote distribution';
    END IF;

    UPDATE matches
    SET status = 'PROCESSING_RESULT',
        result = p_red_votes::TEXT || '-' || p_blue_votes::TEXT,
        multiplier = v_listed_multiplier,
        updated_at = NOW()
    WHERE id = p_match_id;

    INSERT INTO judge_results (match_id, red_votes, blue_votes, multiplier_red, multiplier_blue)
    VALUES (p_match_id, p_red_votes, p_blue_votes, v_multiplier_red, v_multiplier_blue);

    FOR v_gambit IN
        SELECT * FROM gambits WHERE match_id = p_match_id AND status = 'LOCKED' FOR UPDATE
    LOOP
        IF v_gambit.selected_team_id = v_match_record.red_team_id THEN
            v_gross_return := TRUNC(v_gambit.amount * v_multiplier_red);
        ELSIF v_gambit.selected_team_id = v_match_record.blue_team_id THEN
            v_gross_return := TRUNC(v_gambit.amount * v_multiplier_blue);
        ELSE
            RAISE EXCEPTION 'Gambit selected team not in match';
        END IF;

        -- Stake already reserved at lock time. Credit gross return only.
        UPDATE teams
        SET current_balance = current_balance + v_gross_return
        WHERE id = v_gambit.investor_team_id;

        INSERT INTO ledger_transactions (
          team_id, transaction_type, amount, reference_type, reference_id
        ) VALUES (
          v_gambit.investor_team_id,
          CASE WHEN v_gross_return > 0 THEN 'GAMBIT_RETURN' ELSE 'GAMBIT_LOSS' END,
          v_gross_return,
          'gambit',
          v_gambit.id
        );

        UPDATE gambits
        SET status = 'SETTLED', settled_at = NOW()
        WHERE id = v_gambit.id;

        v_gambits_processed := v_gambits_processed + 1;
        v_total_payout := v_total_payout + v_gross_return;
    END LOOP;

    UPDATE matches
    SET status = 'MATCH_COMPLETE',
        result_submitted_at = NOW(),
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;

    RETURN jsonb_build_object(
        'status', 'success',
        'gambits_processed', v_gambits_processed,
        'total_payout', v_total_payout,
        'result', p_red_votes::TEXT || '-' || p_blue_votes::TEXT,
        'multiplier', v_listed_multiplier
    );
END;
$$;
