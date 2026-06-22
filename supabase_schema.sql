-- Supabase Schema for CollabNest

-- 1. Users / Profiles Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'builder',
  profile_image TEXT,
  reputation INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Projects Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  skills TEXT[],
  difficulty TEXT,
  status TEXT DEFAULT 'Ideation',
  owner_id UUID REFERENCES users(id),
  owner_email TEXT,
  author TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  expected_outcome TEXT,
  project_goals TEXT,
  team_total INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Project Members Table
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'builder', -- 'owner' or 'builder'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 4. Project Applications Table
CREATE TABLE project_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id UUID REFERENCES users(id) ON DELETE CASCADE,
  motivation TEXT,
  portfolio TEXT,
  message TEXT,
  status TEXT DEFAULT 'Pending', -- 'Pending', 'Accepted', 'Rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, applicant_id)
);

-- RLS (Row Level Security) Policies
-- For now, we will enable read access to everyone to keep it simple and match the current open app design.
-- Production apps should lock this down further.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile." ON users FOR UPDATE USING (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are viewable by everyone." ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can create a project." ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update a project." ON projects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete a project." ON projects FOR DELETE USING (true);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members are viewable by everyone." ON project_members FOR SELECT USING (true);
CREATE POLICY "Anyone can insert members." ON project_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete members." ON project_members FOR DELETE USING (true);

ALTER TABLE project_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applications are viewable by everyone." ON project_applications FOR SELECT USING (true);
CREATE POLICY "Anyone can insert applications." ON project_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update applications." ON project_applications FOR UPDATE USING (true);

-- Functions
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
