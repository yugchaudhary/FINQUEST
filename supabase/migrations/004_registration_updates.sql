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
