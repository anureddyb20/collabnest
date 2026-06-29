-- CollabNest Backend Stabilization Schema
-- Run this script in the Supabase SQL Editor.

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Public delete notifications" ON notifications FOR DELETE USING (true);

-- 2. User Settings / Profiles Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  skills TEXT[] DEFAULT '{}',
  experience TEXT DEFAULT 'Entry Level',
  availability TEXT DEFAULT '5-10 hrs/week',
  domains TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are viewable by everyone." ON user_settings FOR SELECT USING (true);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (true);

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();

-- 3. Saved Projects Table
CREATE TABLE IF NOT EXISTS saved_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE saved_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Saved projects viewable by owner" ON saved_projects FOR SELECT USING (true);
CREATE POLICY "Anyone can save a project" ON saved_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can unsave a project" ON saved_projects FOR DELETE USING (true);

-- 4. Add Missing Columns to Existing Tables (Safe Additions)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS stage_index INTEGER DEFAULT 0;
ALTER TABLE workspace_tasks ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- 5. Reputation Materialization Triggers
CREATE OR REPLACE FUNCTION handle_task_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified = true AND OLD.verified = false THEN
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO user_reputation (user_id, total_xp, contribution_score, reputation_score)
      VALUES (NEW.assigned_to, 10, 1, 30)
      ON CONFLICT (user_id) DO UPDATE 
      SET total_xp = user_reputation.total_xp + 10,
          contribution_score = user_reputation.contribution_score + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_verified_reputation ON workspace_tasks;
CREATE TRIGGER task_verified_reputation
AFTER UPDATE OF verified ON workspace_tasks
FOR EACH ROW
EXECUTE PROCEDURE handle_task_verified();

CREATE OR REPLACE FUNCTION handle_doc_uploaded()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uploaded_by IS NOT NULL THEN
    INSERT INTO user_reputation (user_id, total_xp, collaboration_score, reputation_score)
    VALUES (NEW.uploaded_by, 5, 1, 30)
    ON CONFLICT (user_id) DO UPDATE 
    SET total_xp = user_reputation.total_xp + 5,
        collaboration_score = user_reputation.collaboration_score + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS doc_upload_reputation ON workspace_documents;
CREATE TRIGGER doc_upload_reputation
AFTER INSERT ON workspace_documents
FOR EACH ROW
EXECUTE PROCEDURE handle_doc_uploaded();
