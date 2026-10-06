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
