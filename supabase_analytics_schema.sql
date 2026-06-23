-- Analytics Schema for CollabNest

-- 8. User Reputation Table
CREATE TABLE user_reputation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 30,
  contribution_score INTEGER DEFAULT 0,
  collaboration_score INTEGER DEFAULT 0,
  consistency_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. User Activity Logs Table
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- e.g., 'task_completed', 'doc_uploaded', 'message_sent'
  description TEXT, -- e.g., 'Anu uploaded Architecture.pdf'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Achievement Badges Table
CREATE TABLE achievement_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

-- Analytics RLS Policies (Open for now to match current app design)
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reputation" ON user_reputation FOR ALL USING (true);

ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public activity logs" ON user_activity_logs FOR ALL USING (true);

ALTER TABLE achievement_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public achievement badges" ON achievement_badges FOR ALL USING (true);

CREATE TRIGGER reputation_updated_at
BEFORE UPDATE ON user_reputation
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
