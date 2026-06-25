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
  visibility TEXT DEFAULT 'preview',
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
CREATE POLICY "Projects select policy" ON projects FOR SELECT USING (
  visibility = 'preview' OR
  owner_id = auth.uid() OR
  id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  id IN (SELECT project_id FROM project_applications WHERE applicant_id = auth.uid())
);
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

-- 5. Workspace Tasks Table
CREATE TABLE workspace_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo',
  priority TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Workspace Chat Messages Table
CREATE TABLE workspace_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Workspace Documents Table
CREATE TABLE workspace_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT,
  size INTEGER,
  content TEXT, -- Storing Base64 payload or raw text
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspace RLS Policies (Restricted to team members only)
ALTER TABLE workspace_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable by members" ON workspace_tasks FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);
CREATE POLICY "Tasks insert by members" ON workspace_tasks FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);
CREATE POLICY "Tasks update by members" ON workspace_tasks FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);
CREATE POLICY "Tasks delete by members" ON workspace_tasks FOR DELETE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

ALTER TABLE workspace_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat viewable by members" ON workspace_chat_messages FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);
CREATE POLICY "Chat insert by members" ON workspace_chat_messages FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

ALTER TABLE workspace_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docs viewable by members" ON workspace_documents FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);
CREATE POLICY "Docs insert by members" ON workspace_documents FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()) OR
  project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
);

CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON workspace_tasks
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- 8. Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read_status BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own notifications" ON notifications FOR DELETE USING (user_id = auth.uid());

-- 9. User Reputation Table
CREATE TABLE user_reputation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 30,
  reputation_score INTEGER DEFAULT 30,
  contribution_score INTEGER DEFAULT 0,
  collaboration_score INTEGER DEFAULT 0,
  consistency_score INTEGER DEFAULT 100,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reputation viewable by everyone" ON user_reputation FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reputation" ON user_reputation FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own reputation" ON user_reputation FOR UPDATE USING (user_id = auth.uid());

CREATE TRIGGER reputation_updated_at
BEFORE UPDATE ON user_reputation
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- 10. Achievement Badges Table
CREATE TABLE achievement_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public badges viewable by everyone" ON achievement_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert their own badges" ON achievement_badges FOR INSERT WITH CHECK (user_id = auth.uid());
