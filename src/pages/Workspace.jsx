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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('board');
  
  // Post Another Idea Modal State
  const [showPostAnotherModal, setShowPostAnotherModal] = useState(false);
  const [newIdea, setNewIdea] = useState({ 
    title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
    expectedOutcome: '', projectGoals: '', teamSize: 5
  });
  
  // Find the problem based on the ID from the URL
  const allProblems = userService.getAllProblems();
  const selectedProblem = allProblems.find(p => String(p.id) === String(id)) || problems.find(p => String(p.id) === String(id)) || problems[0];
  
  const currentUser = userService.getCurrentUser();
  
  // Get all user's workspaces to support dynamic switcher
  const myWorkspaces = userService.getJoinedProblems();
  if (selectedProblem && !myWorkspaces.some(w => String(w.id) === String(selectedProblem.id))) {
    myWorkspaces.push(selectedProblem);
  }
  
  // Sort user's workspaces in order of posting (newest first)
  myWorkspaces.sort((a, b) => Number(b.id) - Number(a.id));

  // If the logged-in user has the 'owner' role (from 'I have an idea') and is the author of this specific project, they are the admin
  const isOwner = currentUser && (
    currentUser.role === 'owner' && 
    (!selectedProblem.author || userService.areEmailsSimilar(selectedProblem.author, currentUser.email))
  );

  const ownerName = selectedProblem.author 
    ? userService.getUserNameByEmail(selectedProblem.author) 
    : (currentUser?.role === 'owner' ? (currentUser?.name || "Anu") : "Anu");

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
    const lowerName = name.toLowerCase().trim();
    let hash = 5381;
    for (let i = 0; i < lowerName.length; i++) {
      hash = ((hash << 5) + hash) + lowerName.charCodeAt(i);
    }
    const colors = [
      'linear-gradient(135deg, #6366f1, #a855f7)', // indigo-purple
      'linear-gradient(135deg, #3b82f6, #06b6d4)', // blue-cyan
      'linear-gradient(135deg, #ec4899, #f43f5e)', // pink-rose
      'linear-gradient(135deg, #10b981, #3b82f6)', // emerald-blue
      'linear-gradient(135deg, #f59e0b, #e11d48)', // amber-rose
      'linear-gradient(135deg, #8b5cf6, #d946ef)', // violet-fuchsia
      'linear-gradient(135deg, #14b8a6, #0f766e)', // teal-green
      'linear-gradient(135deg, #f97316, #ea580c)', // orange-dark
      'linear-gradient(135deg, #0ea5e9, #2563eb)', // sky-blue
      'linear-gradient(135deg, #84cc16, #22c55e)', // lime-green
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
        return member.skills.some(s => s.toLowerCase().includes(skillLower) || skillLower.includes(s.toLowerCase()));
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

  const isTeamMember = isOwner || team.some(m => {
    const isSameName = m.name && currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase();
    const isSameEmail = m.email && currentUser?.email && m.email.toLowerCase() === currentUser.email.toLowerCase();
    return isSameName || isSameEmail;
  });

  useEffect(() => {
    const refreshData = () => {
      // Reload problem from database to get latest accepted/rejected members
      const latestProblems = userService.getAllProblems();
      const latestProblem = latestProblems.find(p => String(p.id) === String(id)) || problems.find(p => String(p.id) === String(id)) || problems[0];

      // Load applicants
      const dbApplicants = userService.getApplicantsForProblem(latestProblem.id);
      const acceptedEmails = (latestProblem.acceptedMembers || []).map(m => m.email ? m.email.toLowerCase() : '');
      const rejectedEmails = (latestProblem.rejectedMembers || []).map(m => m.email ? m.email.toLowerCase() : '');
      
      const filteredApplicants = dbApplicants.filter(
        app => app && app.email && !acceptedEmails.includes(app.email.toLowerCase()) && !rejectedEmails.includes(app.email.toLowerCase())
      );
      
      setLocalApplicants(filteredApplicants);
      
      const ownerName = latestProblem.author 
        ? userService.getUserNameByEmail(latestProblem.author) 
        : (currentUser?.role === 'owner' ? (currentUser?.name || "Anu") : "Anu");

      // Sync accepted and rejected members list dynamically
      const defaultTeam = [
        { name: ownerName, role: "Product Owner", activity: "High", contributions: 10 },
        { name: "Alex", role: "UI Designer", activity: "High", contributions: 12 },
      ];
      const initialTeam = latestProblem.acceptedMembers ? [...defaultTeam, ...latestProblem.acceptedMembers] : defaultTeam;
      setTeam(initialTeam);

      const initialRejected = latestProblem.rejectedMembers || [];
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
      if (latestProblem.tasks && latestProblem.tasks.todo && latestProblem.tasks.doing && latestProblem.tasks.done) {
        setTasks(latestProblem.tasks);
      } else {
        const defaultTasks = {
          todo: [
            { id: "def-todo-1", text: "Implement " + ((latestProblem.skills && latestProblem.skills[0]) || "Frontend"), assignee: "Alex", date: "Just now" },
            { id: "def-todo-2", text: "Research " + latestProblem.domain + " market", assignee: ownerName, date: "Just now" }
          ],
          doing: [
            { id: "def-doing-1", text: "Architecture Setup", assignee: ownerName, date: "Just now" }
          ],
          done: [
            { id: "def-done-1", text: "Initial Ideation", assignee: "Alex", date: "Just now" }
          ]
        };
        setTasks(defaultTasks);
      }

      // Load docs
      if (latestProblem.docs) {
        setDocsList(latestProblem.docs);
      } else {
        const defaultDocs = [
          { name: `System_Architecture_${latestProblem.title.replace(/\s+/g, '_')}.pdf`, type: "PDF", size: "2.4 MB", uploader: ownerName, date: getDynamicEventDate(5) },
          { name: "UI_Wireframes_v2.fig", type: "Figma", size: "12.8 MB", uploader: "Alex", date: getDynamicEventDate(2) },
          { name: "Project_Proposal.docx", type: "Word", size: "1.1 MB", uploader: ownerName, date: getDynamicEventDate(10) }
        ];
        setDocsList(defaultDocs);
      }

      // Load chats
      const storedChats = getChatsWithFallback(latestProblem.id);
      if (storedChats) {
        setChatMessages(JSON.parse(storedChats));
      } else {
        const defaultChats = [
          { sender: ownerName, text: `Hey team! Let's get started on the prototype for ${latestProblem.title}.`, time: "10:30 AM" },
          { sender: "Alex", text: "Working on the design mockups now.", time: "10:32 AM" }
        ];
        setChatMessages(defaultChats);
        localStorage.setItem(`collabnest_chats_${latestProblem.id}`, JSON.stringify(defaultChats));
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

  const handleMemberClick = (member) => {
    const lowerName = member.name.toLowerCase();
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
  const handleAccept = (app) => {
    const roleForApp = app.skills && app.skills.length > 0 ? app.skills[0] : "Developer";
    const newMember = {
      name: app.name || app.email.split('@')[0],
      email: app.email,
      role: roleForApp,
      activity: "High",
      contributions: 0,
      skills: app.skills || []
    };
    
    const updatedTeamList = [...team, newMember];
    setTeam(updatedTeamList);
    
    // Save only the accepted members in the problem metadata
    const acceptedOnly = selectedProblem.acceptedMembers ? [...selectedProblem.acceptedMembers, newMember] : [newMember];
    
    // Create Contribution Log
    const newLog = {
      text: `${newMember.name} joined the team as ${newMember.role}`,
      date: "Just now"
    };
    const updatedLogs = selectedProblem.contributionsLogs ? [...selectedProblem.contributionsLogs, newLog] : [newLog];
    setContributionLogs([...contributionLogs, newLog]);
    
    // Filter applicant out of queue
    setLocalApplicants(localApplicants.filter(a => a.email !== app.email));
    
    // Persist to localStorage
    userService.updateProblem(selectedProblem.id, {
      acceptedMembers: acceptedOnly,
      contributionsLogs: updatedLogs
    });
    
    alert(`${app.name || app.email} has been accepted into the team!`);
  };

  const handleReject = (app) => {
    setRejectingApplicant(app);
    setRejectReasonInput('');
  };

  const handleConfirmReject = () => {
    if (!rejectingApplicant) return;
    const roleForApp = rejectingApplicant.skills && rejectingApplicant.skills.length > 0 ? rejectingApplicant.skills[0] : "Developer";
    
    const newRejected = {
      name: rejectingApplicant.name || rejectingApplicant.email.split('@')[0],
      email: rejectingApplicant.email,
      role: roleForApp,
      reason: rejectReasonInput.trim() || "Skills did not fit the current requirements",
      date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    };
    
    const updatedRejected = [...rejectedList, newRejected];
    setRejectedList(updatedRejected);
    
    // Filter out from active applicants
    setLocalApplicants(localApplicants.filter(a => a.email !== rejectingApplicant.email));
    
    // Persist to localStorage
    userService.updateProblem(selectedProblem.id, {
      rejectedMembers: updatedRejected
    });
    
    alert(`Rejection confirmed for ${rejectingApplicant.name || rejectingApplicant.email}.`);
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

    const nameKey = Object.keys(mockTasks).find(k => k.toLowerCase() === memberName.toLowerCase());
    const defaults = nameKey ? mockTasks[nameKey] : [];

    // Gather dynamic completed tasks assigned to this member from the "done" column
    const dynamicDone = (tasks.done || [])
      .filter(t => {
        const assignee = typeof t === 'string' ? 'Anu' : (t.assignee || 'Anu');
        return assignee.toLowerCase() === memberName.toLowerCase();
      })
      .map(t => typeof t === 'string' ? t : t.text);

    return [...defaults, ...dynamicDone];
  };

  const getTasksForGraph = () => {
    // Get list of actual team member names
    const memberNames = team.map(m => m.name);
    // Helper to get an assignee that exists in the team (fallback to ownerName or team[0].name)
    const getValidAssignee = (preferred) => {
      const matched = memberNames.find(n => n.toLowerCase() === preferred.toLowerCase());
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

  const handleAddTask = (column) => {
    if (!inlineTaskText.trim()) return;
    const assigneeName = taskAssignee || (team[0] ? team[0].name : 'Anu');
    const newTask = {
      id: Date.now().toString(),
      text: inlineTaskText.trim(),
      assignee: assigneeName,
      date: 'Just now'
    };
    const updatedTasks = {
      ...tasks,
      [column]: [...(tasks[column] || []), newTask]
    };
    setTasks(updatedTasks);
    userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
    setInlineTaskText('');
    setTaskAssignee('');
    setActiveInputColumn(null);
  };

  const handleMoveTask = (taskTextOrObj, fromStatus, toStatus) => {
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
    userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
  };

  const handleDeleteTask = (taskTextOrObj, fromStatus) => {
    const taskId = typeof taskTextOrObj === 'string' ? taskTextOrObj : taskTextOrObj.id;
    const updatedTasks = {
      ...tasks,
      [fromStatus]: (tasks[fromStatus] || []).filter(t => {
        const id = typeof t === 'string' ? t : t.id;
        return id !== taskId;
      })
    };
    setTasks(updatedTasks);
    userService.updateProblem(selectedProblem.id, { tasks: updatedTasks });
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
      const content = `Mock document content for: ${doc.name}\nType: ${doc.type}\nUploaded by: ${doc.uploader}\nDate: ${doc.date}\nSize: ${doc.size}\nCollabNest - Collaboration Space.`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
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
    if (window.confirm(`Are you sure you want to delete ${docName}?`)) {
      const updatedDocs = docsList.filter(d => d.name !== docName);
      setDocsList(updatedDocs);
      userService.updateProblem(selectedProblem.id, { docs: updatedDocs });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMessage = {
      sender: currentUser?.name || "You",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedChats = [...chatMessages, newMessage];
    setChatMessages(updatedChats);
    localStorage.setItem(`collabnest_chats_${id}`, JSON.stringify(updatedChats));
    setChatInput('');
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

    alert(`${candidate.name} has accepted your invitation and joined the team!`);
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      {/* Project Header */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {myWorkspaces.length > 1 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={selectedProblem.id}
                    onChange={(e) => navigate(`/workspace/${e.target.value}`)}
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      outline: 'none',
                      maxWidth: '450px',
                      textOverflow: 'ellipsis',
                      fontFamily: 'inherit'
                    }}
                  >
                    {myWorkspaces.map(w => (
                      <option key={w.id} value={w.id} style={{ background: 'var(--bg-card)', color: 'white' }}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <h1 style={{ fontSize: '2rem' }}>{selectedProblem.title}</h1>
              )}
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
            <p style={{ color: 'var(--text-muted)' }}>{selectedProblem.desc}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Project Progress</div>
            <div style={{ width: '200px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getAssigneeColor(m.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>{m.name[0].toUpperCase()}</div>
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
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {['todo', 'doing', 'done'].map(status => (
                <div 
                  key={status} 
                  className="glass-card" 
                  style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', minHeight: '400px' }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
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
                        style={{ padding: '12px', marginBottom: '12px', fontSize: '0.85rem', cursor: 'grab' }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task, status)}
                      >
                        <div style={{ marginBottom: '8px', wordBreak: 'break-word', fontWeight: 500 }}>{taskText}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: getAssigneeColor(taskAssigneeName), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600 }} title={`Assigned to ${taskAssigneeName}`}>
                              {taskAssigneeName[0].toUpperCase()}
                            </div>
                            <select
                              value={taskAssigneeName}
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
                        </div>
                      </div>
                    );
                  })}

                  {activeInputColumn === status ? (
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
                  )}
                </div>
              ))}
            </div>
          ) : activeTab === 'chat' ? (
            <div className="glass-panel" style={{ height: '500px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {!isTeamMember && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px' }}>
                  <MessageSquare size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                  <h3 style={{ marginBottom: '8px' }}>Team Members Only</h3>
                  <p style={{ color: 'var(--text-muted)' }}>You must join the team to view and participate in the team chat.</p>
                </div>
              )}
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
          ) : activeTab === 'contributions' ? (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
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
                              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: 'white', fontWeight: 600 }}>{m.name[0].toUpperCase()}</div>
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
            <div className="glass-panel" style={{ padding: '24px', position: 'relative', minHeight: '400px' }}>
              {!isTeamMember && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,20,0.8)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '12px' }}>
                  <Files size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
                  <h3 style={{ marginBottom: '8px' }}>Team Members Only</h3>
                  <p style={{ color: 'var(--text-muted)' }}>You must join the team to access project documents and assets.</p>
                </div>
              )}
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
                      alignItems: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out'
                    }} 
                    onClick={() => handleOpenFile(doc)}
                    title="Click to open file in a new tab"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Files size={20} color="var(--primary)" />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', margin: '0 0 4px 0', textDecoration: 'underline', color: 'var(--text-main)' }}>{doc.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {doc.type} • {doc.size} • Uploaded by {doc.uploader} • {doc.date}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
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
                    style={{ padding: '32px', maxWidth: '400px', width: '100%' }}
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

                          const addDoc = (contentDataUrl = null) => {
                            const newDoc = {
                              name: newDocName.trim(),
                              type: newDocType,
                              size: selectedFile ? formatBytes(selectedFile.size) : "1.2 MB",
                              uploader: currentUser?.name || "You",
                              date: "Just now",
                              content: contentDataUrl
                            };
                            const updatedDocs = [...docsList, newDoc];
                            setDocsList(updatedDocs);
                            userService.updateProblem(selectedProblem.id, { docs: updatedDocs });
                            
                            setNewDocName('');
                            setSelectedFile(null);
                            setShowUploadModal(false);
                            alert(`${newDocName} successfully uploaded to workspace!`);
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
          ) : activeTab === 'graph' ? (
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '8px' }}>Project Progress Timeline</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>
                Hover over the data nodes on the progress curve to see details and team member attributions.
              </p>

              <div style={{ position: 'relative', width: '100%', minHeight: '380px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                
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
                        {hoveredGraphPoint.assignee[0].toUpperCase()}
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
          ) : null}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '32px' }}>
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
                {selectedMemberProfile.name[0].toUpperCase()}
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
            style={{ padding: '32px', maxWidth: '450px', width: '100%', border: '1px solid rgba(239, 68, 68, 0.3)' }}
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
    </div>
  );
};

export default Workspace;
