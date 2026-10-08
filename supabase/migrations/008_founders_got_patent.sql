-- 008_founders_got_patent.sql
-- New schema for Founder's Got Patent

-- categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- problem_statements
CREATE TABLE IF NOT EXISTS problem_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id),
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, number)
);

DROP TRIGGER IF EXISTS update_problem_statements_modtime ON problem_statements;
CREATE TRIGGER update_problem_statements_modtime
BEFORE UPDATE ON problem_statements
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- team_problem_selections
CREATE TABLE IF NOT EXISTS team_problem_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  problem_statement_id UUID NOT NULL REFERENCES problem_statements(id),
  selected_by UUID REFERENCES auth.users(id),
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, problem_statement_id)
);

-- team_problem_selection_state
CREATE TABLE IF NOT EXISTS team_problem_selection_state (
  team_id UUID PRIMARY KEY REFERENCES teams(id),
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'FINALIZED')),
  finalized_at TIMESTAMPTZ,
  finalized_by UUID REFERENCES auth.users(id),
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES auth.users(id)
);

-- announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES auth.users(id)
);

-- Modify teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- The role check constraint in teams needs to accommodate 'PENDING'
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_role_check;
ALTER TABLE teams ADD CONSTRAINT teams_role_check CHECK (role IN ('INNOVATOR', 'INVESTOR', 'PENDING'));

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_problem_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_problem_selection_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Categories: read all
DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write categories" ON categories;
CREATE POLICY "Admin write categories" ON categories FOR ALL TO authenticated USING (public.is_admin());

-- Problem Statements: participants read published for their category, admin reads all
DROP POLICY IF EXISTS "Participant read published problems" ON problem_statements;
CREATE POLICY "Participant read published problems" ON problem_statements FOR SELECT TO authenticated 
USING (
  published = true AND 
  category_id = (SELECT category_id FROM teams WHERE id = public.get_user_team_id())
);
DROP POLICY IF EXISTS "Admin read all problems" ON problem_statements;
CREATE POLICY "Admin read all problems" ON problem_statements FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admin write problems" ON problem_statements;
CREATE POLICY "Admin write problems" ON problem_statements FOR ALL TO authenticated USING (public.is_admin());

-- Team Problem Selections: participant reads own team, admin reads all
DROP POLICY IF EXISTS "Participant read own team selections" ON team_problem_selections;
CREATE POLICY "Participant read own team selections" ON team_problem_selections FOR SELECT TO authenticated
USING (team_id = public.get_user_team_id());
DROP POLICY IF EXISTS "Participant write own team selections" ON team_problem_selections;
CREATE POLICY "Participant write own team selections" ON team_problem_selections FOR ALL TO authenticated
USING (team_id = public.get_user_team_id());
DROP POLICY IF EXISTS "Admin read all selections" ON team_problem_selections;
CREATE POLICY "Admin read all selections" ON team_problem_selections FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admin write all selections" ON team_problem_selections;
CREATE POLICY "Admin write all selections" ON team_problem_selections FOR ALL TO authenticated USING (public.is_admin());

-- Team Problem Selection State
DROP POLICY IF EXISTS "Participant read own state" ON team_problem_selection_state;
CREATE POLICY "Participant read own state" ON team_problem_selection_state FOR SELECT TO authenticated
USING (team_id = public.get_user_team_id());
DROP POLICY IF EXISTS "Participant write own state" ON team_problem_selection_state;
CREATE POLICY "Participant write own state" ON team_problem_selection_state FOR ALL TO authenticated
USING (team_id = public.get_user_team_id());
DROP POLICY IF EXISTS "Admin read all state" ON team_problem_selection_state;
CREATE POLICY "Admin read all state" ON team_problem_selection_state FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admin write all state" ON team_problem_selection_state;
CREATE POLICY "Admin write all state" ON team_problem_selection_state FOR ALL TO authenticated USING (public.is_admin());

-- Announcements
DROP POLICY IF EXISTS "Public read announcements" ON announcements;
CREATE POLICY "Public read announcements" ON announcements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin write announcements" ON announcements;
CREATE POLICY "Admin write announcements" ON announcements FOR ALL TO authenticated USING (public.is_admin());

-- Update Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE problem_statements;
ALTER PUBLICATION supabase_realtime ADD TABLE team_problem_selections;
ALTER PUBLICATION supabase_realtime ADD TABLE team_problem_selection_state;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
