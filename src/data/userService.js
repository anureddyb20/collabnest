import { supabase } from '../supabase';
import { problems } from './problems';

const SESSION_KEY = 'collabnest_current_session';

const areEmailsSimilar = (e1, e2) => {
  if (!e1 || !e2) return false;
  const clean = (e) => e.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const c1 = clean(e1.split('@')[0]);
  const c2 = clean(e2.split('@')[0]);
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
};

export const userService = {
  areEmailsSimilar,

  // Synchronous session check (from local cache)
  getCurrentUser: () => {
    const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  registerOrLogin: async (userData) => {
    try {
      const email = userData.email.toLowerCase().trim();
      let name = userData.name ? userData.name.trim() : email.split('@')[0];

      // Upsert into Supabase users table
      const { data, error } = await supabase
        .from('users')
        .upsert({
          email: email,
          name: name,
          role: userData.role || 'builder',
          reputation: 30
        }, { onConflict: 'email', ignoreDuplicates: true })
        .select()
        .single();
        
      if (error && error.code !== '23505') {
        console.error("Supabase user upsert error:", error);
      }

      // Fetch to ensure we get the ID if it was ignored
      const { data: userRecord } = await supabase.from('users').select('*').eq('email', email).single();
      let finalUser = userRecord || data || { email, name, role: userData.role || 'builder' };

      // If the existing name in the DB is generic (email prefix or Guest Builder), and we have a better name now, update it
      const emailPrefix = email.split('@')[0];
      const isGenericName = (dbName) => {
        if (!dbName) return true;
        const lowerName = dbName.toLowerCase();
        return lowerName === emailPrefix.toLowerCase() || lowerName === 'guest builder' || lowerName === 'user';
      };

      if (userRecord && isGenericName(userRecord.name) && name && !isGenericName(name)) {
        const { data: updatedUser } = await supabase.from('users').update({ name: name }).eq('email', email).select().single();
        if (updatedUser) {
          finalUser = updatedUser;
        }
      }

      // Set session locally
      const sessionData = { 
        id: finalUser.id,
        email: finalUser.email, 
        name: finalUser.name || name, 
        role: finalUser.role 
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      
      return sessionData;
    } catch (e) {
      console.error(e);
      const email = userData.email.toLowerCase().trim();
      let name = userData.name ? userData.name.trim() : email.split('@')[0];
      const sessionData = { email: email, name: name, role: userData.role || 'builder' };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      return sessionData;
    }
  },

  logout: async (localOnly = false) => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (!localOnly) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error("Logout error", e);
      }
    }
  },

  getUserNameByEmail: async (email) => {
    if (!email) return "Unknown";
    try {
      const { data } = await supabase.from('users').select('name').eq('email', email.toLowerCase().trim()).single();
      return data?.name || email.split('@')[0];
    } catch {
      return email.split('@')[0];
    }
  },

  updateProfile: async (email, profileData) => {
    if (!email) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .update(profileData)
        .eq('email', email.toLowerCase().trim())
        .select()
        .single();
      if (!error && data) {
        const current = userService.getCurrentUser() || {};
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...data }));
      }
      return data;
    } catch {
      return null;
    }
  },

  // User Settings API
  getUserSettings: async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows returned
      return data || { skills: [], experience: 'Entry Level', availability: '5-10 hrs/week', domains: [] };
    } catch (e) {
      console.error("Error fetching user settings:", e);
      return { skills: [], experience: 'Entry Level', availability: '5-10 hrs/week', domains: [] };
    }
  },

  updateUserSettings: async (userId, settingsData) => {
    if (!userId) return false;
    try {
      const { error } = await supabase.from('user_settings')
        .upsert({ user_id: userId, ...settingsData }, { onConflict: 'user_id' });
      return !error;
    } catch (e) {
      console.error("Error updating user settings:", e);
      return false;
    }
  },

  getAllProblems: async () => {
    try {
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members (*, users (*)),
          project_applications (*, users (*))
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Fetch problems error:", error);
        return problems;
      }

      const processProject = (p) => {
        const storageKey = `collabnest_local_project_${p.id}`;
        const localDataStr = localStorage.getItem(storageKey);
        const localData = localDataStr ? JSON.parse(localDataStr) : {};

        return {
          ...p,
          desc: p.description, // remap description -> desc for frontend
          team: { current: p.project_members?.length || 1, total: p.team_total || 5 },
          teamMembers: (p.project_members || []).map(m => ({
            ...m,
            name: m.users?.name || 'Builder',
            email: m.users?.email || '',
            reputation: m.users?.reputation || 10,
            skills: m.users?.skills || [],
            role: m.role === 'owner' ? 'Owner' : 'Builder',
            activity: 'High',
            contributions: 0
          })),
          applications: (p.project_applications || []).map(app => ({
            ...app,
            email: app.users?.email || app.email,
            name: app.users?.name || app.name,
            reputation: app.users?.reputation || 10,
            skills: app.users?.skills || []
          })),
          author: p.author || p.owner_email,
          ownerId: p.owner_id,
          ownerEmail: p.owner_email,
          stageIndex: p.stage_index !== undefined && p.stage_index !== null ? p.stage_index : (localData.stageIndex || 0),
          ...localData
        };
      };

      if (projects && projects.length === 0) {
        // Auto-seed
        for (const p of problems) {
          await supabase.from('projects').insert({
            title: p.title,
            description: p.desc,
            domain: p.domain,
            skills: p.skills || [],
            difficulty: p.difficulty,
            status: p.status,
            team_total: p.team?.total || 5,
            is_ai_generated: true,
            author: p.author || 'AI System'
          });
        }
        
        // Fetch again after seeding
        const { data: newProjects } = await supabase
          .from('projects')
          .select(`
            *,
            project_members (*, users (*)),
            project_applications (*, users (*))
          `)
          .order('created_at', { ascending: false });
          
        const uniqueNewProjects = [];
        const seenNewTitles = new Set();
        for (const p of (newProjects || [])) {
          if (!seenNewTitles.has(p.title)) {
            seenNewTitles.add(p.title);
            uniqueNewProjects.push(p);
          }
        }
        return uniqueNewProjects.map(processProject);
      }

      const uniqueProjects = [];
      const seenTitles = new Set();
      for (const p of projects) {
        if (!seenTitles.has(p.title)) {
          seenTitles.add(p.title);
          uniqueProjects.push(p);
        }
      }

      return uniqueProjects.map(processProject);
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addProblem: async (newProblem) => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return null;

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({
          title: newProblem.title,
          description: newProblem.desc,
          domain: newProblem.domain,
          skills: newProblem.skills || [],
          difficulty: newProblem.difficulty,
          status: newProblem.status || 'Ideation',
          owner_id: session.id,
          owner_email: session.email,
          author: session.email,
          expected_outcome: newProblem.expectedOutcome,
          project_goals: newProblem.projectGoals,
          team_total: newProblem.teamSize || 5,
          is_ai_generated: false
        })
        .select()
        .single();

      if (error) throw error;

      if (project && session.id) {
        await supabase.from('project_members').insert({
          project_id: project.id,
          user_id: session.id,
          role: 'owner'
        });
      }

      return {
        ...project,
        desc: project.description,
        team: { current: 1, total: project.team_total },
        teamMembers: [],
        applications: [],
        author: session.email,
        ownerId: session.id,
        ownerEmail: session.email
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteProblem: async (problemId) => {
    try {
      await supabase.from('projects').delete().eq('id', problemId);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  updateProblem: async (problemId, updatedFields) => {
    const mapped = { ...updatedFields };
    if (mapped.desc) { mapped.description = mapped.desc; delete mapped.desc; }
    
    // Map stageIndex to stage_index for Supabase
    if (mapped.stageIndex !== undefined) {
      mapped.stage_index = mapped.stageIndex;
      delete mapped.stageIndex;
    }

    // Save local-only fields (tasks, docs, logs, progress)
    const localKeys = ['tasks', 'docs', 'contributionsLogs', 'progress'];
    let hasLocalUpdates = false;
    const localUpdates = {};

    localKeys.forEach(k => {
      if (mapped[k] !== undefined) {
        localUpdates[k] = mapped[k];
        hasLocalUpdates = true;
      }
    });

    if (hasLocalUpdates) {
      const storageKey = `collabnest_local_project_${problemId}`;
      const existingStr = localStorage.getItem(storageKey);
      const existing = existingStr ? JSON.parse(existingStr) : {};
      localStorage.setItem(storageKey, JSON.stringify({ ...existing, ...localUpdates }));
    }
    
    const columnsToUpdate = {};
    const validColumns = ['title', 'description', 'domain', 'skills', 'difficulty', 'status', 'expected_outcome', 'project_goals', 'team_total', 'is_ai_generated', 'owner_email', 'owner_id', 'author', 'stage_index'];
    
    Object.keys(mapped).forEach(key => {
      if (validColumns.includes(key)) {
        columnsToUpdate[key] = mapped[key];
      }
    });

    if (Object.keys(columnsToUpdate).length > 0) {
      try {
        await supabase.from('projects').update(columnsToUpdate).eq('id', problemId);
      } catch (e) {
        console.error(e);
      }
    }
  },

  claimProject: async (problemId) => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return false;

    try {
      const { data: problem } = await supabase.from('projects').select('*').eq('id', problemId).single();
      if (!problem || problem.status !== 'available_to_claim') return false;

      const { error } = await supabase.from('projects').update({
        owner_id: session.id,
        owner_email: session.email,
        author: session.email,
        status: 'Ideation',
        is_ai_generated: true
      }).eq('id', problemId);

      if (error) throw error;

      await supabase.from('project_members').insert({
        project_id: problemId,
        user_id: session.id,
        role: 'owner'
      });

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  applyToJoin: async (problemId, applicationData) => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return false;

    try {
      const { error } = await supabase.from('project_applications').insert({
        project_id: problemId,
        applicant_id: session.id,
        motivation: applicationData.motivation,
        portfolio: applicationData.portfolio,
        message: applicationData.message,
        status: 'Pending'
      });

      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  acceptApplicant: async (problemId, applicantEmail) => {
    try {
      const { data: applicant } = await supabase.from('users').select('id').eq('email', applicantEmail.toLowerCase().trim()).single();
      if (!applicant) return false;

      const { error: appError } = await supabase.from('project_applications')
        .update({ status: 'Accepted' })
        .eq('project_id', problemId)
        .eq('applicant_id', applicant.id);

      if (appError) throw appError;

      const { error: memError } = await supabase.from('project_members').insert({
        project_id: problemId,
        user_id: applicant.id,
        role: 'builder'
      });

      return !memError;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  rejectApplicant: async (problemId, applicantEmail) => {
    try {
      const { data: applicant } = await supabase.from('users').select('id').eq('email', applicantEmail.toLowerCase().trim()).single();
      if (!applicant) return false;

      const { error } = await supabase.from('project_applications')
        .update({ status: 'Rejected' })
        .eq('project_id', problemId)
        .eq('applicant_id', applicant.id);

      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getJoinedProblems: async () => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return [];

    try {
      const { data: memberships } = await supabase.from('project_members').select('project_id').eq('user_id', session.id);
      const joinedIds = memberships ? memberships.map(m => m.project_id) : [];

      const { data: ownedProjects } = await supabase.from('projects').select('id').eq('owner_id', session.id);
      const ownedIds = ownedProjects ? ownedProjects.map(p => p.id) : [];

      const allIds = Array.from(new Set([...joinedIds, ...ownedIds]));

      if (allIds.length === 0) return [];

      const { data: projects, error } = await supabase.from('projects')
        .select(`
          *,
          project_members (*, users (*)),
          project_applications (*, users (*))
        `)
        .in('id', allIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uniqueProjects = [];
      const seenTitles = new Set();
      for (const p of projects) {
        if (!seenTitles.has(p.title)) {
          seenTitles.add(p.title);
          uniqueProjects.push(p);
        }
      }

      return uniqueProjects.map(p => ({
        ...p,
        desc: p.description,
        team: { current: p.project_members?.length || 1, total: p.team_total || 5 },
        teamMembers: (p.project_members || []).map(m => ({
          ...m,
          name: m.users?.name || 'Builder',
          email: m.users?.email || '',
          reputation: m.users?.reputation || 10,
          skills: m.users?.skills || [],
          role: m.role === 'owner' ? 'Owner' : 'Builder',
          activity: 'High',
          contributions: 0
        })),
        applications: (p.project_applications || []).map(app => ({
          ...app,
          email: app.users?.email || app.email,
          name: app.users?.name || app.name,
          reputation: app.users?.reputation || 10,
          skills: app.users?.skills || []
        })),
        author: p.author || p.owner_email,
        ownerId: p.owner_id,
        ownerEmail: p.owner_email
      }));
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // Advanced Proposal & Submission APIs
  saveProblem: async (projectId) => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return false;
    try {
      const { error } = await supabase.from('saved_projects').insert({
        user_id: session.id,
        project_id: projectId
      });
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  getSavedProblems: async () => {
    const session = userService.getCurrentUser();
    if (!session || !session.id) return [];
    try {
      const { data, error } = await supabase.from('saved_projects')
        .select('*, projects(*)')
        .eq('user_id', session.id);
      if (error) throw error;
      return data ? data.map(d => d.projects) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  joinTeam: async (projectId) => {
    // Legacy direct join stub, mapped to apply
    return userService.applyToJoin(projectId, { motivation: 'I would like to join this team.', portfolio: '' });
  },
  submitProposal: async (projectId, proposalData) => {
    return userService.applyToJoin(projectId, proposalData);
  },
  getSubmissions: async (projectId) => {
    try {
      const { data, error } = await supabase.from('project_applications')
        .select('*, users(*)')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  // Notifications System (Backend persistent)
  addNotification: async (userId, notificationData) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        link: notificationData.link || null
      });
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  getNotifications: async (userId) => {
    if (!userId) return [];
    try {
      const { data, error } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  markNotificationsRead: async (userId) => {
    if (!userId) return false;
    try {
      const { error } = await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Workspace Collaboration APIs
  getTasks: async (projectId) => {
    try {
      const { data, error } = await supabase.from('workspace_tasks').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  saveTask: async (taskData) => {
    try {
      if (taskData.id) {
        // Update
        const { id, ...updateData } = taskData;
        const { error } = await supabase.from('workspace_tasks').update(updateData).eq('id', id);
        return !error;
      } else {
        // Insert
        const { error } = await supabase.from('workspace_tasks').insert(taskData);
        return !error;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  deleteTask: async (taskId) => {
    try {
      const { error } = await supabase.from('workspace_tasks').delete().eq('id', taskId);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  getChatMessages: async (projectId) => {
    try {
      const { data, error } = await supabase.from('workspace_chat_messages').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  sendChatMessage: async (messageData) => {
    try {
      const { error } = await supabase.from('workspace_chat_messages').insert(messageData);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  getDocuments: async (projectId) => {
    try {
      const { data, error } = await supabase.from('workspace_documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  uploadDocument: async (docData) => {
    try {
      const { error } = await supabase.from('workspace_documents').insert(docData);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  deleteDocument: async (docId) => {
    try {
      const { error } = await supabase.from('workspace_documents').delete().eq('id', docId);
      return !error;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
};
