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
