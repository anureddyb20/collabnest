/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layout, CheckSquare, MessageSquare, Files, Settings, 
  AlertCircle, Users, Activity, Flag, ChevronRight, Plus, CheckCircle, XCircle,
  Star, Award, Briefcase
} from 'lucide-react';
import { problems } from '../data/problems';
import { userService } from '../data/userService';
import { useView } from '../context/ViewContext';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';

const getChatsWithFallback = (problemId) => {
  const newKey = `collabnest_chats_${problemId}`;
  const oldKey = `cocreatex_chats_${problemId}`;
  const newVal = localStorage.getItem(newKey);
  if (newVal) return newVal;
  const oldVal = localStorage.getItem(oldKey);
  if (oldVal) {
    localStorage.setItem(newKey, oldVal);
    return oldVal;
  }
  return null;
};

const Workspace = () => {
  const { id } = useParams();
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [allWorkspaces, setAllWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      setIsLoading(true);
      const all = await userService.getAllProblems();
      let proj = all.find(p => String(p.id) === String(id));
      if (!proj) {
        proj = problems.find(p => String(p.id) === String(id)) || problems[0];
        const storageKey = `collabnest_local_project_${proj.id}`;
        const localDataStr = localStorage.getItem(storageKey);
        if (localDataStr) {
          proj = { ...proj, ...JSON.parse(localDataStr) };
        }
      }
      const workspaces = await userService.getJoinedProblems();
      
      setSelectedProblem(proj);
      setAllWorkspaces(workspaces);
      setIsLoading(false);
    };
    fetchWorkspaceData();
  }, [id]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>Loading Workspace...</div>;
  }

  if (!selectedProblem) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>Workspace not found.</div>;
  }

  return <WorkspaceContent id={id} selectedProblem={selectedProblem} allWorkspaces={allWorkspaces} />;
};

const WorkspaceContent = ({ id, selectedProblem, allWorkspaces }) => {
  const { isMobileView } = useView();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Post Another Idea Modal State
  const [showPostAnotherModal, setShowPostAnotherModal] = useState(false);
  const [newIdea, setNewIdea] = useState({ 
    title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
    expectedOutcome: '', projectGoals: '', teamSize: 5
  });
  
  const currentUser = userService.getCurrentUser();
  
  const isOwnerFn = (p) => {
    if (!currentUser) return false;
    return (
      (p.author && userService.areEmailsSimilar(p.author, currentUser.email)) ||
      (p.ownerEmail && userService.areEmailsSimilar(p.ownerEmail, currentUser.email)) ||
      (p.ownerId && String(p.ownerId) === String(currentUser.id))
    );
  };
  
  const ownedWorkspaces = allWorkspaces.filter(isOwnerFn).sort((a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime());
  const joinedWorkspaces = allWorkspaces.filter(p => !isOwnerFn(p)).sort((a, b) => new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime());
  const myWorkspaces = [...ownedWorkspaces, ...joinedWorkspaces];
  
  if (selectedProblem && !myWorkspaces.some(w => String(w.id) === String(selectedProblem.id))) {
    myWorkspaces.push(selectedProblem);
  }

  const isOwner = currentUser && selectedProblem && (
    (selectedProblem.ownerEmail && String(selectedProblem.ownerEmail).toLowerCase() === String(currentUser.email).toLowerCase()) ||
    (selectedProblem.ownerId && currentUser.id && String(selectedProblem.ownerId) === String(currentUser.id)) ||
    (selectedProblem.ownerId && userService.areEmailsSimilar(selectedProblem.ownerId, currentUser.email)) ||
    (selectedProblem.author && userService.areEmailsSimilar(selectedProblem.author, currentUser.email))
  );

  console.log("WORKSPACE DEBUG LOGS:");
  console.log("Current User:", currentUser?.name);
  console.log("Current User Email:", currentUser?.email);
  console.log("Project ID being opened:", id);
  console.log("Project Owner Email:", selectedProblem?.ownerEmail);
  console.log("Project Found:", !!selectedProblem);
  console.log("isOwner:", isOwner);

  const ownerName = selectedProblem.ownerName || (selectedProblem.author 
    ? String(selectedProblem.author).split('@')[0]
    : (currentUser?.role === 'owner' ? (currentUser?.name || "Anu") : "Anu"));

  // Helper to format event date based on creation timestamp (real-time scaling)
  const getDynamicEventDate = (offsetMinutes) => {
    if (selectedProblem.id > 1000000000000) {
      // It's a dynamic user project
      const createdTime = Number(selectedProblem.id);
      const eventTime = Math.max(createdTime, Date.now() - offsetMinutes * 60000);
      const diffMs = Date.now() - eventTime;
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    // Fallback for static mock projects
    if (offsetMinutes === 0) return "Just now";
    return `${offsetMinutes} days ago`;
  };

  const getAssigneeColor = (name) => {
    if (!name) return 'linear-gradient(135deg, var(--primary), var(--secondary))';
    const lowerName = String(name).toLowerCase().trim();
    let hash = 5381;
    for (let i = 0; i < lowerName.length; i++) {
      hash = ((hash << 5) + hash) + lowerName.charCodeAt(i);
    }
    const colors = [
      'linear-gradient(135deg, #4f46e5, #7c3aed)', // deep indigo to violet
      'linear-gradient(135deg, #6366f1, #a855f7)', // indigo to purple
      'linear-gradient(135deg, #3b82f6, #0ea5e9)', // blue to sky
      'linear-gradient(135deg, #8b5cf6, #d946ef)', // violet to fuchsia
      'linear-gradient(135deg, #0ea5e9, #06b6d4)', // sky to cyan
      'linear-gradient(135deg, #2563eb, #4f46e5)', // deep blue to indigo
      'linear-gradient(135deg, #7c3aed, #c026d3)', // violet to fuchsia
      'linear-gradient(135deg, #0284c7, #2563eb)', // light blue to deep blue
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  // 1. Milestones & Progress State
  const stages = ['Idea', 'Validation', 'Prototype', 'MVP', 'Launch'];
  const [stageIndex, setStageIndex] = useState(2); // Prototype by default
  const progress = (stageIndex + 1) * 20;

  // 2. Team State
  const [team, setTeam] = useState([
    { name: "Anu", role: "Product Owner", activity: "High", contributions: 10 },
    { name: "Alex", role: "UI Designer", activity: "High", contributions: 12 },
  ]);

  // Dynamic missing roles based on team (matching by role or skills)
  const requiredSkills = selectedProblem.skills || [];
  const missingRoles = requiredSkills.filter(skill => {
    const skillLower = skill.toLowerCase();
    const isCovered = team.some(member => {
      const memberRoleLower = (member.role || '').toLowerCase();
      // 1. Direct role match or partial containment (e.g., 'React Dev' matches 'React')
      if (memberRoleLower.includes(skillLower) || skillLower.includes(memberRoleLower)) {
        return true;
      }
      // 2. Skill match in their skills array if they have one
      if (member.skills && Array.isArray(member.skills)) {
        return member.skills.some(s => (s || '').toLowerCase().includes(skillLower) || skillLower.includes((s || '').toLowerCase()));
      }
      return false;
    });
    return !isCovered;
  });

  // 3. Applicants State (load real applicants or mock one)
  const [localApplicants, setLocalApplicants] = useState([]);

  // 4. Tasks Board State
  const [tasks, setTasks] = useState({
    todo: [],
    doing: [],
    done: []
  });
  const [activeInputColumn, setActiveInputColumn] = useState(null);
  const [inlineTaskText, setInlineTaskText] = useState('');

  // 5. Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: "Anu", text: "Hey team! Let's get started on the prototype.", time: "10:30 AM" },
    { sender: "Alex", text: "Working on the design mockups now.", time: "10:32 AM" }
  ]);
  const [chatInput, setChatInput] = useState('');

  // 6. Recruit Candidates State
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [invitedCandidates, setInvitedCandidates] = useState([]);

  // 7. Docs State
  const [docsList, setDocsList] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('PDF');
  const [selectedFile, setSelectedFile] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);

  // Persistence & Reject Modal states
  const [rejectedList, setRejectedList] = useState([]);
  const [contributionLogs, setContributionLogs] = useState([]);
  const [rejectingApplicant, setRejectingApplicant] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Member Profile overlay state
  const [selectedMemberProfile, setSelectedMemberProfile] = useState(null);

  // New states for interactive graph, user contributions, and task assignees
  const [hoveredGraphPoint, setHoveredGraphPoint] = useState(null);
  const [expandedMemberTasks, setExpandedMemberTasks] = useState(null);
  const [taskAssignee, setTaskAssignee] = useState('');

  const isTeamMember = isOwner || 
    (currentUser?.joined && currentUser.joined.some(id => String(id) === String(selectedProblem.id))) ||
    team.some(m => (m.email && currentUser?.email && String(m.email).toLowerCase() === String(currentUser.email).toLowerCase()) || (m.user_id && currentUser?.id && String(m.user_id) === String(currentUser.id))) ||
    (selectedProblem.teamMembers && selectedProblem.teamMembers.some(m => String(m.user_id) === String(currentUser?.id))) ||
    (selectedProblem.applications && selectedProblem.applications.some(a => String(a.applicant_id) === String(currentUser?.id) && a.status === 'Accepted'));

  useEffect(() => {
    const refreshData = async () => {
      // Reload problem from database to get latest accepted/rejected members
      const latestProblems = await userService.getAllProblems();
      let latestProblem = latestProblems.find(p => String(p.id) === String(id));
      if (!latestProblem) {
        latestProblem = problems.find(p => String(p.id) === String(id)) || problems[0];
        const storageKey = `collabnest_local_project_${latestProblem.id}`;
        const localDataStr = localStorage.getItem(storageKey);
        if (localDataStr) {
          latestProblem = { ...latestProblem, ...JSON.parse(localDataStr) };
        }
      }

      // Load applicants
      const allApps = latestProblem.applications || [];
      setLocalApplicants(allApps.filter(a => a.status === 'Pending'));
      
      let rawOwnerName = latestProblem.ownerName || (latestProblem.author 
        ? String(latestProblem.author).split('@')[0]
        : (currentUser?.role === 'owner' ? (currentUser?.name || "Anu") : "Anu"));
      const ownerName = typeof rawOwnerName === 'object' ? String(latestProblem.author || "Anu").split('@')[0] : rawOwnerName;

      // EMERGENCY SANITIZATION: Clean up poisoned local storage data caused by serialized Promises
      if (latestProblem.tasks) {
        Object.values(latestProblem.tasks).forEach(list => {
          if (Array.isArray(list)) {
            list.forEach(t => {
              if (t && typeof t.assignee === 'object') t.assignee = ownerName;
            });
          }
        });
      }
      if (latestProblem.docs) {
        if (Array.isArray(latestProblem.docs)) {
          latestProblem.docs.forEach(d => {
            if (d && typeof d.uploader === 'object') d.uploader = ownerName;
          });
        }
      }

      // Sync accepted and rejected members list dynamically
      const defaultTeam = [
        { name: ownerName, role: "Product Owner", activity: "High", contributions: 10 },
        { name: "Alex", role: "UI Designer", activity: "High", contributions: 12 },
      ];
      const additionalTeam = latestProblem.teamMembers ? latestProblem.teamMembers.filter(m => m.role !== 'Owner') : [];
      const initialTeam = [...defaultTeam, ...additionalTeam];
      
      setTeam(initialTeam);

      const initialRejected = allApps.filter(a => a.status === 'Rejected').map(a => ({
        name: a.name, email: a.email, role: a.skills?.[0] || 'Developer', reason: 'Rejected via dashboard'
      }));
      setRejectedList(initialRejected);

      const defaultLogs = [
        { text: "Alex Rivera joined the team as UI Designer", date: getDynamicEventDate(5) },
        { text: `${ownerName} created the project and posted requirements`, date: getDynamicEventDate(10) }
      ];
      const initialLogs = latestProblem.contributionsLogs ? [...defaultLogs, ...latestProblem.contributionsLogs] : defaultLogs;
      setContributionLogs(initialLogs);

      // Load stage index
      if (latestProblem.stageIndex !== undefined) {
        setStageIndex(latestProblem.stageIndex);
      } else {
        setStageIndex(2); // Prototype by default
      }

      // Load tasks
      let currentTasks = { todo: [], doing: [], done: [] };
      const isUUID = String(latestProblem.id).length > 20;

      if (isUUID) {
        const sbTasks = await userService.getTasks(latestProblem.id);
        if (sbTasks.length > 0) {
          sbTasks.forEach(t => {
            if (currentTasks[t.status]) {
              currentTasks[t.status].push({
                id: t.id,
                text: t.title,
                assignee: t.assigned_to_name || t.assigned_to || 'Builder',
                date: new Date(t.created_at).toLocaleDateString()
              });
            }
          });
        }
      }
      
      if (!isUUID || (currentTasks.todo.length === 0 && currentTasks.doing.length === 0 && currentTasks.done.length === 0)) {
        if (latestProblem.tasks && latestProblem.tasks.todo && latestProblem.tasks.doing && latestProblem.tasks.done) {
          currentTasks = latestProblem.tasks;
        } else {
          currentTasks = {
            todo: [
              { id: "def-todo-1", text: "Implement " + ((latestProblem.skills && latestProblem.skills[0]) || "Frontend"), assignee: "Alex", date: "Just now" },
              { id: "def-todo-2", text: "Research " + latestProblem.domain + " market", assignee: ownerName, date: "Just now" },
              ...(latestProblem.projectGoals ? [{ id: "def-todo-3", text: `Goal: ${latestProblem.projectGoals}`, assignee: ownerName, date: "Just now" }] : [])
            ],
            doing: [
              { id: "def-doing-1", text: "Architecture Setup", assignee: ownerName, date: "Just now" }
            ],
            done: [
              { id: "def-done-1", text: "Initial Ideation", assignee: "Alex", date: "Just now" },
              ...(latestProblem.expectedOutcome ? [{ id: "def-done-2", text: `Define outcome: ${latestProblem.expectedOutcome}`, assignee: ownerName, date: "Just now" }] : [])
            ]
          };
        }
      }
      setTasks(currentTasks);
      
      // Load docs
      if (isUUID) {
        const sbDocs = await userService.getDocuments(latestProblem.id);
        if (sbDocs.length > 0) {
          setDocsList(sbDocs.map(d => ({
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size + " Bytes",
            uploader: d.uploaded_by_name || 'Builder',
            date: new Date(d.created_at).toLocaleDateString(),
            content: d.content
          })));
        } else if (latestProblem.docs) {
          setDocsList(latestProblem.docs);
        } else {
          setDocsList([]);
        }
      } else {
        if (latestProblem.docs) {
          setDocsList(latestProblem.docs);
        } else {
          const safeTitle = (latestProblem.title || 'Project').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
          const mainSkill = (latestProblem.skills && latestProblem.skills[0]) ? latestProblem.skills[0].replace(/[^a-zA-Z0-9]/g, '') : "Prototype";
          const domainStr = latestProblem.domain ? latestProblem.domain.replace(/[^a-zA-Z0-9]/g, '') : "System";
          const defaultDocs = [
            { name: `${domainStr}_Architecture_Design.pdf`, type: "PDF", size: "2.4 MB", uploader: ownerName, date: getDynamicEventDate(5) },
            { name: `${safeTitle}_UI_Wireframes.fig`, type: "Figma", size: "12.8 MB", uploader: "Alex", date: getDynamicEventDate(2) },
            { name: `${mainSkill}_Implementation_Plan.docx`, type: "Word", size: "1.1 MB", uploader: ownerName, date: getDynamicEventDate(10) }
          ];
          setDocsList(defaultDocs);
        }
      }

      // Load chats
      if (isUUID) {
        const sbChats = await userService.getChatMessages(latestProblem.id);
        if (sbChats.length > 0) {
          setChatMessages(sbChats.map(c => ({
            id: c.id,
            sender: c.sender_name || 'Builder',
            text: c.message,
            time: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          })));
        } else {
          setChatMessages([]);
        }
      } else {
        const storedChats = getChatsWithFallback(latestProblem.id);
        if (storedChats) {
          let parsedChats = JSON.parse(storedChats);
          if (Array.isArray(parsedChats)) {
            parsedChats.forEach(c => {
              if (c && typeof c.sender === 'object') c.sender = ownerName;
            });
          }
          setChatMessages(parsedChats);
        } else {
          const defaultChats = [
            { sender: ownerName, text: `Hey team! Let's get started on the prototype for ${latestProblem.title}.`, time: "10:30 AM" },
            { sender: "Alex", text: "Working on the design mockups now.", time: "10:32 AM" }
          ];
          setChatMessages(defaultChats);
          localStorage.setItem(`collabnest_chats_${latestProblem.id}`, JSON.stringify(defaultChats));
        }
      }
    };

    // Run immediately
    refreshData();

    // Sync on window focus or storage updates to handle multi-tab testing!
    window.addEventListener('focus', refreshData);
    window.addEventListener('storage', refreshData);
    const interval = setInterval(refreshData, 2000);

    return () => {
      window.removeEventListener('focus', refreshData);
      window.removeEventListener('storage', refreshData);
      clearInterval(interval);
    };
  }, [id, selectedProblem.id, selectedProblem.title, JSON.stringify(selectedProblem.skills), selectedProblem.domain, currentUser?.email]);

  // Security Check: Redirect restricted users if they somehow access protected tabs
  useEffect(() => {
    if (!isTeamMember && (activeTab === 'chat' || activeTab === 'docs' || activeTab === 'applicants')) {
      setActiveTab('board');
    }
  }, [isTeamMember, activeTab]);

  const handleMemberClick = (member) => {
    const lowerName = (member.name || '').toLowerCase();
    let profileData = {};
    if (lowerName.includes('alex')) {
      profileData = {
        name: "Alex Rivera",
        role: "UI Designer & Developer",
        reputation: 1180,
        consistency: "96%",
        skills: ["Figma", "UI Design", "Visual Identity", "Prototyping", "TailwindCSS"],
        badges: ["Pixel Perfect", "Creative Mind", "MVP Shipper"],
        projects: [
          { title: "AI Radiologist Assistant", role: "UI Designer", status: "In Progress" },
          { title: "Eco-Tracker App", role: "UX Designer", status: "Completed" }
        ],
        reviews: [
          { from: "Anu", rating: 5, comment: "Incredible design eye and extremely fast iteration times!" },
          { from: "Sam", rating: 5, comment: "Brings designs to life flawlessly. A absolute joy to collaborate with." }
        ]
      };
    } else if (lowerName.includes('anu')) {
      profileData = {
        name: member.name,
        role: member.role || "Product Owner",
        reputation: 1520,
        consistency: "99%",
        skills: ["React", "Product Management", "UI/UX", "System Architecture", "TypeScript"],
        badges: ["Visionary", "Lead Organizer", "Top Collaborator"],
        projects: [
          { title: "Decentralized Carbon Marketplace", role: "Product Manager", status: "MVP Shipped" },
          { title: "Smart Crop Optimizer", role: "Product Owner", status: "In Progress" }
        ],
        reviews: [
          { from: "Alex", rating: 5, comment: "An outstanding product leader who keeps the team highly motivated!" },
          { from: "Diana", rating: 5, comment: "Crystal clear vision, exceptional engineering standards." }
        ]
      };
    } else {
      profileData = {
        name: member.name,
        role: member.role || "Contributor",
        reputation: 450,
        consistency: "94%",
        skills: ["React", "JavaScript", "HTML5", "CSS3", "Git"],
        badges: ["Fast Learner", "Problem Solver"],
        projects: [
          { title: "Portfolio Tracker", role: "Developer", status: "In Progress" }
        ],
        reviews: [
          { from: "Anu", rating: 5, comment: "Learns incredibly fast and takes initiative on tough tasks." }
        ]
      };
    }
    setSelectedMemberProfile(profileData);
  };

  const potentialInvites = [
    { name: "Sarah Connor", role: "Frontend Developer", match: "95%", skill: "Frontend" },
    { name: "John Doe", role: "Backend Developer", match: "90%", skill: "Backend" },
    { name: "Bruce Wayne", role: "AI/ML Expert", match: "98%", skill: "AI/ML" },
    { name: "Diana Prince", role: "UI/UX Designer", match: "96%", skill: "UI/UX" },
    { name: "Clark Kent", role: "App Developer", match: "92%", skill: "App Dev" }
  ].filter(inv => missingRoles.some(mr => mr.toLowerCase().includes(inv.skill.toLowerCase()) || inv.skill.toLowerCase().includes(mr.toLowerCase())) || true);

  // Handlers
  const handleAccept = async (app) => {
    const success = await userService.acceptApplicant(selectedProblem.id, app.email);
    if (!success) {
      showNotification("Error accepting applicant", "error");
      return;
    }
    
    const roleForApp = app.skills && app.skills.length > 0 ? app.skills[0] : "Developer";
    const newMember = {
      name: app.name || (app.email ? String(app.email).split('@')[0] : 'Applicant'),
      email: app.email,
      role: roleForApp,
      activity: "High",
      contributions: 0,
      skills: app.skills || []
    };
    
    setTeam([...team, newMember]);
    setLocalApplicants(localApplicants.filter(a => a.email !== app.email));
    
    const newLog = {
      text: `${newMember.name} joined the team as ${newMember.role}`,
      date: "Just now"
    };
    setContributionLogs([...contributionLogs, newLog]);
    
    // Save the log to problem for persistence
    const allProblems = await userService.getAllProblems();
    let currentProblem = allProblems.find(p => String(p.id) === String(selectedProblem.id));
    if (!currentProblem) {
      currentProblem = problems.find(p => String(p.id) === String(selectedProblem.id)) || problems[0];
      const storageKey = `collabnest_local_project_${currentProblem.id}`;
      const localDataStr = localStorage.getItem(storageKey);
      if (localDataStr) currentProblem = { ...currentProblem, ...JSON.parse(localDataStr) };
    }
    if (currentProblem) {
      const logs = currentProblem.contributionsLogs ? [...currentProblem.contributionsLogs, newLog] : [newLog];
      userService.updateProblem(selectedProblem.id, { contributionsLogs: logs });
    }
    
    showNotification(`${app.name || app.email} has been accepted into the team!`, "success");
  };

  const handleReject = (app) => {
    setRejectingApplicant(app);
    setRejectReasonInput('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingApplicant) return;
    
    const success = await userService.rejectApplicant(selectedProblem.id, rejectingApplicant.email);
    if (!success) {
      showNotification("Error rejecting applicant", "error");
      return;
    }

    const roleForApp = rejectingApplicant.skills && rejectingApplicant.skills.length > 0 ? rejectingApplicant.skills[0] : "Developer";
    
    const newRejected = {
      name: rejectingApplicant.name || (rejectingApplicant.email ? String(rejectingApplicant.email).split('@')[0] : 'Applicant'),
      email: rejectingApplicant.email,
      role: roleForApp,
      reason: rejectReasonInput.trim() || "Skills did not fit the current requirements",
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    };
    
    const updatedRejected = [...rejectedList, newRejected];
    setRejectedList(updatedRejected);
    
    // Filter out from active applicants
    setLocalApplicants(localApplicants.filter(a => a.email !== rejectingApplicant.email));
    
    showNotification(`Rejection confirmed for ${rejectingApplicant.name || rejectingApplicant.email}.`, "success");
    setRejectingApplicant(null);
  };

  const formatBytes = (bytes, decimals = 1) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const getCompletedTasksForMember = (memberName) => {
    const mockTasks = {
      "Anu": [
        "Setup workspace repository",
        "Draft product requirement document",
        "Conduct user interviews",
        "Create landing page skeleton",
        "Configure deployment pipelines",
        "Configure AWS server",
        "Integrate user authentication",
        "Design database schema",
        "Review security audit report",
        "Define milestone stages"
      ],
      "Alex": [
        "Create high-fidelity Figma mockups",
        "Define typography and color palette",
        "Create interactive prototypes",
        "Refine mobile responsive layouts",
        "Design brand logos and assets",
        "Create style guide and UI components",
        "Conduct UX usability testing",
        "Draft onboarding user flow",
        "Design workspace dashboard interface",
        "Implement dark mode theme CSS",
        "Optimize visual asset sizes",
        "Conduct design alignment review"
      ]
    };

    const nameKey = Object.keys(mockTasks).find(k => k.toLowerCase() === (memberName || '').toLowerCase());
    const defaults = nameKey ? mockTasks[nameKey] : [];

    // Gather dynamic completed tasks assigned to this member from the "done" column
    const dynamicDone = (tasks.done || [])
      .filter(t => {
        const assignee = typeof t === 'string' ? 'Anu' : (t.assignee || 'Anu');
        return (assignee || '').toLowerCase() === (memberName || '').toLowerCase();
      })
      .map(t => typeof t === 'string' ? t : t.text);

    return [...defaults, ...dynamicDone];
  };

  const getTasksForGraph = () => {
    // Get list of actual team member names
    const memberNames = team.map(m => m.name);
    // Helper to get an assignee that exists in the team (fallback to ownerName or team[0].name)
    const getValidAssignee = (preferred) => {
      const matched = memberNames.find(n => (n || '').toLowerCase() === (preferred || '').toLowerCase());
      if (matched) return matched;
      return ownerName || (team[0] ? team[0].name : 'Anu');
    };

    // Start with default completed tasks distributed among different team members
    const pts = [
      { id: "p1", task: "Project Proposal", assignee: getValidAssignee("Anu"), date: getDynamicEventDate(10), val: 10 },
      { id: "p2", task: "System Architecture", assignee: memberNames[2] || getValidAssignee("Anu"), date: getDynamicEventDate(5), val: 25 },
      { id: "p3", task: "UI Wireframes v2", assignee: getValidAssignee("Alex"), date: getDynamicEventDate(2), val: 50 },
      { id: "p4", task: "Database Design", assignee: memberNames[3] || getValidAssignee("Anu"), date: getDynamicEventDate(2), val: 65 },
      { id: "p5", task: "Initial Ideation", assignee: memberNames[4] || getValidAssignee("Anu"), date: getDynamicEventDate(1), val: 80 }
    ];

    // Add tasks in the done column
    let count = 5;
    (tasks.done || []).forEach(t => {
      const taskText = typeof t === 'string' ? t : t.text;
      const taskAssigneeName = typeof t === 'string' ? 'Anu' : (t.assignee || 'Anu');
      count++;
      pts.push({
        id: typeof t === 'string' ? `done-${count}` : (t.id || `done-${count}`),
        task: taskText,
        assignee: taskAssigneeName,
        date: "Just now",
        val: Math.min(80 + (count - 5) * 4, 100)
      });
    });

    return pts;
  };

  const handleAddTask = async (column) => {
    if (!inlineTaskText.trim()) return;
    const assigneeName = taskAssignee || (team[0] ? team[0].name : 'Anu');
    
    // Optimistic UI update
    const uiTaskId = Date.now().toString();
    const newTask = {
      id: uiTaskId,
      text: inlineTaskText.trim(),
      assignee: assigneeName,
      date: 'Just now'
    };
    
    const updatedTasks = {
      ...tasks,
      [column]: [...(tasks[column] || []), newTask]
    };
    setTasks(updatedTasks);
    
    setInlineTaskText('');
    setTaskAssignee('');
    setActiveInputColumn(null);

    const isUUID = String(selectedProblem.id).length > 20;
    if (isUUID) {
      await userService.saveTask({
        project_id: selectedProblem.id,
        title: newTask.text,
        status: column,
        created_by: currentUser?.id,
        assigned_to_name: assigneeName // Custom field to track name for now
      });
      // A refresh will be triggered by polling, or we could fetch directly.
    } else {
      userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
    }
  };

  const handleMoveTask = async (taskTextOrObj, fromStatus, toStatus) => {
    const taskId = typeof taskTextOrObj === 'string' ? taskTextOrObj : taskTextOrObj.id;
    
    const taskToMove = (tasks[fromStatus] || []).find(t => {
      const id = typeof t === 'string' ? t : t.id;
      return id === taskId;
    });
    if (!taskToMove) return;

    const fromTasks = (tasks[fromStatus] || []).filter(t => {
      const id = typeof t === 'string' ? t : t.id;
      return id !== taskId;
    });
    const toTasks = [...(tasks[toStatus] || []), taskToMove];

    const updatedTasks = {
      ...tasks,
      [fromStatus]: fromTasks,
      [toStatus]: toTasks
    };
    setTasks(updatedTasks);
    
    const isUUID = String(selectedProblem.id).length > 20;
    if (isUUID && taskId && taskId.length > 20) {
      await userService.saveTask({
        id: taskId,
        status: toStatus
      });
    } else {
      userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
    }
  };

  const handleDeleteTask = async (taskTextOrObj, fromStatus) => {
    const taskId = typeof taskTextOrObj === 'string' ? taskTextOrObj : taskTextOrObj.id;
    const updatedTasks = {
      ...tasks,
      [fromStatus]: (tasks[fromStatus] || []).filter(t => {
        const id = typeof t === 'string' ? t : t.id;
        return id !== taskId;
      })
    };
    setTasks(updatedTasks);

    const isUUID = String(selectedProblem.id).length > 20;
    if (isUUID && taskId && taskId.length > 20) {
      await userService.deleteTask(taskId);
    } else {
      userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
    }
  };

  const handleDragStart = (e, taskTextOrObj, fromStatus) => {
    const taskId = typeof taskTextOrObj === 'string' ? taskTextOrObj : taskTextOrObj.id;
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.setData("fromStatus", fromStatus);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, toStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const fromStatus = e.dataTransfer.getData("fromStatus");
    if (!taskId || !fromStatus || fromStatus === toStatus) return;

    const taskToMove = (tasks[fromStatus] || []).find(t => {
      const id = typeof t === 'string' ? t : t.id;
      return id === taskId;
    });
    if (!taskToMove) return;

    handleMoveTask(taskToMove, fromStatus, toStatus);
  };

  const handleDownload = (doc) => {
    if (doc.content) {
      // It's a real file upload saved as a Data URL
      const a = document.createElement('a');
      a.href = doc.content;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Create a mock download
      const content = `<!DOCTYPE html>
<html>
<head>
  <title>${doc.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f8fafc; color: #0f172a; line-height: 1.6; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); max-width: 600px; margin: 0 auto; }
    h1 { color: #4f46e5; font-size: 24px; margin-top: 0; word-break: break-all; margin-bottom: 8px; }
    .meta { color: #64748b; margin-bottom: 24px; font-size: 14px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
    .footer { margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${doc.name}</h1>
    <div class="meta">
      <strong>Type:</strong> ${doc.type} &nbsp;|&nbsp; 
      <strong>Uploaded by:</strong> ${doc.uploader} &nbsp;|&nbsp; 
      <strong>Date:</strong> ${doc.date} &nbsp;|&nbsp; 
      <strong>Size:</strong> ${doc.size}
    </div>
    <p style="background: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 24px;">
      <strong>About this File:</strong> This is a placeholder <em>${doc.type}</em> document for the <strong>${selectedProblem.title}</strong> project.
    </p>

    <h2 style="font-size: 18px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px;">Project Overview</h2>
    <p><strong>Domain:</strong> ${selectedProblem.domain || 'N/A'} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Difficulty:</strong> ${selectedProblem.difficulty || 'N/A'}</p>
    <p><strong>Description:</strong> ${selectedProblem.desc || 'No description provided.'}</p>
    
    <h2 style="font-size: 18px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 32px;">Technical Requirements</h2>
    <p><strong>Core Skills Needed:</strong> ${(selectedProblem.skills || []).join(', ') || 'None specified'}</p>
    
    <div class="footer">Generated by CollabNest Workspace</div>
  </div>
</body>
</html>`;
      let blob = new Blob([content], { type: 'text/html' });
      // Always download as HTML so the browser renders the rich details securely
      let downloadName = doc.name.replace(/\.[^/.]+$/, "") + ".html";
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenFile = (doc) => {
    if (doc.content) {
      try {
        const parts = doc.content.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch (err) {
        window.open(doc.content, '_blank');
      }
    } else {
      const content = `Mock document content for: ${doc.name}\nType: ${doc.type}\nUploaded by: ${doc.uploader}\nDate: ${doc.date}\nSize: ${doc.size}\nCollabNest - Collaboration Space.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleDeleteFile = (docName) => {
    setDocToDelete(docName);
  };

  const confirmDeleteFile = async () => {
    if (docToDelete) {
      const docObj = docsList.find(d => d.name === docToDelete);
      const updatedDocs = docsList.filter(d => d.name !== docToDelete);
      setDocsList(updatedDocs);
      
      const isUUID = String(selectedProblem.id).length > 20;
      if (isUUID && docObj && docObj.id) {
        await userService.deleteDocument(docObj.id);
      } else {
        userService.updateProblem(selectedProblem.id, { docs: updatedDocs });
      }
      
      showNotification(`Deleted ${docToDelete}`, "success");
      setDocToDelete(null);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const isUUID = String(selectedProblem.id).length > 20;
    const msgText = chatInput.trim();
    
    const newMessage = {
      sender: currentUser?.name || "You",
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedChats = [...chatMessages, newMessage];
    setChatMessages(updatedChats);
    setChatInput('');

    if (isUUID) {
      await userService.sendChatMessage({
        project_id: selectedProblem.id,
        sender_id: currentUser?.id,
        sender_name: currentUser?.name || "You",
        message: msgText
      });
    } else {
      localStorage.setItem(`collabnest_chats_${id}`, JSON.stringify(updatedChats));
    }
  };

  const handleInvite = (candidate) => {
    setInvitedCandidates([...invitedCandidates, candidate.name]);
    
    // Create new team member object dynamically
    const newMember = {
      name: candidate.name,
      role: candidate.role,
      activity: "High",
      contributions: 0,
      skills: [candidate.skill]
    };
    
    const updatedTeam = [...team, newMember];
    setTeam(updatedTeam);
    
    // Save to the problem's acceptedMembers so it persists on reload!
    const acceptedOnly = selectedProblem.acceptedMembers ? [...selectedProblem.acceptedMembers, newMember] : [newMember];
    
    const newLog = {
      text: `${candidate.name} joined the team as ${candidate.role} via direct recruitment`,
      date: "Just now"
    };
    const updatedLogs = selectedProblem.contributionsLogs ? [...selectedProblem.contributionsLogs, newLog] : [newLog];
    setContributionLogs([...contributionLogs, newLog]);
    
    userService.updateProblem(selectedProblem.id, {
      acceptedMembers: acceptedOnly,
      contributionsLogs: updatedLogs
    });

    showNotification(`${candidate.name} has accepted your invitation and joined the team!`, "success");
  };

  return (
    <div className="container" style={{ padding: isMobileView ? '16px 0' : '40px 0' }}>
      <div style={{ marginBottom: '32px', padding: isMobileView ? '0 16px' : '0' }}>
        <h1 style={{ fontSize: isMobileView ? '24px' : '32px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Workspace
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobileView ? '14px' : '15px' }}>
          Collaborate with your team, manage tasks and track project progress.
        </p>
      </div>

      {/* Project Header */}
      <div className="glass-panel" style={{ padding: isMobileView ? '16px' : '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: isMobileView ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'flex-end', marginBottom: '24px', gap: isMobileView ? '16px' : '0' }}>
          <div style={{ width: isMobileView ? '100%' : 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: isMobileView ? '20px' : '32px', fontWeight: 800 }}>{selectedProblem.title}</h1>
              {myWorkspaces.length > 1 && (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px', borderColor: 'var(--border)', color: 'var(--text-main)', background: 'rgba(255,255,255,0.05)' }}
                >
                  <Briefcase size={14} /> Switch Project
                </button>
              )}
              <button 
                onClick={() => navigate('/workspace')}
                className="btn-ghost" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '6px 12px', color: 'var(--text-muted)' }}
              >
                Dashboard
              </button>
              <span className="badge badge-primary">{stages[stageIndex]}</span>
              {isOwner && (
                <button 
                  onClick={() => setShowPostAnotherModal(true)}
                  className="btn-outline" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px', marginLeft: '12px', borderColor: 'var(--secondary)', color: 'var(--secondary)' }}
                >
                  <Plus size={14} /> Post Another Idea
                </button>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '13px' }}>{selectedProblem.desc}</p>
            {(selectedProblem.projectGoals || selectedProblem.expectedOutcome) && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                {selectedProblem.projectGoals && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Goals</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{selectedProblem.projectGoals}</div>
                  </div>
                )}
                {selectedProblem.expectedOutcome && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expected Outcome</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{selectedProblem.expectedOutcome}</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign: isMobileView ? 'left' : 'right', width: isMobileView ? '100%' : 'auto' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Project Progress</div>
            <div style={{ width: isMobileView ? '100%' : '200px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                style={{ height: '100%', background: 'var(--primary)' }}
              />
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{progress}% Complete</div>
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
          <div style={{ position: 'absolute', top: '12px', left: '40px', right: '40px', height: '2px', background: 'var(--border)', zIndex: 0 }} />
          {stages.map((m, i) => {
            const isDone = i <= stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <div 
                key={m} 
                onClick={() => setStageIndex(i)}
                style={{ position: 'relative', zIndex: 1, textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  background: isCurrent ? 'var(--primary)' : isDone ? 'var(--secondary)' : 'var(--bg-main)',
                  border: `2px solid ${isDone ? 'var(--secondary)' : 'var(--border)'}`,
                  margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  {isDone && <CheckSquare size={12} color="white" />}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isCurrent ? 'white' : 'var(--text-dim)' }}>{m}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="workspace-layout" style={{ display: 'flex', gap: '32px' }}>
        {/* Sidebar: Team Health & Stats */}
        <aside className="workspace-sidebar" style={{ width: '280px', flexShrink: 0 }}>
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="var(--secondary)" />
              Team Health
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Current Members</div>
              {team.map(m => (
                <div 
                  key={m.name} 
                  onClick={() => handleMemberClick(m)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getAssigneeColor(m.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>{(m.name && m.name[0]) ? m.name[0].toUpperCase() : 'U'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{m.role}</div>
                  </div>
                  <div className={`badge ${m.activity === 'High' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.6rem' }}>{m.activity}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Missing Roles</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {missingRoles.length > 0 ? missingRoles.map(r => (
                  <span key={r} className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.65rem' }}>
                    {r}
                  </span>
                )) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Team Complete!</span>
                )}
              </div>
              {isOwner && (
                <button 
                  onClick={() => setShowRecruitModal(true)}
                  className="btn-outline" 
                  style={{ width: '100%', marginTop: '16px', fontSize: '0.8rem', padding: '8px' }}
                >
                  <Plus size={14} /> Recruit Members
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area: Kanban / Communication */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!isTeamMember ? (
            <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <AlertCircle size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <h3>Access Restricted</h3>
              <p>You must be accepted into the team by the owner to access the workspace tabs.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '8px' }}>
                <button 
                  onClick={() => setActiveTab('board')}
                  className={activeTab === 'board' ? 'btn-primary' : 'btn-outline'} 
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Layout size={16} /> Task Board
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={activeTab === 'chat' ? 'btn-primary' : 'btn-outline'} 
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <MessageSquare size={16} /> Team Chat
                </button>
                <button 
                  onClick={() => setActiveTab('contributions')}
                  className={activeTab === 'contributions' ? 'btn-primary' : 'btn-outline'} 
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Activity size={16} /> Contributions
                </button>
                {isOwner && (
                  <button 
                    onClick={() => setActiveTab('applicants')}
                    className={activeTab === 'applicants' ? 'btn-primary' : 'btn-outline'} 
                    style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                  >
                    <Users size={16} /> Applicants {localApplicants.length > 0 && <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '0.7rem', marginLeft: '4px' }}>{localApplicants.length}</span>}
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('docs')}
                  className={activeTab === 'docs' ? 'btn-primary' : 'btn-outline'} 
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Files size={16} /> Docs & Files
                </button>
                <button 
                  onClick={() => setActiveTab('graph')}
                  className={activeTab === 'graph' ? 'btn-primary' : 'btn-outline'} 
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  <Activity size={16} /> Progress Graph
                </button>
              </div>

              {activeTab === 'board' ? (
            <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(3, 1fr)', gap: '20px' }}>
              {['todo', 'doing', 'done'].map(status => (
                <div 
                  key={status} 
                  className="glass-card" 
                  style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', minHeight: '150px' }}
                  onDragOver={isOwner ? handleDragOver : undefined}
                  onDrop={isOwner ? (e) => handleDrop(e, status) : undefined}
                >
                  <h4 style={{ textTransform: 'capitalize', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                    {status}
                    <span style={{ background: 'var(--border)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{(tasks[status] || []).length}</span>
                  </h4>
                  {(tasks[status] || []).map(task => {
                    const taskText = typeof task === 'string' ? task : task.text;
                    const taskAssigneeName = typeof task === 'string' ? 'Anu' : (task.assignee || 'Anu');
                    return (
                      <div 
                        key={typeof task === 'string' ? task : task.id} 
                        className="glass-card" 
                        style={{ padding: '12px', marginBottom: '12px', fontSize: '0.85rem', cursor: isOwner ? 'grab' : 'default' }}
                        draggable={isOwner}
                        onDragStart={isOwner ? (e) => handleDragStart(e, task, status) : undefined}
                      >
                        <div style={{ marginBottom: '8px', wordBreak: 'break-word', fontWeight: 500 }}>{taskText}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: getAssigneeColor(taskAssigneeName), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600 }} title={`Assigned to ${taskAssigneeName}`}>
                              {(taskAssigneeName && taskAssigneeName[0]) ? taskAssigneeName[0].toUpperCase() : 'U'}
                            </div>
                            <select
                              value={taskAssigneeName}
                              disabled={!isOwner}
                              onChange={(e) => {
                                const newAssignee = e.target.value;
                                const updatedTasks = { ...tasks };
                                const taskIndex = (updatedTasks[status] || []).findIndex(t => {
                                  const id = typeof t === 'string' ? t : t.id;
                                  return id === (typeof task === 'string' ? task : task.id);
                                });
                                if (taskIndex !== -1) {
                                  const t = updatedTasks[status][taskIndex];
                                  if (typeof t === 'string') {
                                    updatedTasks[status][taskIndex] = {
                                      id: t,
                                      text: t,
                                      assignee: newAssignee,
                                      date: 'Just now'
                                    };
                                  } else {
                                    updatedTasks[status][taskIndex] = {
                                      ...t,
                                      assignee: newAssignee
                                    };
                                  }
                                  setTasks(updatedTasks);
                                  userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
                                }
                              }}
                              className="task-assignee-select"
                            >
                              {team.map(m => (
                                <option key={m.name} value={m.name} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {isOwner && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTask(task, status);
                              }} 
                              style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', color: '#f87171', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Delete task"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isOwner && (activeInputColumn === status ? (
                    <div style={{ marginTop: '8px' }}>
                      <input 
                        type="text" 
                        value={inlineTaskText}
                        onChange={(e) => setInlineTaskText(e.target.value)}
                        placeholder="Task name..."
                        autoFocus
                        style={{ 
                          width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                          borderRadius: '8px', padding: '8px', color: 'white', marginBottom: '8px', fontSize: '0.85rem'
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTask(status);
                        }}
                      />
                      
                      <div style={{ marginBottom: '8px' }}>
                        <select 
                          value={taskAssignee} 
                          onChange={(e) => setTaskAssignee(e.target.value)}
                          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', color: 'white', fontSize: '0.8rem' }}
                        >
                          <option value="">Assign To...</option>
                          {team.map(m => (
                            <option key={m.name} value={m.name}>{m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleAddTask(status)}>Add</button>
                        <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveInputColumn(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setActiveInputColumn(status);
                        setInlineTaskText('');
                        setTaskAssignee(team[0] ? team[0].name : 'Anu');
                      }}
                      style={{ width: '100%', padding: '8px', border: '1px dashed var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      + Add Task
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : activeTab === 'chat' ? (
            isTeamMember ? (
            <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatMessages.map((msg, i) => {
                  const isMe = msg.sender === (currentUser?.name || "You") || msg.sender === "You";
                  return (
                    <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', textAlign: isMe ? 'right' : 'left' }}>
                        <span 
                          onClick={() => handleMemberClick({ name: msg.sender })} 
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {msg.sender}
                        </span> • {msg.time}
                      </div>
                      <div style={{ 
                        background: isMe ? 'var(--primary)' : 'rgba(108, 99, 255, 0.05)',
                        border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 16px', fontSize: '0.9rem', 
                        color: isMe ? 'white' : 'var(--text-main)'
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSendMessage} style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  style={{ 
                    flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px', color: 'var(--text-main)'
                  }}
                />
                <button type="submit" className="btn-primary" style={{ padding: '0 24px' }}>Send</button>
              </form>
            </div>
            ) : (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <MessageSquare size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <h3>Access Restricted</h3>
                <p>You must join the project to access Team Chat.</p>
              </div>
            )
          ) : activeTab === 'contributions' ? (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: '32px' }}>
                <div>
                  <h3 style={{ marginBottom: '20px' }}>Team Output Tracking</h3>
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {team.map(m => {
                      const completedCount = getCompletedTasksForMember(m.name).length;
                      const isExpanded = expandedMemberTasks === m.name;
                      return (
                        <div 
                          key={m.name} 
                          className="glass-card" 
                          onClick={() => setExpandedMemberTasks(isExpanded ? null : m.name)}
                          style={{ 
                            padding: '16px', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s', 
                            border: isExpanded ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isExpanded ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white', fontWeight: 600 }}>{(m.name && m.name[0]) ? m.name[0].toUpperCase() : 'U'}</div>
                              <div>
                                <h4 style={{ fontSize: '1rem', margin: '0 0 4px 0' }}>{m.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({m.role})</span></h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Completed Tasks: {completedCount}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div className={`badge ${m.activity === 'High' ? 'badge-success' : 'badge-info'}`} style={{ marginBottom: '4px' }}>{m.activity || "High"} Activity</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to view tasks</div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px' }}>Tasks Completed by {m.name}:</div>
                              {completedCount > 0 ? (
                                <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                                  {getCompletedTasksForMember(m.name).map((t, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{t}</li>
                                  ))}
                                </ul>
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  No completed tasks yet. Assign tasks in the Task Board and move them to Done!
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 style={{ marginBottom: '20px' }}>Activity & Contribution Log</h3>
                  <div className="glass-card" style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gap: '16px', borderLeft: '2px solid var(--border)', paddingLeft: '16px' }}>
                      {contributionLogs.map((log, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-25px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />
                          <div style={{ fontSize: '0.9rem', color: 'white', fontWeight: 500 }}>{log.text}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{log.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'applicants' && isOwner ? (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
                {/* Left Side: Pending Applicants */}
                <div>
                  <h3 style={{ marginBottom: '20px' }}>Active Pending Applicants</h3>
                  {localApplicants.length > 0 ? (
                    <div style={{ display: 'grid', gap: '16px' }}>
                      {localApplicants.map(app => (
                        <div key={app.email} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontSize: '1rem', margin: '0 0 4px 0' }}>{app.name || app.email}</h4>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Reputation: {app.reputation} XP</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Interested</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-outline" 
                              style={{ borderColor: '#4ade80', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }} 
                              onClick={() => handleAccept(app)}
                            >
                              <CheckCircle size={16} /> Accept
                            </button>
                            <button 
                              className="btn-outline" 
                              style={{ borderColor: '#f87171', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }} 
                              onClick={() => handleReject(app)}
                            >
                              <XCircle size={16} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <Users size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                      <p>No active pending applicants.</p>
                    </div>
                  )}
                </div>

                {/* Right Side: Applicants History (Accepted & Rejected) */}
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                  <h3 style={{ marginBottom: '20px' }}>Application History</h3>
                  
                  {/* Accepted sub-list */}
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '12px' }}>Accepted Members</div>
                    {team.filter(m => m.name !== ownerName && !(m.name === 'Alex' && m.role === 'UI Designer')).length > 0 ? (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {team.filter(m => m.name !== ownerName && !(m.name === 'Alex' && m.role === 'UI Designer')).map(m => (
                          <div key={m.name} className="glass-card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{m.role}</div>
                            </div>
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Accepted</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None accepted yet.</div>
                    )}
                  </div>

                  {/* Rejected sub-list */}
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f87171', marginBottom: '12px' }}>Rejected Applicants</div>
                    {rejectedList.length > 0 ? (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {rejectedList.map(r => (
                          <div key={r.email} className="glass-card" style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.name}</span>
                              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.65rem' }}>Rejected</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px', marginTop: '4px', fontStyle: 'italic' }}>
                              Reason: {r.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>None rejected yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'docs' ? (
            isTeamMember ? (
            <div className="glass-panel" style={{ padding: '24px', position: 'relative', minHeight: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Project Docs & Assets</h3>
                <button 
                  onClick={() => {
                    setSelectedFile(null);
                    setNewDocName('');
                    setShowUploadModal(true);
                  }}
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <Plus size={16} /> Upload Document
                </button>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {docsList.map(doc => (
                  <div 
                    key={doc.name} 
                    className="glass-card doc-hover-card" 
                    style={{ 
                      padding: '16px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: isMobileView ? 'flex-start' : 'center', 
                      flexDirection: isMobileView ? 'column' : 'row',
                      gap: isMobileView ? '16px' : '0',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      overflow: 'hidden'
                    }} 
                    onClick={() => handleOpenFile(doc)}
                    title="Click to open file in a new tab"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: isMobileView ? '100%' : 'auto', overflow: 'hidden' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Files size={20} color="var(--primary)" />
                      </div>
                      <div style={{ overflow: 'hidden', width: '100%' }}>
                        <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', textDecoration: 'underline', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.type} • {doc.size} • Uploaded by {doc.uploader} • {doc.date}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn-outline" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleDownload(doc)}>
                        Download
                      </button>
                      <button 
                        className="btn-outline" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }} 
                        onClick={() => handleDeleteFile(doc.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showUploadModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(10px)', padding: '20px' }}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel"
                    style={{ padding: '24px', maxWidth: '400px', width: '100%' }}
                  >
                    <h3 style={{ marginBottom: '16px' }}>Upload Document</h3>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Choose File</label>
                      <input 
                        type="file" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setSelectedFile(file);
                            setNewDocName(file.name);
                            // Determine type based on extension
                            const ext = file.name.split('.').pop().toLowerCase();
                            if (ext === 'pdf') setNewDocType('PDF');
                            else if (ext === 'docx' || ext === 'doc') setNewDocType('Word');
                            else if (ext === 'fig') setNewDocType('Figma');
                            else if (ext === 'md') setNewDocType('Markdown');
                            else if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) setNewDocType('Image');
                            else setNewDocType('File');
                          }
                        }}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Document Name</label>
                      <input 
                        type="text" 
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        placeholder="e.g. Database_Schema.md"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'white' }}
                      />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Document Type</label>
                      <select 
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        className="custom-select"
                      >
                        {['PDF', 'Figma', 'Word', 'Markdown', 'Image', 'File'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button className="btn-ghost" onClick={() => setShowUploadModal(false)}>Cancel</button>
                      <button 
                        className="btn-primary" 
                        onClick={() => {
                          if (!newDocName.trim()) return;

                          const addDoc = async (contentDataUrl = null) => {
                            const newDoc = {
                              name: newDocName.trim(),
                              type: newDocType,
                              size: selectedFile ? selectedFile.size + " Bytes" : "1.2 MB",
                              uploader: currentUser?.name || "You",
                              date: "Just now",
                              content: contentDataUrl
                            };
                            
                            const isUUID = String(selectedProblem.id).length > 20;

                            const updatedDocs = [...docsList, newDoc];
                            setDocsList(updatedDocs);
                            
                            if (isUUID) {
                              await userService.uploadDocument({
                                project_id: selectedProblem.id,
                                name: newDoc.name,
                                type: newDoc.type,
                                size: selectedFile ? selectedFile.size : 1200000,
                                uploaded_by: currentUser?.id,
                                content: contentDataUrl
                              });
                            } else {
                              userService.updateProblem(selectedProblem.id, { docs: updatedDocs });
                            }
                            
                            setNewDocName('');
                            setSelectedFile(null);
                            setShowUploadModal(false);
                            showNotification(`${newDocName} successfully uploaded to workspace!`, "success");
                          };

                          if (selectedFile) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              addDoc(event.target.result);
                            };
                            reader.readAsDataURL(selectedFile);
                          } else {
                            addDoc();
                          }
                        }}
                      >
                        Upload
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
            ) : (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Files size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                <h3>Access Restricted</h3>
                <p>You must join the project to access Docs & Files.</p>
              </div>
            )
          ) : activeTab === 'graph' ? (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '8px' }}>Project Progress Timeline</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Hover over the data nodes on the progress curve to see details and team member attributions.
              </p>

              <div style={{ position: 'relative', width: '100%', minHeight: '380px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflowX: 'auto' }}>
                <div style={{ width: isMobileView ? '600px' : '100%', minWidth: isMobileView ? '600px' : 'auto' }}>
                {/* SVG Graph */}
                <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--primary)"/>
                      <stop offset="100%" stopColor="var(--secondary)"/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="0" y1="220" x2="600" y2="220" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                  {/* Graph Line & Area */}
                  {(() => {
                    const dataPoints = getTasksForGraph();
                    if (dataPoints.length === 0) return null;

                    const width = 600;
                    const height = 240;
                    const padding = 40;
                    const plotWidth = width - padding * 2;
                    const plotHeight = height - padding * 2;

                    const coords = dataPoints.map((pt, index) => {
                      const x = padding + (index / Math.max(dataPoints.length - 1, 1)) * plotWidth;
                      // Normalize y: val is between 0 and 100
                      const y = height - padding - (pt.val / 100) * plotHeight;
                      return { x, y, ...pt };
                    });

                    // Build path
                    let linePath = `M ${coords[0].x} ${coords[0].y}`;
                    for (let i = 1; i < coords.length; i++) {
                      // Smooth curve
                      const xc = (coords[i - 1].x + coords[i].x) / 2;
                      const yc = (coords[i - 1].y + coords[i].y) / 2;
                      linePath += ` Q ${coords[i - 1].x} ${coords[i - 1].y}, ${xc} ${yc} T ${coords[i].x} ${coords[i].y}`;
                    }

                    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

                    return (
                      <>
                        {/* Area Fill */}
                        <path d={areaPath} fill="url(#areaGradient)" />

                        {/* Stroke Line */}
                        <path d={linePath} fill="none" stroke="url(#lineGradient)" strokeWidth="4" filter="url(#glow)" />

                        {/* Interactive Data Dots */}
                        {coords.map((c, i) => (
                          <g key={c.id}>
                            <circle 
                              cx={c.x} 
                              cy={c.y} 
                              r="8" 
                              fill="var(--secondary)" 
                              stroke="white" 
                              strokeWidth="2"
                              style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => {
                                e.target.setAttribute('r', '12');
                                setHoveredGraphPoint(c);
                              }}
                              onMouseLeave={(e) => {
                                e.target.setAttribute('r', '8');
                                setHoveredGraphPoint(null);
                              }}
                            />
                            {/* Static text label for day */}
                            <text x={c.x} y={height - 10} fill="var(--text-muted)" fontSize="9" textAnchor="middle">
                              {c.task.length > 10 ? `${c.task.substring(0, 8)}...` : c.task}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Floating Tooltip */}
                {hoveredGraphPoint && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(10, 10, 20, 0.95)',
                    border: '1px solid var(--primary)',
                    boxShadow: '0 0 20px var(--primary-glow)',
                    borderRadius: '8px',
                    padding: '12px 18px',
                    zIndex: 100,
                    width: '320px',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.15s ease'
                  }}>
                    <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px', fontSize: '0.9rem' }}>{hoveredGraphPoint.task}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      <span>Completed: {hoveredGraphPoint.date}</span>
                      <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>Progress Index: {hoveredGraphPoint.val}%</span>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                        {(hoveredGraphPoint.assignee && hoveredGraphPoint.assignee[0]) ? hoveredGraphPoint.assignee[0].toUpperCase() : 'U'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'white' }}>
                        Worked by: <strong style={{ color: 'var(--primary-light)' }}>{hoveredGraphPoint.assignee}</strong>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fallback if no hovered graph point */}
                {!hoveredGraphPoint && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)'
                  }}>
                    Hover over any dot on the chart to reveal contributor details
                  </div>
                )}
                </div>
              </div>
            </div>
          ) : null}
            </>
          )}
        </div>
      </div>

      {/* Recruit/Invite Candidates Modal */}
      {showRecruitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ padding: '40px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h2 style={{ marginBottom: '24px' }}>Recruit / Invite Members</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Directly invite builders whose skills match your missing team roles.</p>
            
            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              {potentialInvites.map(cand => (
                <div key={cand.name} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', margin: '0 0 4px 0' }}>{cand.name}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{cand.role}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '4px', fontWeight: 600 }}>Skill Compatibility: {cand.match}</div>
                  </div>
                  <button 
                    disabled={invitedCandidates.includes(cand.name)}
                    className="btn-primary" 
                    style={{ padding: '8px 16px', fontSize: '0.85rem', background: invitedCandidates.includes(cand.name) ? 'rgba(255,255,255,0.05)' : 'var(--primary)', cursor: invitedCandidates.includes(cand.name) ? 'not-allowed' : 'pointer' }}
                    onClick={() => handleInvite(cand)}
                  >
                    {invitedCandidates.includes(cand.name) ? "Invited" : "Invite"}
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowRecruitModal(false)}>Close</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Post Another Idea Modal */}
      {showPostAnotherModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ padding: '40px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ marginBottom: '8px' }}>Post Another Idea</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Define another problem statement and gather collaborators.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const createdProblem = userService.addProblem(newIdea);
              setShowPostAnotherModal(false);
              setNewIdea({ 
                title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
                expectedOutcome: '', projectGoals: '', teamSize: 5
              });
              // Navigate to the new workspace
              navigate(`/workspace/${createdProblem.id}`);
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Title</label>
                <input 
                  type="text" 
                  required
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  placeholder="e.g., Solar-powered water filter tracker"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Domain / Category</label>
                  <select 
                    value={newIdea.domain}
                    onChange={(e) => setNewIdea({...newIdea, domain: e.target.value})}
                    className="custom-select"
                  >
                    {['Sustainability', 'FinTech', 'AI/ML', 'HealthTech', 'Education'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Difficulty Level</label>
                  <select 
                    value={newIdea.difficulty}
                    onChange={(e) => setNewIdea({...newIdea, difficulty: e.target.value})}
                    className="custom-select"
                  >
                    {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Detailed Description</label>
                <textarea 
                  required
                  value={newIdea.desc}
                  onChange={(e) => setNewIdea({...newIdea, desc: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white', minHeight: '100px' }}
                  placeholder="Describe the problem, current challenges, and your vision..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Expected Outcome</label>
                  <input 
                    type="text" 
                    value={newIdea.expectedOutcome}
                    onChange={(e) => setNewIdea({...newIdea, expectedOutcome: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., Working prototype"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Goals</label>
                  <input 
                    type="text" 
                    value={newIdea.projectGoals}
                    onChange={(e) => setNewIdea({...newIdea, projectGoals: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., Build functional prototype"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Team Size Needed</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={newIdea.teamSize}
                    onChange={(e) => setNewIdea({...newIdea, teamSize: parseInt(e.target.value)})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Required Skills / Roles (Select multiple)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Frontend', 'Backend', 'UI/UX', 'AI/ML', 'App Dev', 'Marketing'].map(skill => (
                      <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newIdea.skills.includes(skill)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewIdea({...newIdea, skills: [...newIdea.skills, skill]});
                            } else {
                              setNewIdea({...newIdea, skills: newIdea.skills.filter(s => s !== skill)});
                            }
                          }}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowPostAnotherModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Post Idea</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Selected Member Profile Overlay Modal */}
      {selectedMemberProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1010, backdropFilter: 'blur(12px)', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{ padding: '36px', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '1px solid var(--primary-glow)' }}
          >
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: getAssigneeColor(selectedMemberProfile.name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 700, color: 'white',
                boxShadow: '0 0 15px var(--primary-glow)'
              }}>
                {(selectedMemberProfile.name && selectedMemberProfile.name[0]) ? selectedMemberProfile.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '1.6rem' }}>{selectedMemberProfile.name}</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{selectedMemberProfile.role}</p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.85rem' }}>
                  <span><strong style={{ color: 'var(--primary)' }}>{selectedMemberProfile.reputation}</strong> XP</span>
                  <span><strong style={{ color: 'var(--secondary)' }}>{selectedMemberProfile.consistency}</strong> Consistency</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                <Award size={16} color="var(--primary)" /> Reputation Badges
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedMemberProfile.badges.map(b => (
                  <span key={b} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{b}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                <Briefcase size={16} color="var(--secondary)" /> Skills & Expertise
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedMemberProfile.skills.map(s => (
                  <span key={s} className="badge badge-info" style={{ fontSize: '0.7rem' }}>{s}</span>
                ))}
              </div>
            </div>

            {selectedMemberProfile.projects && selectedMemberProfile.projects.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  Active Projects
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedMemberProfile.projects.map((proj, i) => (
                    <div key={i} className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{proj.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Role: {proj.role}</div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{proj.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedMemberProfile.reviews && selectedMemberProfile.reviews.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                  <Star size={16} color="gold" /> Peer Reviews
                </h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedMemberProfile.reviews.map((rev, i) => (
                    <div key={i} className="glass-card" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                        <strong style={{ color: 'var(--text-muted)' }}>{rev.from}</strong>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[...Array(rev.rating)].map((_, idx) => <Star key={idx} size={10} fill="gold" color="gold" />)}
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button className="btn-primary" onClick={() => setSelectedMemberProfile(null)}>Close Profile</button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Rejection Reason Specification Modal */}
      {rejectingApplicant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1005, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ padding: '24px', maxWidth: '450px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
              <AlertCircle size={20} /> Specify Rejection Reason
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Specify the reason why you are declining the application from <strong>{rejectingApplicant.name || rejectingApplicant.email}</strong>. This will be stored for future reference.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Select a common reason or type below:</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {["Skills mismatch", "Team size full", "Lack of experience", "Shift in priorities"].map(rec => (
                  <button 
                    key={rec} 
                    type="button" 
                    className="btn-outline" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--border)' }}
                    onClick={() => setRejectReasonInput(rec)}
                  >
                    {rec}
                  </button>
                ))}
              </div>
              
              <textarea 
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Type custom rejection explanation here..."
                rows={4}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white', fontSize: '0.85rem', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-ghost" onClick={() => setRejectingApplicant(null)}>Cancel</button>
              <button 
                className="btn-primary" 
                style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }} 
                onClick={handleConfirmReject}
              >
                Confirm Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Project Switcher Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 1040, backdropFilter: 'blur(4px)'
              }}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0,
                width: isMobileView ? '100%' : '400px',
                background: 'var(--bg-main)', zIndex: 1050,
                borderRight: '1px solid var(--border)',
                boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={20} color="var(--primary)" /> My Projects
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <XCircle size={24} />
                </button>
              </div>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {myWorkspaces.map(w => {
                  const isSelected = String(w.id) === String(selectedProblem.id);
                  const wProgress = ((w.stageIndex !== undefined ? w.stageIndex : 2) + 1) * 20;
                  const wTeamSize = w.team?.current || (w.teamMembers?.length ? w.teamMembers.length + 1 : 2);
                  const wMaxTeamSize = w.team?.total || 5;
                  const pendingCount = (w.applications || []).filter(a => a.status === 'Pending').length;
                  
                  return (
                    <div 
                      key={w.id}
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate(`/workspace/${w.id}`);
                      }}
                      className="glass-card project-card-hover"
                      style={{ 
                        padding: '16px', 
                        cursor: 'pointer',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
                        position: 'relative'
                      }}
                    >
                      {isSelected && (
                        <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--primary)' }}>
                          <CheckCircle size={16} />
                        </div>
                      )}
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', paddingRight: '24px' }}>{w.title}</h4>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{w.domain || 'Tech'}</span>
                        {isOwnerFn(w) && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Owner</span>}
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>{stages[w.stageIndex || 2]}</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={14} /> Team: {wTeamSize}/{wMaxTeamSize}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Activity size={14} /> {wProgress}% Done
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MessageSquare size={14} /> {pendingCount} Pending
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Settings size={14} /> Active
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
                <button 
                  onClick={() => { setIsSidebarOpen(false); setShowPostAnotherModal(true); }}
                  className="btn-primary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Create New Project
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* File Deletion Confirmation */}
      <ConfirmModal
        isOpen={!!docToDelete}
        title="Delete Document"
        message={`Are you sure you want to delete ${docToDelete}?`}
        confirmText="Delete"
        isDanger={true}
        onConfirm={confirmDeleteFile}
        onCancel={() => setDocToDelete(null)}
      />
    </div>
  );
};

export default Workspace;
