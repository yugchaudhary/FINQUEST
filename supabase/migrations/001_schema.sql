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

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE event_state;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE gambits;
ALTER PUBLICATION supabase_realtime ADD TABLE final_round_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE final_judge_results;
