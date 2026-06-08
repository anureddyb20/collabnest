/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, TrendingUp, Users, Clock, Target, Plus, ChevronRight, Bookmark, Trash2, Briefcase } from 'lucide-react';
import { problems } from '../data/problems';
import { userService } from '../data/userService';
import { useView } from '../context/ViewContext';

const Hub = ({ user: initialUser }) => {
  const { isMobileView } = useView();
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSidebar, setActiveSidebar] = useState('Problems');
  const [displayProblems, setDisplayProblems] = useState(userService.getAllProblems());
  const [userData, setUserData] = useState(userService.getCurrentUser() || { joined: [], saved: [], submissions: [], reputation: 0 });
  const [showPostModal, setShowPostModal] = useState(false);
  const [newProblem, setNewProblem] = useState({ 
    title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
    expectedOutcome: '', projectGoals: '', teamSize: 5
  });

  const [refreshKey, setRefreshKey] = useState(0);

  const isProblemMine = (p, userObj) => {
    if (!userObj) return false;
    const isAuthor = p.author && userService.areEmailsSimilar(p.author, userObj.email);
    const isJoined = userObj.joined && userObj.joined.some(id => String(id) === String(p.id));
    const isSubmitted = userObj.submissions && userObj.submissions.some(id => String(id) === String(p.id));
    return isAuthor || isJoined || isSubmitted;
  };

  useEffect(() => {
    const user = userService.getCurrentUser() || { joined: [], saved: [], submissions: [], reputation: 0 };
    setUserData(user);
    
    // Read from URL
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['Problems', 'Teams', 'Submissions', 'MyProblems', 'Saved'].includes(tabParam)) {
      setActiveSidebar(tabParam);
    }

    const handleTabChange = (e) => {
      if (e.detail) setActiveSidebar(e.detail);
    };
    window.addEventListener('changeHubTab', handleTabChange);
    return () => window.removeEventListener('changeHubTab', handleTabChange);
  }, []);

  useEffect(() => {
    let list = [];
    const all = userService.getAllProblems();

    if (activeSidebar === 'Problems') {
      list = [...all];
      if (userData && userData.email) {
        list.sort((a, b) => {
          const aIsMine = isProblemMine(a, userData);
          const bIsMine = isProblemMine(b, userData);
          if (aIsMine && !bIsMine) return -1;
          if (!aIsMine && bIsMine) return 1;
          return Number(b.id) - Number(a.id); // Sort in order of posting (newest first)
        });
      }
    } else if (activeSidebar === 'Teams') {
      list = all.filter(p => p.teamMembers?.some(m => userService.areEmailsSimilar(m.email, userData?.email)) || userData.joined?.some(id => String(id) === String(p.id)));
    } else if (activeSidebar === 'Submissions') {
      list = all.filter(p => userData.submissions?.some(id => String(id) === String(p.id)));
    } else if (activeSidebar === 'MyProblems') {
      list = all.filter(p => p.author && userData.email && userService.areEmailsSimilar(p.author, userData.email));
      list.sort((a, b) => Number(b.id) - Number(a.id)); // Sort in order of posting (newest first)
    } else if (activeSidebar === 'Saved') {
      list = userService.getSavedProblems();
    }

    // Apply domain filter if on Problems tab
    if (activeSidebar === 'Problems' && activeFilter !== 'All') {
      list = list.filter(p => p.domain === activeFilter);
    }

    setDisplayProblems([...list]); // Force new array reference
  }, [activeSidebar, activeFilter, refreshKey, initialUser, userData]);

  const handleJoin = (id) => {
    const session = userService.getCurrentUser();
    if (!session) {
      alert('Please log in or create an account first to join a team!');
      window.location.href = '/onboarding';
      return;
    }
    userService.joinTeam(id);
    setRefreshKey(prev => prev + 1);
  };

  const handleSave = (e, id) => {
    e.stopPropagation();
    const session = userService.getCurrentUser();
    if (!session) {
      alert('Please log in or create an account first to save problems!');
      window.location.href = '/onboarding';
      return;
    }
    userService.saveProblem(id);
    setRefreshKey(prev => prev + 1);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('PERMANENT ACTION: Are you sure you want to delete this idea?')) {
      userService.deleteProblem(id);
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleSubmitProposal = (e, id) => {
    e.stopPropagation();
    const session = userService.getCurrentUser();
    if (!session) {
      alert('Please log in or create an account first to submit a proposal!');
      window.location.href = '/onboarding';
      return;
    }
    userService.submitProposal(id);
    setUserData(userService.getCurrentUser() || { joined: [], saved: [], submissions: [], reputation: 0 });
    alert('Submission successful! You can track it in the Submissions tab.');
  };

  const handlePostProblem = (e) => {
    e.preventDefault();
    userService.addProblem(newProblem);
    setShowPostModal(false);
    setDisplayProblems(userService.getAllProblems());
    setNewProblem({ 
      title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
      expectedOutcome: '', projectGoals: '', teamSize: 5
    });
  };

  return (
    <div className="container" style={{ padding: '40px 0' }}>
      <div className="workspace-layout" style={{ display: 'flex', gap: '40px' }}>
        {/* Left Sidebar - Profile */}
        {!isMobileView && (
        <aside className="workspace-sidebar" style={{ width: '280px', flexShrink: 0 }}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel"
            style={{ padding: '24px', position: 'sticky', top: '40px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 700, color: 'white'
              }}>
                {userData?.name?.charAt(0) || 'U'}
              </div>
              <h3 style={{ marginBottom: '4px' }}>{userData?.name || 'Guest User'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {userData?.role === 'owner' ? 'Visionary' : userData?.role === 'builder' ? 'Builder' : 'Explorer'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reputation</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{userData.joined.length * 10} XP</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(userData.joined.length * 10, 100)}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>

              <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  className={`btn-ghost btn-ghost-primary ${activeSidebar === 'Problems' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('Problems')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Filter size={18} style={{ marginRight: '10px' }} /> Browse Hub
                </button>
                <button 
                  className={`btn-ghost btn-ghost-secondary ${activeSidebar === 'Teams' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('Teams')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Users size={18} style={{ marginRight: '10px' }} /> My Teams
                </button>
                <button 
                  className={`btn-ghost btn-ghost-accent ${activeSidebar === 'Submissions' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('Submissions')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Target size={18} style={{ marginRight: '10px' }} /> Submissions
                </button>
                <button 
                  className={`btn-ghost btn-ghost-primary ${activeSidebar === 'MyProblems' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('MyProblems')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Briefcase size={18} style={{ marginRight: '10px' }} /> My Posted Statements
                </button>
                <button 
                  className={`btn-ghost btn-ghost-primary ${activeSidebar === 'Saved' ? 'active' : ''}`}
                  onClick={() => setActiveSidebar('Saved')}
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Bookmark size={18} style={{ marginRight: '10px' }} /> Saved Problems
                </button>
              </nav>
            </div>
          </motion.div>
        </aside>
        )}

        {/* Main Content */}
        <div>
          {/* Header & Search */}
          <div style={{ display: 'flex', flexDirection: isMobileView ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'flex-end', gap: isMobileView ? '12px' : '0', marginBottom: isMobileView ? '20px' : '40px' }}>
            <div>
              <h1 style={{ fontSize: isMobileView ? '1.3rem' : '2.5rem', marginBottom: '8px' }}>
                {activeSidebar === 'Problems' ? 'Problem Hub' : 
                 activeSidebar === 'Teams' ? 'My Joined Teams' :
                 activeSidebar === 'Submissions' ? 'My Submissions' : 
                 activeSidebar === 'MyProblems' ? 'My Posted Statements' : 'Saved Problems'}
              </h1>
              <p style={{ color: 'var(--text-muted)' }}>
                {activeSidebar === 'Problems' ? 'Explore curated challenges and find your next mission.' : 
                 activeSidebar === 'Teams' ? 'Keep track of projects you are building.' :
                 activeSidebar === 'Submissions' ? 'Manage your proposals and validations.' : 
                 activeSidebar === 'MyProblems' ? 'All the problem statements you have posted.' : 'Your personal collection of interesting problems.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: isMobileView ? '100%' : 'auto', flexDirection: isMobileView ? 'column' : 'row' }}>
              <div style={{ position: 'relative', width: isMobileView ? '100%' : 'auto' }}>
                <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} size={18} />
                <input 
                  type="text" 
                  placeholder="Search..."
                  style={{ 
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px 12px 12px 40px', color: 'white', 
                    width: isMobileView ? '100%' : '260px',
                    height: '46px', boxSizing: 'border-box'
                  }}
                />
              </div>
              <button 
                className="btn-primary" 
                style={{ height: '46px', width: isMobileView ? '100%' : 'auto', justifyContent: 'center' }}
                onClick={() => setShowPostModal(true)}
              >
                <Plus size={18} />
                Post Problem
              </button>
            </div>
          </div>

          {/* Filters - Only show for Problems tab */}
          {activeSidebar === 'Problems' && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
              {['All', 'Sustainability', 'FinTech', 'AI/ML', 'HealthTech', 'Education'].map(filter => (
                <button 
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{ 
                    padding: '8px 24px', borderRadius: '12px', border: '1px solid var(--border)',
                    background: activeFilter === filter ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                    color: activeFilter === filter ? 'white' : 'var(--text-muted)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    transition: 'all 0.2s', fontWeight: 600
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          {/* Grid / List */}
          <div 
            className={activeSidebar === 'MyProblems' ? '' : 'grid-auto'}
            style={
              activeSidebar === 'MyProblems'
                ? { display: 'flex', flexDirection: 'column', gap: '24px' }
                : {}
            }
          >
            <AnimatePresence mode="popLayout">
              {displayProblems.length > 0 ? displayProblems.map((p, i) => (
                <motion.div 
                  key={`${activeSidebar}-${p.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="glass-card"
                  style={{ 
                    position: 'relative',
                    minHeight: 'auto',
                    height: '100%',
                    overflow: 'hidden'
                  }}
                >
                  {/* Action Layer - HIGHEST Z-INDEX */}
                  <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '10px', zIndex: 100 }}>
                    {p.author && userData.email && userService.areEmailsSimilar(p.author, userData.email) && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(e, p.id);
                        }}
                        disabled={p.team.current > 1}
                        className="delete-btn-hub"
                        style={{ 
                          background: 'rgba(255, 68, 68, 0.2)', border: '1px solid rgba(255, 68, 68, 0.4)', 
                          color: p.team.current > 1 ? 'rgba(255,255,255,0.1)' : '#ff4444',
                          cursor: p.team.current > 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease',
                          width: '42px', height: '42px', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSave(e, p.id);
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                        color: userData.saved.some(id => String(id) === String(p.id)) ? 'var(--primary)' : 'var(--text-dim)',
                        cursor: 'pointer', transition: 'var(--transition)',
                        width: '42px', height: '42px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Bookmark size={20} fill={userData.saved.some(id => String(id) === String(p.id)) ? 'var(--primary)' : 'none'} />
                    </button>
                  </div>

                  {/* Main Clickable Area */}
                  <div 
                    onClick={() => window.location.href = `/workspace/${p.id}`}
                    style={{ 
                      padding: isMobileView ? '16px' : '24px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', paddingRight: '100px' }}>
                      <span className="badge badge-info" style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px' }}>{p.domain}</span>
                      <div style={{ display: 'flex', gap: '4px', color: 'var(--secondary)', alignItems: 'center' }}>
                        <TrendingUp size={14} />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>{p.impact} Impact</span>
                      </div>
                    </div>
                    
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, lineHeight: 1.4, marginBottom: '12px' }}>{p.title}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', flex: 1, lineHeight: 1.6 }}>{p.desc}</p>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 500 }}>Required Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {p.skills.map(s => <span key={s} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', border: '1px solid var(--border)' }}>{s}</span>)}
                      </div>
                    </div>
        
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.team.current}/{p.team.total} builders</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {activeSidebar === 'Problems' && (!p.author || !userData.email || !userService.areEmailsSimilar(p.author, userData.email)) && !userData.joined.some(id => String(id) === String(p.id)) && (
                          userData.submissions.some(id => String(id) === String(p.id)) ? (
                            <span style={{ color: '#4ade80', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                              ✓ Submitted
                            </span>
                          ) : (
                            <button 
                              className="btn-outline" 
                              style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                              onClick={(e) => handleSubmitProposal(e, p.id)}
                            >
                              Submit
                            </button>
                          )
                        )}
                        
                        {p.author && userData.email && userService.areEmailsSimilar(p.author, userData.email) ? (
                          <span style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                            👑 Owner
                          </span>
                        ) : userData.joined.some(id => String(id) === String(p.id)) ? (
                          <span style={{ color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ChevronRight size={16} /> Joined
                          </span>
                        ) : (
                          <button 
                            className="btn-primary" 
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoin(p.id);
                            }}
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 0', color: 'var(--text-muted)' }}>
                  <div style={{ marginBottom: '20px', opacity: 0.5 }}>
                    <Plus size={48} />
                  </div>
                  <h3>No problems found here.</h3>
                  <p>Explore the Hub to find interesting challenges to join or save!</p>
                  <button 
                    className="btn-outline" 
                    style={{ marginTop: '20px' }}
                    onClick={() => setActiveSidebar('Problems')}
                  >
                    Back to Hub
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Post Problem Modal */}
      {showPostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)', padding: '20px' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ padding: isMobileView ? '20px' : '40px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h2 style={{ marginBottom: '24px', fontSize: isMobileView ? '1.5rem' : '2rem' }}>Post New Idea / Problem Statement</h2>
            <form onSubmit={handlePostProblem}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Title</label>
                <input 
                  type="text" 
                  required
                  value={newProblem.title}
                  onChange={(e) => setNewProblem({...newProblem, title: e.target.value})}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  placeholder="e.g., AI-Powered Crop Disease Diagnostics"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: isMobileView ? '12px' : '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Domain / Category</label>
                  <select 
                    value={newProblem.domain}
                    onChange={(e) => setNewProblem({...newProblem, domain: e.target.value})}
                    className="custom-select"
                  >
                    {['Sustainability', 'FinTech', 'AI/ML', 'HealthTech', 'Education'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Difficulty Level</label>
                  <select 
                    value={newProblem.difficulty}
                    onChange={(e) => setNewProblem({...newProblem, difficulty: e.target.value})}
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
                  value={newProblem.desc}
                  onChange={(e) => setNewProblem({...newProblem, desc: e.target.value})}
                  style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white', minHeight: '100px' }}
                  placeholder="Describe the problem, current challenges, and your vision..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: isMobileView ? '12px' : '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Expected Outcome</label>
                  <input 
                    type="text" 
                    value={newProblem.expectedOutcome}
                    onChange={(e) => setNewProblem({...newProblem, expectedOutcome: e.target.value})}
                    style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., A working MVP mobile app"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Goals</label>
                  <input 
                    type="text" 
                    value={newProblem.projectGoals}
                    onChange={(e) => setNewProblem({...newProblem, projectGoals: e.target.value})}
                    style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., Reach 1,000 beta users"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 2fr', gap: isMobileView ? '12px' : '20px', marginBottom: '32px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Team Size Needed</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={newProblem.teamSize}
                    onChange={(e) => setNewProblem({...newProblem, teamSize: parseInt(e.target.value)})}
                    style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Required Skills / Roles (Select multiple)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Frontend', 'Backend', 'UI/UX', 'AI/ML', 'App Dev', 'Marketing'].map(skill => (
                      <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newProblem.skills.includes(skill)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewProblem({...newProblem, skills: [...newProblem.skills, skill]});
                            } else {
                              setNewProblem({...newProblem, skills: newProblem.skills.filter(s => s !== skill)});
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setShowPostModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Post Idea</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Hub;
