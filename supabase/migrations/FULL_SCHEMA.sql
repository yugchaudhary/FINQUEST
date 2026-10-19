-- 001_schema.sql
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  team_name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('INNOVATOR', 'INVESTOR')),
  starting_balance BIGINT DEFAULT 1000000,  -- 10,00,000 in Indian notation
  current_balance BIGINT DEFAULT 1000000,
  is_finalist BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_teams_modtime
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  auth_role TEXT NOT NULL DEFAULT 'PARTICIPANT' CHECK (auth_role IN ('ADMIN', 'PARTICIPANT')),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- event_state
CREATE TABLE event_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_phase TEXT NOT NULL DEFAULT 'SETUP' CHECK (current_phase IN (
    'SETUP', 'PHASE_1', 'PHASE_1_REVEAL', 'FINALS_TRANSITION', 'PHASE_2', 'FINALS_LEADERBOARD'
  )),
  current_screen_state TEXT NOT NULL DEFAULT 'SETUP' CHECK (current_screen_state IN (
    'SETUP', 'WAITING_FOR_MATCH', 'MATCH_LIVE', 'AWAITING_RESULT', 'RESULT_PROCESSING',
    'MATCH_COMPLETE', 'PHASE_1_REVEAL', 'FINALS_TRANSITION', 'FINALS_READY',
    'FINALIST_LIVE', 'RATINGS_OPEN', 'RATINGS_LOCKED', 'FINALS_SCORE_CALCULATED', 'FINALS_LEADERBOARD'
  )),
  current_match_id UUID,
  current_finalist_id UUID,
  current_round INTEGER DEFAULT 0,
  phase_1_leaderboard_published BOOLEAN DEFAULT FALSE,
  finals_initialized BOOLEAN DEFAULT FALSE,
  final_leaderboard_active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_event_state_modtime
BEFORE UPDATE ON event_state
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insert the singleton row
INSERT INTO event_state (id) VALUES (1);

-- matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  category TEXT NOT NULL,
  red_team_id UUID NOT NULL REFERENCES teams(id),
  blue_team_id UUID NOT NULL REFERENCES teams(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LIVE', 'COMPLETED')),
  broadcasted_at TIMESTAMPTZ,
  result_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (red_team_id != blue_team_id)
);

-- gambits
CREATE TABLE gambits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id),
  investor_team_id UUID NOT NULL REFERENCES teams(id),
  selected_team_id UUID NOT NULL REFERENCES teams(id),
  amount BIGINT NOT NULL CHECK (amount > 0 AND amount <= 250000),
  status TEXT NOT NULL DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'SETTLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  UNIQUE(match_id, investor_team_id)
);

-- judge_results
CREATE TABLE judge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL UNIQUE REFERENCES matches(id),
  red_votes INTEGER NOT NULL CHECK (red_votes >= 0 AND red_votes <= 5),
  blue_votes INTEGER NOT NULL CHECK (blue_votes >= 0 AND blue_votes <= 5),
  multiplier_red NUMERIC(4,2) NOT NULL,
  multiplier_blue NUMERIC(4,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (red_votes + blue_votes = 5)
);

-- final_round_scores
CREATE TABLE final_round_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finalist_team_id UUID NOT NULL REFERENCES teams(id),
  investor_team_id UUID NOT NULL REFERENCES teams(id),
  score NUMERIC(3,1) NOT NULL CHECK (score >= 1.0 AND score <= 10.0),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(finalist_team_id, investor_team_id)
);

-- final_judge_results
CREATE TABLE final_judge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finalist_team_id UUID NOT NULL UNIQUE REFERENCES teams(id),
  judges_average NUMERIC(4,2) NOT NULL CHECK (judges_average >= 1.0 AND judges_average <= 10.0),
  investor_average NUMERIC(4,2),
  final_score NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_final_judge_results_modtime
BEFORE UPDATE ON final_judge_results
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_team_id ON users(team_id);
CREATE INDEX idx_matches_red_team ON matches(red_team_id);
CREATE INDEX idx_matches_blue_team ON matches(blue_team_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_gambits_match_id ON gambits(match_id);
CREATE INDEX idx_gambits_investor_team ON gambits(investor_team_id);
CREATE INDEX idx_gambits_status ON gambits(status);
CREATE INDEX idx_final_scores_finalist ON final_round_scores(finalist_team_id);
CREATE INDEX idx_final_scores_investor ON final_round_scores(investor_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_status_round ON matches(status, round_number DESC);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_announcements_published_at ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_teams_lower_name ON teams(lower(team_name));

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE event_state;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE gambits;
ALTER PUBLICATION supabase_realtime ADD TABLE final_round_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE final_judge_results;
-- 002_rls_policies.sql

-- Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND auth_role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT team_id FROM public.users
  WHERE id = auth.uid();
$$;

-- Enable RLS on ALL tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE gambits ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_round_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_judge_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- Policies: teams
-- ==========================================
-- SELECT for all authenticated
CREATE POLICY "Teams are viewable by all authenticated users"
ON teams FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE for admin only
CREATE POLICY "Admins can insert teams"
ON teams FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update teams"
ON teams FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete teams"
ON teams FOR DELETE TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: users
-- ==========================================
-- SELECT own row + admin
CREATE POLICY "Users can view own row or admins can view all"
ON users FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

-- INSERT/UPDATE for admin only
CREATE POLICY "Admins can insert users"
ON users FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update users"
ON users FOR UPDATE TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: event_state
-- ==========================================
-- SELECT for all authenticated
CREATE POLICY "Event state is viewable by all authenticated users"
ON event_state FOR SELECT TO authenticated USING (true);

-- UPDATE for admin only
CREATE POLICY "Admins can update event state"
ON event_state FOR UPDATE TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: matches
-- ==========================================
-- SELECT for authenticated (only LIVE and COMPLETED). All ops for admin.
CREATE POLICY "Matches viewable by authenticated if LIVE/COMPLETED or by admin"
ON matches FOR SELECT TO authenticated
USING (status IN ('LIVE', 'COMPLETED') OR public.is_admin());

CREATE POLICY "Admins can insert matches"
ON matches FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update matches"
ON matches FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Admins can delete matches"
ON matches FOR DELETE TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: gambits
-- ==========================================
-- SELECT own team's gambits only. Admin can SELECT all.
CREATE POLICY "Users can view own team's gambits or admins can view all"
ON gambits FOR SELECT TO authenticated
USING (investor_team_id = public.get_user_team_id() OR public.is_admin());

-- INSERT own team's gambit only (when match is LIVE)
CREATE POLICY "Users can insert gambits for own team when match is LIVE"
ON gambits FOR INSERT TO authenticated
WITH CHECK (
  investor_team_id = public.get_user_team_id() AND
  EXISTS (
    SELECT 1 FROM matches WHERE id = match_id AND status = 'LIVE'
  )
);

-- Admin full access
CREATE POLICY "Admins can manage gambits"
ON gambits FOR ALL TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: judge_results
-- ==========================================
-- No participant SELECT. Admin full access.
CREATE POLICY "Admins can manage judge results"
ON judge_results FOR ALL TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: final_round_scores
-- ==========================================
-- INSERT own score. SELECT own scores. Admin full access.
CREATE POLICY "Users can view own final round scores or admins can view all"
ON final_round_scores FOR SELECT TO authenticated
USING (investor_team_id = public.get_user_team_id() OR public.is_admin());

CREATE POLICY "Users can insert own final round score"
ON final_round_scores FOR INSERT TO authenticated
WITH CHECK (investor_team_id = public.get_user_team_id());

CREATE POLICY "Admins can update final round scores"
ON final_round_scores FOR UPDATE TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: final_judge_results
-- ==========================================
-- SELECT when final_leaderboard_active is true. Admin full access.
CREATE POLICY "Users can view final judge results if leaderboard active"
ON final_judge_results FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM event_state WHERE id = 1 AND final_leaderboard_active = TRUE)
  OR public.is_admin()
);

CREATE POLICY "Admins can manage final judge results"
ON final_judge_results FOR ALL TO authenticated USING (public.is_admin());


-- ==========================================
-- Policies: audit_logs
-- ==========================================
CREATE POLICY "Admins have full access to audit logs"
ON audit_logs FOR ALL TO authenticated USING (public.is_admin());
-- 003_functions.sql

-- 1. lock_gambit(p_match_id UUID, p_investor_team_id UUID, p_selected_team_id UUID, p_amount BIGINT)
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
    -- Verify match is accepting bets (no FOR UPDATE on shared matches row to eliminate serialization bottleneck)
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

-- 2. settle_match_gambits(p_match_id UUID, p_red_votes INT, p_blue_votes INT)
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

        -- Update team balance: add gross return (amount was reserved at lock time)
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
-- 004_registration_updates.sql

-- 1. Add PENDING role to teams
ALTER TABLE teams DROP CONSTRAINT teams_role_check;
ALTER TABLE teams ADD CONSTRAINT teams_role_check CHECK (role IN ('PENDING', 'INNOVATOR', 'INVESTOR'));
ALTER TABLE teams ALTER COLUMN role SET DEFAULT 'PENDING';

-- 2. Create team_members table for the 4 participants
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add trigger for updated_at
CREATE TRIGGER update_team_members_modtime
BEFORE UPDATE ON team_members
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- 4. Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for team_members
CREATE POLICY "Teams can view their own members" ON team_members FOR SELECT USING (team_id = get_user_team_id());
CREATE POLICY "Teams can insert their own members" ON team_members FOR INSERT WITH CHECK (team_id = get_user_team_id());
CREATE POLICY "Teams can update their own members" ON team_members FOR UPDATE USING (team_id = get_user_team_id());
CREATE POLICY "Teams can delete their own members" ON team_members FOR DELETE USING (team_id = get_user_team_id());
CREATE POLICY "Admins have full access to team members" ON team_members FOR ALL USING (is_admin());
-- 006_allowed_registrations.sql

CREATE TABLE allowed_registrations (
  registration_number TEXT PRIMARY KEY,
  is_used BOOLEAN DEFAULT FALSE,
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE allowed_registrations ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to allowed_registrations" ON allowed_registrations FOR ALL USING (is_admin());

-- Public can select to verify during registration
CREATE POLICY "Public can select allowed_registrations" ON allowed_registrations FOR SELECT USING (true);
