import { supabase } from '../supabase';
import { userService } from './userService';

class AnalyticsService {
  /**
   * Log an activity to the user_activity_logs table
   */
  async logActivity(projectId, userId, actionType, description) {
    if (!projectId || !userId || projectId.length < 20 || userId.length < 20) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .insert([{
          project_id: projectId,
          user_id: userId,
          action_type: actionType,
          description: description
        }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      console.error('Error logging activity:', err.message);
      return null;
    }
  }

  /**
   * Award XP and update user reputation stats
   */
  async awardXP(userId, xpAmount, category = 'contribution') {
    if (!userId || userId.length < 20) return null;

    try {
      // Check if user_reputation exists
      const { data: repData, error: fetchError } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let newXp = xpAmount;
      let newScore = 30 + Math.floor(xpAmount / 10);
      let newContribution = category === 'contribution' ? xpAmount : 0;
      let newCollaboration = category === 'collaboration' ? xpAmount : 0;

      if (repData) {
        newXp = repData.total_xp + xpAmount;
        newScore = repData.reputation_score + Math.floor(xpAmount / 10);
        newContribution = repData.contribution_score + (category === 'contribution' ? xpAmount : 0);
        newCollaboration = repData.collaboration_score + (category === 'collaboration' ? xpAmount : 0);

        const { data, error } = await supabase
          .from('user_reputation')
          .update({
            total_xp: newXp,
            reputation_score: newScore,
            contribution_score: newContribution,
            collaboration_score: newCollaboration
          })
          .eq('user_id', userId)
          .select();

        if (error) throw error;
        
        // Evaluate badges asynchronously
        this.checkAndUnlockBadges(userId);
        return data[0];
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_reputation')
          .insert([{
            user_id: userId,
            total_xp: newXp,
            reputation_score: newScore,
            contribution_score: newContribution,
            collaboration_score: newCollaboration,
            consistency_score: 100 // default starting consistency
          }])
          .select();

        if (error) throw error;
        
        this.checkAndUnlockBadges(userId);
        return data[0];
      }
    } catch (err) {
      console.error('Error awarding XP:', err.message);
      return null;
    }
  }

  /**
   * Evaluate user activity and unlock badges if thresholds are met
   */
  async checkAndUnlockBadges(userId) {
    if (!userId || userId.length < 20) return;
    try {
      // Fetch user's current badges
      const { data: currentBadges, error: badgesError } = await supabase
        .from('achievement_badges')
        .select('badge_name')
        .eq('user_id', userId);
        
      if (badgesError) throw badgesError;
      
      const badgeNames = currentBadges.map(b => b.badge_name);
      
      // Fetch activity logs to count actions
      const { data: logs, error: logsError } = await supabase
        .from('user_activity_logs')
        .select('action_type')
        .eq('user_id', userId);
        
      if (logsError) throw logsError;

      const tasksCompleted = logs.filter(l => l.action_type === 'task_completed').length;
      const docsUploaded = logs.filter(l => l.action_type === 'doc_uploaded').length;
      const messagesSent = logs.filter(l => l.action_type === 'message_sent').length;

      const newBadgesToUnlock = [];

      // Logic Rules
      if (tasksCompleted >= 1 && !badgeNames.includes('First Task')) newBadgesToUnlock.push('First Task');
      if (tasksCompleted >= 5 && !badgeNames.includes('Task Master')) newBadgesToUnlock.push('Task Master');
      if (docsUploaded >= 1 && !badgeNames.includes('Knowledge Sharer')) newBadgesToUnlock.push('Knowledge Sharer');
      if (messagesSent >= 10 && !badgeNames.includes('Collaboration Expert')) newBadgesToUnlock.push('Collaboration Expert');

      if (newBadgesToUnlock.length > 0) {
        const inserts = newBadgesToUnlock.map(badge => ({
          user_id: userId,
          badge_name: badge
        }));
        
        await supabase.from('achievement_badges').insert(inserts);
      }
    } catch (err) {
      console.error('Error unlocking badges:', err.message);
    }
  }

  /**
   * Fetch all analytics data for a user to display on their profile
   */
  async getUserAnalytics(userId) {
    if (!userId || userId.length < 20) return null;
    try {
      const { data: repData, error: repError } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      const { data: badgesData, error: badgesError } = await supabase
        .from('achievement_badges')
        .select('badge_name')
        .eq('user_id', userId);
        
      const badges = badgesData ? badgesData.map(b => b.badge_name) : [];
      
      return {
        reputation: repData || { total_xp: 0, reputation_score: 30, consistency_score: 98 },
        badges: badges
      };
    } catch (err) {
      console.error('Error fetching user analytics:', err.message);
      return null;
    }
  }

  /**
   * Fetch live activity timeline for a project
   */
  async getProjectTimeline(projectId) {
    if (!projectId || projectId.length < 20) return [];
    try {
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching project timeline:', err.message);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
