import { problems } from './problems';

const OLD_USERS_KEY = 'cocreatex_users_list';
const OLD_SESSION_KEY = 'cocreatex_current_session';
const OLD_PROBLEMS_KEY = 'cocreatex_global_problems';

const USERS_KEY = 'collabnest_users_list';
const SESSION_KEY = 'collabnest_current_session';
const PROBLEMS_KEY = 'collabnest_global_problems';

const getLocalStorageWithFallback = (newKey, oldKey) => {
  const newVal = localStorage.getItem(newKey);
  if (newVal) return newVal;
  const oldVal = localStorage.getItem(oldKey);
  if (oldVal) {
    localStorage.setItem(newKey, oldVal);
    return oldVal;
  }
  return null;
};

const getAllUsers = () => {
  const stored = getLocalStorageWithFallback(USERS_KEY, OLD_USERS_KEY);
  return stored ? JSON.parse(stored) : {};
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const getCurrentSession = () => {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) return JSON.parse(stored);
  
  // Fallback to check localStorage once, then migrate to sessionStorage
  const localStored = getLocalStorageWithFallback(SESSION_KEY, OLD_SESSION_KEY);
  if (localStored) {
    sessionStorage.setItem(SESSION_KEY, localStored);
    return JSON.parse(localStored);
  }
  return null;
};

const saveSession = (user) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  // Remove from localStorage to enforce tab-specific sessions moving forward
  localStorage.removeItem(SESSION_KEY);
};

const getGlobalProblems = () => {
  const stored = getLocalStorageWithFallback(PROBLEMS_KEY, OLD_PROBLEMS_KEY);
  const userProblems = stored ? JSON.parse(stored) : [];
  
  // Combine static and dynamic problems, ensuring no duplicates by ID
  const allMap = new Map();
  problems.forEach(p => allMap.set(String(p.id), p));
  userProblems.forEach(p => allMap.set(String(p.id), p));
  
  return Array.from(allMap.values());
};

const areEmailsSimilar = (e1, e2) => {
  if (!e1 || !e2) return false;
  const clean = (e) => e.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  const c1 = clean(e1.split('@')[0]);
  const c2 = clean(e2.split('@')[0]);
  return c1 === c2 || c1.includes(c2) || c2.includes(c1);
};

export const userService = {
  areEmailsSimilar,
  getAllUsers,

  // Auth
  registerOrLogin: (userData) => {
    const users = getAllUsers();
    const email = userData.email.toLowerCase().trim();
    
    // Claim any Guest/unauthored problems posted on this local machine
    const stored = localStorage.getItem(PROBLEMS_KEY);
    if (stored) {
      try {
        const userProblems = JSON.parse(stored);
        let updated = false;
        userProblems.forEach(p => {
          if (!p.author || p.author === 'Guest') {
            p.author = email;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(PROBLEMS_KEY, JSON.stringify(userProblems));
        }
      } catch (e) {
        console.error("Error claiming guest problems:", e);
      }
    }

    if (users[email]) {
      // User exists, save their email in session
      // If they have posted problems (with typo-tolerant check), set/upgrade role to 'owner'
      const storedProblems = getGlobalProblems();
      const hasPosted = storedProblems.some(p => p.author && areEmailsSimilar(p.author, email));
      
      // Update any incoming profile/onboarding fields dynamically
      if (userData.name) users[email].name = userData.name.trim();
      if (userData.role) users[email].role = userData.role;
      if (userData.skills) users[email].skills = userData.skills;
      if (userData.expertise) users[email].expertise = userData.expertise;
      if (userData.experience) users[email].experience = userData.experience;
      if (userData.commitment) users[email].commitment = userData.commitment;
      
      if (hasPosted) {
        users[email].role = 'owner';
      }
      saveUsers(users);
      saveSession({ email });
      return users[email];
    } else {
      // New user - starts fresh so they can test joining/submitting
      const newUser = {
        ...userData,
        name: userData.name ? userData.name.trim() : '',
        email,
        joined: [], 
        saved: [], 
        submissions: [], 
        reputation: 30
      };
      // Check if they already posted problems under similar email
      const storedProblems = getGlobalProblems();
      const hasPosted = storedProblems.some(p => p.author && areEmailsSimilar(p.author, email));
      if (hasPosted || userData.role === 'owner') {
        newUser.role = 'owner';
      }
      users[email] = newUser;
      saveUsers(users);
      saveSession({ email });
      return newUser;
    }
  },

  getCurrentUser: () => {
    const session = getCurrentSession();
    if (!session) return null;
    const users = getAllUsers();
    return session.email ? users[session.email.toLowerCase().trim()] || null : null;
  },

  updateProfile: (email, profileData) => {
    if (!email) return null;
    const users = getAllUsers();
    const cleanEmail = email.toLowerCase().trim();
    if (users[cleanEmail]) {
      users[cleanEmail] = {
        ...users[cleanEmail],
        ...profileData
      };
      saveUsers(users);
      return users[cleanEmail];
    }
    return null;
  },

  getUserNameByEmail: (email) => {
    if (!email) return "Anu";
    const users = getAllUsers();
    const cleanEmail = email.toLowerCase().trim();
    if (users[cleanEmail] && users[cleanEmail].name) {
      return users[cleanEmail].name;
    }
    // Fallback: search for similar emails or capitalize the name part of the email
    const matchedKey = Object.keys(users).find(k => areEmailsSimilar(k, cleanEmail));
    if (matchedKey && users[matchedKey].name) {
      return users[matchedKey].name;
    }
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(OLD_SESSION_KEY);
  },

  // Problem Management
  getAllProblems: () => getGlobalProblems(),

  addProblem: (newProblem) => {
    const session = getCurrentSession();
    const stored = getLocalStorageWithFallback(PROBLEMS_KEY, OLD_PROBLEMS_KEY);
    const userProblems = stored ? JSON.parse(stored) : [];
    const problemId = Date.now();
    
    const problemWithId = {
      ...newProblem,
      id: problemId,
      team: { current: 1, total: 5 },
      status: 'Ideation',
      author: session?.email || 'Guest'
    };
    
    userProblems.push(problemWithId);
    localStorage.setItem(PROBLEMS_KEY, JSON.stringify(userProblems));

    // Automatically join and submit the creator's problem
    if (session) {
      const users = getAllUsers();
      const user = users[session.email];
      if (user) {
        if (!user.joined) user.joined = [];
        if (!user.submissions) user.submissions = [];
        
        if (!user.joined.includes(problemId)) {
          user.joined.push(problemId);
        }
        if (!user.submissions.includes(problemId)) {
          user.submissions.push(problemId);
        }
        user.reputation = (user.reputation || 0) + 20; // Extra XP for posting
        saveUsers(users);
      }
    }
    
    return problemWithId;
  },

  deleteProblem: (problemId) => {
    const session = getCurrentSession();
    if (!session) return;
    
    // Remove from global list
    let allProblems = getGlobalProblems();
    allProblems = allProblems.filter(p => String(p.id) !== String(problemId));
    localStorage.setItem(PROBLEMS_KEY, JSON.stringify(allProblems));

    // Remove from all users' private lists
    const users = getAllUsers();
    Object.keys(users).forEach(email => {
      const u = users[email];
      if (u.joined) u.joined = u.joined.filter(id => String(id) !== String(problemId));
      if (u.saved) u.saved = u.saved.filter(id => String(id) !== String(problemId));
      if (u.submissions) u.submissions = u.submissions.filter(id => String(id) !== String(problemId));
    });
    saveUsers(users);
  },

  // Actions
  joinTeam: (problemId) => {
    const session = getCurrentSession();
    if (!session) return;
    
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return;
    
    if (!user.joined) user.joined = [];
    if (!user.submissions) user.submissions = [];
    
    const joinedExists = user.joined.some(id => String(id) === String(problemId));
    if (!joinedExists) {
      user.joined.push(problemId);
      user.reputation = (user.reputation || 0) + 10;
    }

    const subExists = user.submissions.some(id => String(id) === String(problemId));
    if (!subExists) {
      user.submissions.push(problemId);
    }
    
    saveUsers(users);
  },

  saveProblem: (problemId) => {
    const session = getCurrentSession();
    if (!session) return;
    
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return;
    
    if (!user.saved) user.saved = [];
    
    const savedExists = user.saved.some(id => String(id) === String(problemId));
    if (!savedExists) {
      user.saved.push(problemId);
    } else {
      user.saved = user.saved.filter(id => String(id) !== String(problemId));
    }
    saveUsers(users);
  },

  submitProposal: (problemId) => {
    const session = getCurrentSession();
    if (!session) return;
    
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return;
    
    if (!user.submissions) user.submissions = [];
    
    const exists = user.submissions.some(id => String(id) === String(problemId));
    if (!exists) {
      user.submissions.push(problemId);
      saveUsers(users);
    }
  },

  // Getters
  getJoinedProblems: () => {
    const session = getCurrentSession();
    if (!session) return [];
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return [];
    
    const all = getGlobalProblems();
    return all.filter(p => (user.joined || []).some(id => String(id) === String(p.id)) || (p.author && areEmailsSimilar(p.author, session.email)));
  },

  getSavedProblems: () => {
    const session = getCurrentSession();
    if (!session) return [];
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return [];
    
    const all = getGlobalProblems();
    return all.filter(p => (user.saved || []).some(id => String(id) === String(p.id)));
  },

  getSubmissions: () => {
    const session = getCurrentSession();
    if (!session) return [];
    const users = getAllUsers();
    const user = users[session.email];
    if (!user) return [];
    
    const all = getGlobalProblems();
    return all.filter(p => (user.submissions || []).some(id => String(id) === String(p.id)) || (p.author && areEmailsSimilar(p.author, session.email)));
  },

  getApplicantsForProblem: (problemId) => {
    const users = getAllUsers();
    const applicants = [];
    
    // Get the target problem to compare titles
    const allProblems = getGlobalProblems();
    const targetProblem = allProblems.find(p => String(p.id) === String(problemId));
    const targetTitle = targetProblem ? targetProblem.title.toLowerCase().trim() : '';
    const authorEmail = targetProblem && targetProblem.author ? targetProblem.author.toLowerCase().trim() : '';

    Object.keys(users).forEach(email => {
      const cleanEmail = email.toLowerCase().trim();
      // If the user is the author of this problem, they should NOT be in the applicants list
      if (authorEmail && (cleanEmail === authorEmail || areEmailsSimilar(cleanEmail, authorEmail))) {
        return;
      }

      if (users[email].submissions) {
        const hasMatch = users[email].submissions.some(id => {
          if (String(id) === String(problemId)) return true;
          // Fallback: match by title to handle duplicate testing posts
          if (targetTitle) {
            const subProblem = allProblems.find(p => String(p.id) === String(id));
            if (subProblem && subProblem.title.toLowerCase().trim() === targetTitle) {
              return true;
            }
          }
          return false;
        });
        
        if (hasMatch) {
          applicants.push(users[email]);
        }
      }
    });
    return applicants;
  },

  updateProblem: (problemId, updatedFields) => {
    const stored = getLocalStorageWithFallback(PROBLEMS_KEY, OLD_PROBLEMS_KEY);
    const userProblems = stored ? JSON.parse(stored) : [];
    
    // Find if the problem already exists in userProblems
    const existingIndex = userProblems.findIndex(p => String(p.id) === String(problemId));
    
    if (existingIndex !== -1) {
      userProblems[existingIndex] = { ...userProblems[existingIndex], ...updatedFields };
    } else {
      // Find from static problems list
      const allProblems = getGlobalProblems();
      const staticProb = allProblems.find(p => String(p.id) === String(problemId));
      if (staticProb) {
        userProblems.push({ ...staticProb, ...updatedFields });
      }
    }
    
    localStorage.setItem(PROBLEMS_KEY, JSON.stringify(userProblems));
  }
};
