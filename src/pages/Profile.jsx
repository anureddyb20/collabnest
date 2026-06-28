import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Shield, Share2, Download, Briefcase, Zap, ExternalLink, Activity, Calendar, Users, CheckCircle, FileText, Target } from 'lucide-react';
import { userService } from '../data/userService';
import { analyticsService } from '../data/analyticsService';
import { Link } from 'react-router-dom';
import { useView } from '../context/ViewContext';

const DOMAINS = ['All', 'AI/ML', 'FinTech', 'HealthTech', 'Sustainability', 'Education'];
const SKILL_OPTIONS = ['React', 'Python', 'Node.js', 'Machine Learning', 'UX Design', 'Blockchain', 'Mobile', 'IoT', 'NLP', 'TypeScript', 'Data Science', 'DevOps'];

const Profile = () => {
  const { isMobileView } = useView();
  const currentUser = userService.getCurrentUser();
  const [joinedProblems, setJoinedProblems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [realProfile, setRealProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [profile, setProfile] = useState({
    skills: currentUser?.skills || [],
    domains: currentUser?.domains || [],
    experience: currentUser?.experience || 'Entry Level',
    availability: currentUser?.commitment || '5-10 hrs/week'
  });
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      const problems = await userService.getJoinedProblems();
      setJoinedProblems(problems);
      
      if (currentUser?.id && currentUser.id.length > 20) {
        const legacyAnalytics = await analyticsService.getUserAnalytics(currentUser.id);
        const realData = await analyticsService.getRealUserProfileData(currentUser.id);
        
        if (legacyAnalytics) setAnalytics(legacyAnalytics);
        if (realData) setRealProfile(realData);
      }
      
      setIsLoading(false);
    };
    fetchProfileData();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const addSkill = (skill) => {
    if (!profile.skills.includes(skill)) {
      setProfile(p => ({ ...p, skills: [...p.skills, skill] }));
    }
  };

  const removeSkill = (skill) => {
    setProfile(p => ({ ...p, skills: p.skills.filter(s => s !== skill) }));
  };

  const saveProfile = async () => {
    if (currentUser) {
      await userService.updateProfile(currentUser.email, {
        skills: profile.skills,
        experience: profile.experience,
        commitment: profile.availability,
        domains: profile.domains
      });
    }
    setProfileSaved(true);
    showToast("Builder preferences saved successfully!");
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const userName = currentUser?.name && currentUser.name.toLowerCase() !== 'guest builder' ? currentUser.name : (currentUser?.email ? currentUser.email.split('@')[0] : "Guest Builder");

  const user = {
    name: userName,
    role: currentUser?.role === 'owner' ? "Visionary / Product Owner" : currentUser?.role === 'builder' ? "Full Stack Builder" : "Explorer",
    reputation: realProfile ? realProfile.stats.dynamicXp : (analytics ? analytics.reputation.total_xp : ((currentUser?.joined?.length || 0) * 10 + (currentUser?.reputation || 30))),
    consistency: realProfile ? `${realProfile.stats.consistencyScore}%` : "98%",
    skills: realProfile ? realProfile.inferredSkills : (profile.skills.length > 0 ? profile.skills : ["React", "Node.js", "UI/UX", "Python"]),
    badges: analytics && analytics.badges.length > 0 ? analytics.badges : (currentUser?.role === 'owner' ? ["Top Visionary", "Community Lead"] : ["Top Collaborator", "Early Adopter", "MVP Shipper"]),
    projects: joinedProblems.map(p => ({
      id: p.id,
      title: p.title,
      role: p.author && currentUser?.email && userService.areEmailsSimilar(p.author, currentUser.email) ? "Owner / Author" : "Contributor",
      status: p.status || "In Progress",
      impact: p.impact || "High"
    }))
  };

  const handleSharePortfolio = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast("Portfolio link copied to clipboard!"))
      .catch(() => showToast("Failed to copy link."));
  };

  const handleDownloadCV = () => {
    const cvContent = `
==================================================
              COLLABNEST BUILDER RESUME
==================================================

1. PROFILE SUMMARY
--------------------------------------------------
Name:         ${user.name}
Role:         ${user.role}
Reputation:   ${user.reputation} XP
Consistency:  ${user.consistency}

2. DYNAMIC SKILLS & EXPERTISE
--------------------------------------------------
${user.skills.join(' • ')}

3. REPUTATION BADGES
--------------------------------------------------
${user.badges.join(' • ')}

4. PROJECT PORTFOLIO & IMPACT
--------------------------------------------------
${user.projects.length > 0 ? user.projects.map((p, index) => `
[Project #${index + 1}]
Title:  ${p.title}
Role:   ${p.role}
Status: ${p.status}
Impact: ${p.impact} Contribution
`).join('\n') : "No projects in portfolio yet."}

5. COLLABORATION STATS
--------------------------------------------------
Collaborators Worked With: ${realProfile?.stats?.collaborators || 0}
Projects Contributed To:   ${realProfile?.stats?.projectsJoined || 0}
Tasks Completed:           ${realProfile?.stats?.tasksCompleted || 0}
Documents Uploaded:        ${realProfile?.stats?.docsUploaded || 0}

--------------------------------------------------
Generated via CollabNest Hub on ${new Date().toLocaleDateString()}
==================================================
`.trim();

    const blob = new Blob([cvContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CV_${user.name.replace(/\s+/g, '_')}_Resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("CV text file downloaded successfully!");
  };

  const renderHeatmap = () => {
    if (!realProfile) return null;
    const days = 84;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    
    // Map dates to counts
    const activityMap = {};
    realProfile.timeline.forEach(event => {
      const d = event.date.toISOString().split('T')[0];
      activityMap[d] = (activityMap[d] || 0) + 1;
    });

    const blocks = [];
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dStr = currentDate.toISOString().split('T')[0];
      const count = activityMap[dStr] || 0;
      
      let color = 'rgba(255,255,255,0.05)';
      if (count === 1) color = 'rgba(139, 92, 246, 0.3)';
      else if (count === 2) color = 'rgba(139, 92, 246, 0.6)';
      else if (count >= 3) color = 'rgba(139, 92, 246, 1)';

      blocks.push(
        <div 
          key={i} 
          style={{ 
            width: isMobileView ? '8px' : '12px', height: isMobileView ? '8px' : '12px', borderRadius: '3px', background: color,
            transition: 'transform 0.2s', cursor: 'pointer'
          }}
          title={`${count} contributions on ${dStr}`}
          onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
        />
      );
    }

    return (
      <div className="glass-card" style={{ padding: '24px', marginBottom: '40px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="var(--primary)" />
          Activity Heatmap (Last 90 Days)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px', width: 'fit-content' }}>
            {blocks}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'left', marginTop: '8px' }}>Less ← → More</div>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!realProfile || realProfile.timeline.length === 0) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          No collaboration activity found yet. Join a project to get started!
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {realProfile.timeline.slice(0, 10).map((event, i) => (
          <div key={event.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '1px solid var(--border)' }}>
                {event.type === 'project_created' && <Briefcase size={14} color="var(--primary)" />}
                {event.type === 'project_joined' && <Users size={14} color="var(--accent)" />}
                {event.type === 'task_completed' && <CheckCircle size={14} color="var(--success)" />}
                {event.type === 'doc_uploaded' && <FileText size={14} color="var(--secondary)" />}
              </div>
              {i !== Math.min(realProfile.timeline.length, 10) - 1 && (
                <div style={{ width: '2px', height: '100%', background: 'var(--border)', position: 'absolute', top: '32px', bottom: '-16px' }} />
              )}
            </div>
            <div className="glass-card" style={{ padding: '16px', flex: 1 }}>
              <div style={{ fontSize: '0.95rem', marginBottom: '4px' }}>{event.description}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{event.date.toLocaleDateString()} at {event.date.toLocaleTimeString()}</div>
            </div>
          </div>
        ))}
        {realProfile.timeline.length > 10 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '8px' }}>
            + {realProfile.timeline.length - 10} more activities
          </div>
        )}
      </div>
    );
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="container" style={{ padding: isMobileView ? '16px 0' : '40px 0' }}>
      <div style={{ marginBottom: '32px', padding: isMobileView ? '0 16px' : '0' }}>
        <h1 style={{ fontSize: isMobileView ? '24px' : '32px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Profile Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobileView ? '14px' : '15px' }}>
          Your real collaboration identity, powered by your actual contributions.
        </p>
      </div>
      
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading profile...</div>
      ) : (
      <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '350px 1fr', gap: isMobileView ? '24px' : '40px' }}>
        {/* Profile Info Sidebar */}
        <aside>
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              width: '120px', height: '120px', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: 700, color: 'white',
              boxShadow: '0 0 20px var(--primary-glow)'
            }}>
              {initials}
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{user.name}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>{user.role}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{user.reputation}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Contribution Rank</div>
              </div>
              <div style={{ width: '1px', background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>{user.consistency}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Consistency</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={handleSharePortfolio}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Share2 size={18} /> Share Dashboard
              </button>
              <button 
                onClick={handleDownloadCV}
                className="btn-outline" 
                style={{ width: '100%', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Download size={18} /> Download CV
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary)" />
              Dynamic Skills
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {user.skills.map(s => (
                <span key={s} className="badge" style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>{s}</span>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--accent)" />
              Reputation Badges
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {user.badges.map(b => (
                <span key={b} className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{b}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* Portfolio Content */}
        <div>
          {renderHeatmap()}

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} color="var(--primary)" />
              Expertise & Tech Stack
            </h2>
            <div className="glass-card" style={{ padding: '32px' }}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Your Preferred Skills (Collaboration Strengths)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {profile.skills.map(s => (
                    <span key={s} style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12, padding: '4px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s} <span onClick={() => removeSkill(s)} style={{ cursor: 'pointer', opacity: 0.7 }}>×</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {SKILL_OPTIONS.filter(s => !profile.skills.includes(s)).map(s => (
                    <span key={s} onClick={() => addSkill(s)} style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer' }}>+ {s}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Experience Level</label>
                  <select value={profile.experience} onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
                    {['Entry Level', 'Mid Level', 'Senior', 'Expert'].map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Availability</label>
                  <select value={profile.availability} onChange={e => setProfile(p => ({ ...p, availability: e.target.value }))} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
                    {['Less than 5 hrs/week', '5-10 hrs/week', '10-20 hrs/week', 'Full-time'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Domains of Interest</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DOMAINS.filter(d => d !== 'All').map(d => (
                    <span key={d} onClick={() => setProfile(p => ({ ...p, domains: p.domains.includes(d) ? p.domains.filter(x => x !== d) : [...p.domains, d] }))}
                      style={{ background: profile.domains.includes(d) ? 'var(--primary)' : 'var(--bg-main)', color: profile.domains.includes(d) ? '#fff' : 'var(--text-secondary)', fontSize: 12, padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <button onClick={saveProfile} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {profileSaved ? '✓ Saved!' : 'Save Preferences'}
              </button>
            </div>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Target size={24} color="var(--secondary)" />
              Collaboration Stats
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px' }}>{realProfile?.stats?.collaborators || 0}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Collaborators Worked With</div>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', marginBottom: '8px' }}>{realProfile?.stats?.tasksCompleted || 0}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tasks Completed</div>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '8px' }}>{realProfile?.stats?.projectsJoined || 0}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Projects Contributed To</div>
              </div>
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)', marginBottom: '8px' }}>{realProfile?.stats?.docsUploaded || 0}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Documents Uploaded</div>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Activity size={24} color="var(--primary)" />
              Real Activity Timeline
            </h2>
            {renderTimeline()}
          </section>

          <section>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={24} color="var(--accent)" />
              Project Portfolio
            </h2>
            <div className="grid-auto">
              {user.projects.length > 0 ? user.projects.map(p => (
                <Link key={p.id} to={`/workspace/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="glass-card" 
                    style={{ padding: '24px', height: '100%' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>{p.status}</span>
                      <ExternalLink size={16} color="var(--text-dim)" />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{p.title}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Role: {p.role}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <Zap size={14} /> {p.impact} Impact Contribution
                    </div>
                  </motion.div>
                </Link>
              )) : (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', gridColumn: '1 / -1' }}>
                  No projects in your portfolio yet.
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '40px',
              left: '50%',
              x: '-50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(108, 99, 255, 0.25)',
              zIndex: 1000,
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Award size={16} color="white" />
            <span style={{ color: 'white' }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
