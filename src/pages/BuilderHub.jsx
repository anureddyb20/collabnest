/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../data/userService';
import { useView } from '../context/ViewContext';
import { useNotification } from '../context/NotificationContext';
import ClaimProjectModal from '../components/ClaimProjectModal';

const DOMAINS = ['All', 'AI/ML', 'FinTech', 'HealthTech', 'Sustainability', 'Education'];
const DIFFICULTIES = ['All', 'Intermediate', 'Advanced', 'Expert'];
const SKILL_OPTIONS = ['React', 'Python', 'Node.js', 'Machine Learning', 'UX Design', 'Blockchain', 'Mobile', 'IoT', 'NLP', 'TypeScript', 'Data Science', 'DevOps'];

export default function BuilderHub({ user }) {
  const navigate = useNavigate();
  const { isMobileView } = useView();
  const { showNotification } = useNotification();
  const [claimingProject, setClaimingProject] = useState(null);
  const [tab, setTab] = useState('discover'); // discover | profile | portfolio
  const [domainFilter, setDomainFilter] = useState('All');
  const [diffFilter, setDiffFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [problems, setProblems] = useState([]);
  const [applying, setApplying] = useState(null);
  const [applyMsg, setApplyMsg] = useState('');
  const [applicationData, setApplicationData] = useState({ motivation: '', portfolio: '', message: '' });
  const [applied, setApplied] = useState([]);
  const [profile, setProfile] = useState({
    skills: user?.skills || [],
    domains: [],
    experience: user?.experience || 'Entry Level',
    availability: '5-10 hrs/week',
    skillInput: ''
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [joinedProblems, setJoinedProblems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      const allProblems = await userService.getAllProblems();
      setProblems(allProblems || []);
      
      const cur = userService.getCurrentUser() || user;
      if (cur) setCurrentUser(cur);
      
      if (cur) {
        setProfile(p => ({
          ...p,
          skills: cur.skills || [],
          experience: cur.experience || 'Entry Level'
        }));
      }

      const joined = await userService.getJoinedProblems();
      setJoinedProblems(joined || []);
      
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  const filtered = problems.filter(p => {
    const matchDomain = domainFilter === 'All' || p.domain === domainFilter;
    const matchDiff = diffFilter === 'All' || p.difficulty === diffFilter;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.desc?.toLowerCase().includes(search.toLowerCase());
    return matchDomain && matchDiff && matchSearch;
  });

  const recommended = profile.skills.length > 0
    ? filtered.filter(p => p.skills?.some(s => profile.skills.includes(s)))
    : [];

  const handleApply = (problem) => {
    if (!user) { navigate('/onboarding'); return; }
    setApplying(problem);
    setApplyMsg('');
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!applying) return;
    await userService.applyToJoin(applying.id, applicationData);
    setApplied(prev => [...prev, String(applying.id)]);
    setProblems(await userService.getAllProblems());
    setApplying(null);
    setApplicationData({ motivation: '', portfolio: '', message: '' });
    setApplyMsg('');
    showNotification('Application submitted successfully!', 'success');
  };

  const handleClaim = (id) => {
    const session = userService.getCurrentUser();
    if (!session) {
      showNotification('Please log in or create an account first to claim a project!', 'warning');
      navigate('/onboarding');
      return;
    }
    const proj = problems.find(p => String(p.id) === String(id));
    setClaimingProject(proj);
  };

  const confirmClaim = async () => {
    if (claimingProject) {
      await userService.claimProject(claimingProject.id);
      setProblems(await userService.getAllProblems());
      showNotification('Project claimed successfully!', 'success');
      setClaimingProject(null);
    }
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
      const updatedUser = await userService.updateProfile(currentUser.email, {
        skills: profile.skills,
        experience: profile.experience,
        commitment: profile.availability,
        domains: profile.domains
      });
      if (updatedUser) {
        setCurrentUser(updatedUser);
      }
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  // joinedProblems is now part of state

  const diffColor = { Intermediate: '#10b981', Advanced: '#f59e0b', Expert: '#ef4444', Medium: '#10b981' };
  const impactColor = { High: '#6366f1', Critical: '#ef4444', Medium: '#10b981', 'Life-changing': '#8b5cf6' };

  const card = (p) => {
    const userApp = p.applications?.find(a => String(a.applicant_id) === String(currentUser?.id));
    const isPending = userApp?.status === 'Pending' || applied.includes(String(p.id));
    const isAccepted = userApp?.status === 'Accepted';
    const isJoined = currentUser?.joined?.some(id => String(id) === String(p.id)) || isAccepted;
    const matchingSkills = (p.skills || []).filter(s => profile.skills.includes(s));
    const missingSkills = (p.skills || []).filter(s => !profile.skills.includes(s));
    const spotsLeft = (p.team?.total || 5) - (p.team?.current || 1);

    return (
      <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
            {p.title}
            {p.status === 'available_to_claim' && (
              <span style={{ marginLeft: '8px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.25)', verticalAlign: 'middle' }}>
                Unclaimed AI Project
              </span>
            )}
          </h3>
          <span style={{ background: diffColor[p.difficulty] || '#6366f1', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{p.difficulty}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.desc}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{p.domain}</span>
          {p.impact && <span style={{ background: 'rgba(239,68,68,0.1)', color: impactColor[p.impact] || '#f59e0b', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>Impact: {p.impact}</span>}
          <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>👥 {p.team?.current || 1}/{p.team?.total || 5} members</span>
        </div>

        {/* Skill Gap Visibility */}
        {profile.skills.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            {matchingSkills.length > 0 && (
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>✓ Your matching skills: </span>
                {matchingSkills.map(s => <span key={s} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 11, padding: '2px 8px', borderRadius: 20, marginLeft: 4 }}>{s}</span>)}
              </div>
            )}
            {missingSkills.length > 0 && (
              <div>
                <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚡ Team needs: </span>
                {missingSkills.map(s => <span key={s} style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 11, padding: '2px 8px', borderRadius: 20, marginLeft: 4 }}>{s}</span>)}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {(p.skills || []).map(s => <span key={s} style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)' }}>{s}</span>)}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
          {isJoined ? (
            <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 10 }}>✓ Joined</span>
          ) : isPending ? (
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 10 }}>⏳ Pending</span>
          ) : p.status === 'available_to_claim' ? (
            <button onClick={() => handleClaim(p.id)} style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Claim Project
            </button>
          ) : (
            <button onClick={() => handleApply(p)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Apply to Join
            </button>
          )}
          {spotsLeft > 0 && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{spotsLeft} spot{spotsLeft > 1 ? 's' : ''} left</span>}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="container" style={{ padding: isMobileView ? '16px 0' : '40px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px', padding: isMobileView ? '0 16px' : '0' }}>
        <h1 style={{ fontSize: isMobileView ? '24px' : '32px', fontWeight: 800, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
          Problems
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobileView ? '14px' : '15px' }}>
          Explore problem statements and discover projects.
        </p>

        {/* Logged-in user pill */}
        {currentUser && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 50, padding: '6px 16px 6px 6px', marginTop: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
              {(currentUser.name || 'U')[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{currentUser.name}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{currentUser.email}</span>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginLeft: 4 }}>{(currentUser.joined?.length || 0) * 10 + (currentUser.reputation || 0)} XP</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'var(--bg-card)', padding: 4, borderRadius: 12, width: 'fit-content', border: '1px solid var(--border)' }}>
        {[['discover', '🔍 Discover'], ['profile', '👤 My Skills'], ['portfolio', '🏆 Portfolio']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? '#fff' : 'var(--text-secondary)', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* DISCOVER TAB */}
      {tab === 'discover' && (
        <div>
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading projects...</div>
          ) : (
            <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search problems..." style={{ flex: 1, minWidth: 200, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }} />
            <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
              {DOMAINS.map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={diffFilter} onChange={e => setDiffFilter(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
              {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Recommended */}
          {recommended.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>⭐ Recommended for You</h2>
              <div className="grid-auto">
                {recommended.slice(0, 3).map(p => card(p))}
              </div>
            </div>
          )}

          {/* All Problems */}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            {recommended.length > 0 ? 'All Projects' : 'Available Projects'} ({filtered.length})
          </h2>
          <div className="grid-auto">
            {filtered.map(p => card(p))}
            {filtered.length === 0 && <p style={{ color: 'var(--text-secondary)', gridColumn: '1/-1' }}>No projects match your filters.</p>}
          </div>
            </>
          )}
        </div>
      )}

      {/* PROFILE TAB */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 700 }}>
          {/* Account Details Card */}
          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.12), rgba(79, 70, 229, 0.06))', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', flexShrink: 0, boxShadow: '0 0 16px var(--primary-glow)' }}>
                {(currentUser.name || 'U')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-main)', marginBottom: 2 }}>{currentUser.name || 'User'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{currentUser.email}</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Role: <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{currentUser.role === 'owner' ? 'Visionary / Owner' : currentUser.role === 'builder' ? 'Builder' : 'Explorer'}</span></div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{(currentUser.joined?.length || 0) * 10 + (currentUser.reputation || 0)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>XP EARNED</div>
                <div style={{ fontSize: 11, color: 'var(--secondary)', marginTop: 4 }}>{currentUser.joined?.length || 0} Projects Joined</div>
              </div>
            </div>
          )}

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Builder Skill Preferences</h2>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Your Skills</label>
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

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Experience Level</label>
              <select value={profile.experience} onChange={e => setProfile(p => ({ ...p, experience: e.target.value }))} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
                {['Entry Level', 'Mid Level', 'Senior', 'Expert'].map(e => <option key={e}>{e}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Availability</label>
              <select value={profile.availability} onChange={e => setProfile(p => ({ ...p, availability: e.target.value }))} style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 13 }}>
                {['Less than 5 hrs/week', '5-10 hrs/week', '10-20 hrs/week', 'Full-time'].map(a => <option key={a}>{a}</option>)}
              </select>
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
              {profileSaved ? '✓ Saved!' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* PORTFOLIO TAB */}
      {tab === 'portfolio' && (
        <div>
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading portfolio...</div>
          ) : (
            <>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>My Portfolio</h2>
              {joinedProblems.length === 0 ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>🚀</p>
                  <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No projects yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Apply to projects in the Discover tab to start building your portfolio.</p>
                  <button onClick={() => setTab('discover')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>Discover Projects</button>
                </div>
              ) : (
                <div className="grid-auto">
                  {joinedProblems.map(p => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Contributor</span>
                        <span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>{p.status}</span>
                      </div>
                      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</h3>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.domain} · {p.difficulty}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {(p.skills || []).map(s => <span key={s} style={{ background: 'var(--bg-main)', color: 'var(--text-secondary)', fontSize: 11, padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>{s}</span>)}
                      </div>
                      <button onClick={() => navigate(`/workspace/${p.id}`)} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Open Workspace →
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Apply Modal */}
      <AnimatePresence>
        {applying && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Apply to Join</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>{applying.title}</p>
              <textarea value={applyMsg} onChange={e => setApplyMsg(e.target.value)} placeholder="Write a short message about why you want to join and what you can contribute..." rows={4}
                style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={submitApplication} style={{ flex: 1, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Send Application</button>
                <button onClick={() => setApplying(null)} style={{ flex: 1, background: 'var(--bg-main)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ClaimProjectModal
        isOpen={!!claimingProject}
        project={claimingProject}
        onConfirm={confirmClaim}
        onCancel={() => setClaimingProject(null)}
      />
    </div>
  );
}
