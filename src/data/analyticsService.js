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
   * Evaluate user activity from real tables and unlock badges
   */
  async checkAndUnlockBadges(userId) {
    if (!userId || userId.length < 20) return;
    try {
      // Fetch current badges
      const { data: currentBadges } = await supabase
        .from('achievement_badges')
        .select('badge_name')
        .eq('user_id', userId);
        
      const badgeNames = currentBadges ? currentBadges.map(b => b.badge_name) : [];
      
      // Fetch real stats
      const { count: projectsCreated } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('owner_id', userId);
      const { count: tasksCompleted } = await supabase.from('workspace_tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', userId).eq('status', 'done');
      const { count: docsUploaded } = await supabase.from('workspace_documents').select('*', { count: 'exact', head: true }).eq('uploaded_by', userId);
      const { count: teamMemberships } = await supabase.from('project_members').select('*', { count: 'exact', head: true }).eq('user_id', userId);

      const newBadgesToUnlock = [];

      if (projectsCreated >= 1 && !badgeNames.includes('First Project Created')) newBadgesToUnlock.push('First Project Created');
      if (tasksCompleted >= 10 && !badgeNames.includes('Completed 10 Tasks')) newBadgesToUnlock.push('Completed 10 Tasks');
      if (teamMemberships >= 5 && !badgeNames.includes('Team Builder')) newBadgesToUnlock.push('Team Builder');
      if (docsUploaded >= 1 && !badgeNames.includes('Uploaded First Document')) newBadgesToUnlock.push('Uploaded First Document');
      if ((tasksCompleted > 0 || projectsCreated > 0) && !badgeNames.includes('MVP Contributor')) newBadgesToUnlock.push('MVP Contributor');

      if (newBadgesToUnlock.length > 0) {
        const inserts = newBadgesToUnlock.map(badge => ({
          user_id: userId,
          badge_name: badge
        }));
        await supabase.from('achievement_badges').insert(inserts);
        
        // Push Realtime Notifications
        const notifInserts = newBadgesToUnlock.map(badge => ({
          user_id: userId,
          type: 'achievement',
          message: `Achievement Unlocked: ${badge}!`
        }));
        await supabase.from('notifications').insert(notifInserts);
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
   * Fetch REAL aggregated profile data dynamically from Supabase
   */
  async getRealUserProfileData(userId) {
    if (!userId || userId.length < 20) return null;
    try {
      // 1. Fetch Projects Created
      const { data: createdProjects } = await supabase
        .from('projects')
        .select('id, title, domain, created_at')
        .eq('owner_id', userId);

      // 2. Fetch Projects Joined
      const { data: joinedProjects } = await supabase
        .from('project_members')
        .select('project_id, joined_at, projects(title, domain)')
        .eq('user_id', userId);

      // 3. Fetch Completed Tasks
      const { data: completedTasks } = await supabase
        .from('workspace_tasks')
        .select('id, title, project_id, updated_at')
        .eq('assigned_to', userId)
        .eq('status', 'done');

      // 4. Fetch Uploaded Docs
      const { data: uploadedDocs } = await supabase
        .from('workspace_documents')
        .select('id, name, project_id, created_at')
        .eq('uploaded_by', userId);

      // --- Build Timeline ---
      let timeline = [];
      
      if (createdProjects) {
        createdProjects.forEach(p => {
          timeline.push({
            id: `cp_${p.id}`,
            date: new Date(p.created_at),
            description: `Created project "${p.title}"`,
            type: 'project_created',
            projectId: p.id,
            projectTitle: p.title
          });
        });
      }

      if (joinedProjects) {
        joinedProjects.forEach(pm => {
          timeline.push({
            id: `jp_${pm.project_id}`,
            date: new Date(pm.joined_at),
            description: `Joined project "${pm.projects?.title || 'Unknown'}"`,
            type: 'project_joined',
            projectId: pm.project_id,
            projectTitle: pm.projects?.title
          });
        });
      }

      if (completedTasks) {
        completedTasks.forEach(t => {
          timeline.push({
            id: `ct_${t.id}`,
            date: new Date(t.updated_at),
            description: `Completed task "${t.title}"`,
            type: 'task_completed',
            projectId: t.project_id
          });
        });
      }

      if (uploadedDocs) {
        uploadedDocs.forEach(d => {
          timeline.push({
            id: `ud_${d.id}`,
            date: new Date(d.created_at),
            description: `Uploaded document "${d.name}"`,
            type: 'doc_uploaded',
            projectId: d.project_id
          });
        });
      }

      // Sort timeline descending
      timeline.sort((a, b) => b.date - a.date);

      // --- Compute Dynamic Stats & XP ---
      const cpCount = createdProjects?.length || 0;
      const jpCount = joinedProjects?.length || 0;
      const ctCount = completedTasks?.length || 0;
      const udCount = uploadedDocs?.length || 0;

      // Fetch true materialized XP from user_reputation table
      let dynamicXp = 30; // base XP
      const { data: repData } = await supabase
        .from('user_reputation')
        .select('total_xp')
        .eq('user_id', userId)
        .single();
      
      if (repData && repData.total_xp !== undefined) {
        dynamicXp = repData.total_xp;
      } else {
        // Fallback for brand new users before triggers run
        dynamicXp = (cpCount * 20) + (jpCount * 5) + (ctCount * 10) + (udCount * 5) + 30;
      }
      // Compute Unique Collaborators Worked With
      let uniqueCollaborators = 0;
      if (joinedProjects && joinedProjects.length > 0) {
        const projectIds = joinedProjects.map(p => p.project_id);
        if (projectIds.length > 0) {
          const { data: collabData } = await supabase
            .from('project_members')
            .select('user_id')
            .in('project_id', projectIds);
          if (collabData) {
             const uniqueIds = new Set(collabData.map(c => c.user_id));
             uniqueIds.delete(userId); // remove self
             uniqueCollaborators = uniqueIds.size;
          }
        }
      }

      // --- Infer Skills ---
      const inferredSkills = new Set();
      
      if (createdProjects) createdProjects.forEach(p => { if (p.domain) inferredSkills.add(p.domain); });
      if (joinedProjects) joinedProjects.forEach(p => { if (p.projects?.domain) inferredSkills.add(p.projects.domain); });
      
      // Analyze task titles for heuristics
      if (completedTasks) {
         completedTasks.forEach(t => {
            const lowerTitle = t.title.toLowerCase();
            if (lowerTitle.includes('ui') || lowerTitle.includes('ux') || lowerTitle.includes('design')) inferredSkills.add('UI/UX');
            if (lowerTitle.includes('api') || lowerTitle.includes('backend') || lowerTitle.includes('database')) inferredSkills.add('Backend Engineering');
            if (lowerTitle.includes('react') || lowerTitle.includes('frontend')) inferredSkills.add('Frontend Development');
            if (lowerTitle.includes('model') || lowerTitle.includes('ai') || lowerTitle.includes('ml')) inferredSkills.add('AI Systems');
            if (lowerTitle.includes('contract') || lowerTitle.includes('web3') || lowerTitle.includes('crypto')) inferredSkills.add('Blockchain/Web3');
         });
      }

      const skillsArray = Array.from(inferredSkills);
      if (skillsArray.length === 0) {
        skillsArray.push("General Builder");
      }

      return {
        timeline,
        stats: {
          projectsCreated: cpCount,
          projectsJoined: jpCount,
          tasksCompleted: ctCount,
          docsUploaded: udCount,
          collaborators: uniqueCollaborators,
          dynamicXp: dynamicXp,
          consistencyScore: Math.min(100, 70 + (timeline.length * 2)) // Mock realistic consistency curve
        },
        inferredSkills: skillsArray
      };

    } catch (err) {
      console.error("Error fetching real profile data:", err);
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
