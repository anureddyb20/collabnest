import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout, Users, Activity, MessageSquare, Clock, Plus, Briefcase, ChevronRight } from 'lucide-react';
import { userService } from '../data/userService';
import { useView } from '../context/ViewContext';

const WorkspaceDashboard = () => {
  const navigate = useNavigate();
  const { isMobileView } = useView();
  const currentUser = userService.getCurrentUser();
  const [myProjects, setMyProjects] = useState([]);
  
  useEffect(() => {
    const fetchProjects = () => {
      // Get all projects the user is involved in
      const allWorkspaces = userService.getJoinedProblems();
      
      // Ownership rules: author matches email OR ownerEmail matches
      const isOwner = (p) => {
        if (!currentUser) return false;
        return (
          (p.author && userService.areEmailsSimilar(p.author, currentUser.email)) ||
          (p.ownerEmail && userService.areEmailsSimilar(p.ownerEmail, currentUser.email)) ||
          (p.ownerId && String(p.ownerId) === String(currentUser.id))
        );
      };

      // We want to show ALL projects the user owns or has joined.
      // We will sort them: Owned first, then Joined.
      const owned = allWorkspaces.filter(isOwner).sort((a, b) => Number(b.id) - Number(a.id));
      const joined = allWorkspaces.filter(p => !isOwner(p)).sort((a, b) => Number(b.id) - Number(a.id));
      
      setMyProjects([...owned, ...joined]);
    };
    
    fetchProjects();
    window.addEventListener('focus', fetchProjects);
    window.addEventListener('storage', fetchProjects);
    return () => {
      window.removeEventListener('focus', fetchProjects);
      window.removeEventListener('storage', fetchProjects);
    };
  }, [currentUser?.email, currentUser?.id]);

  const stages = ['Idea', 'Validation', 'Prototype', 'MVP', 'Launch'];

  return (
    <div className="container" style={{ padding: isMobileView ? '24px 16px' : '40px 0' }}>
      <div style={{ marginBottom: '40px', display: 'flex', flexDirection: isMobileView ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileView ? 'flex-start' : 'center', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: isMobileView ? '28px' : '36px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
            My Workspaces
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobileView ? '14px' : '16px' }}>
            Manage all your owned projects and team collaborations in one place.
          </p>
        </div>
        <button 
          onClick={() => navigate('/builder')}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
        >
          <Plus size={18} /> Post New Project
        </button>
      </div>

      {myProjects.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Briefcase size={48} color="var(--primary)" style={{ opacity: 0.5, margin: '0 auto 16px' }} />
          <h2 style={{ marginBottom: '12px' }}>No Active Workspaces</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            You haven't posted or joined any projects yet. Start by exploring the hub or posting your own idea!
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => navigate('/hub')}>Explore Hub</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {myProjects.map((project, index) => {
            const isOwner = currentUser && (
              (project.author && userService.areEmailsSimilar(project.author, currentUser.email)) ||
              (project.ownerEmail && userService.areEmailsSimilar(project.ownerEmail, currentUser.email)) ||
              (project.ownerId && String(project.ownerId) === String(currentUser.id))
            );
            
            const wProgress = ((project.stageIndex !== undefined ? project.stageIndex : 2) + 1) * 20;
            const wTeamSize = project.team?.current || (project.teamMembers?.length ? project.teamMembers.length + 1 : 2);
            const wMaxTeamSize = project.team?.total || 5;
            const pendingCount = (project.applications || []).filter(a => a.status === 'Pending').length;
            const currentStage = stages[project.stageIndex || 2];
            
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={project.id}
                onClick={() => navigate(`/workspace/${project.id}`)}
                className="glass-card project-card-hover"
                style={{ 
                  padding: '24px', 
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{project.domain || 'Tech'}</span>
                    {isOwner && <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Owner</span>}
                  </div>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.7rem' }}>{currentStage}</span>
                </div>
                
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {project.title}
                </h3>
                
                <div style={{ flex: 1 }}></div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    <span>Progress</span>
                    <span>{wProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${wProgress}%`, height: '100%', background: 'var(--primary)', borderRadius: '4px' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <Users size={16} color="var(--text-dim)" />
                    <span>Team: {wTeamSize}/{wMaxTeamSize}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <MessageSquare size={16} color={pendingCount > 0 ? "var(--secondary)" : "var(--text-dim)"} />
                    <span style={{ color: pendingCount > 0 ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: pendingCount > 0 ? 600 : 400 }}>
                      {pendingCount} Pending
                    </span>
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: '24px', right: '24px', color: 'var(--primary)' }}>
                  <ChevronRight size={20} />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WorkspaceDashboard;
