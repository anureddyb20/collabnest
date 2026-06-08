import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Shield, Star, Share2, Download, Briefcase, Zap, ExternalLink } from 'lucide-react';
import { userService } from '../data/userService';
import { Link } from 'react-router-dom';
import { useView } from '../context/ViewContext';

const Profile = () => {
  const { isMobileView } = useView();
  const currentUser = userService.getCurrentUser();
  const joinedProblems = userService.getJoinedProblems();
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const user = {
    name: currentUser?.name || "Guest Builder",
    role: currentUser?.role === 'owner' ? "Visionary / Product Owner" : currentUser?.role === 'builder' ? "Full Stack Builder" : "Explorer",
    reputation: (currentUser?.joined?.length || 0) * 10 + (currentUser?.reputation || 30),
    consistency: "98%",
    skills: currentUser?.skills && currentUser.skills.length > 0 ? currentUser.skills : ["React", "Node.js", "UI/UX", "Python"],
    badges: currentUser?.role === 'owner' ? ["Top Visionary", "Community Lead"] : ["Top Collaborator", "Early Adopter", "MVP Shipper"],
    projects: joinedProblems.map(p => ({
      id: p.id,
      title: p.title,
      role: p.author && currentUser?.email && userService.areEmailsSimilar(p.author, currentUser.email) ? "Owner / Author" : "Contributor",
      status: p.status || "In Progress",
      impact: p.impact || "High"
    })),
    reviews: [
      { from: "Sam", rating: 5, comment: "Amazing technical skills and great communication." },
      { from: "Jo", rating: 5, comment: "Always delivers on time. High accountability." }
    ]
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

2. KEY SKILLS & EXPERTISE
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

5. PEER COLLABORATOR REVIEWS
--------------------------------------------------
${user.reviews.map((r, index) => `
Review #${index + 1} from ${r.from}:
"${r.comment}"
Rating: ${'★'.repeat(r.rating)}
`).join('\n')}

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
          Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: isMobileView ? '14px' : '15px' }}>
          Manage your profile, skills and portfolio.
        </p>
      </div>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Reputation</div>
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
                <Share2 size={18} /> Share Portfolio
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

          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary)" />
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
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase size={24} color="var(--accent)" />
              Project Portfolio
            </h2>
            <div className="grid-auto">
              {user.projects.map(p => (
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
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star size={24} color="var(--secondary)" />
              Peer Reviews
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {user.reviews.map((r, i) => (
                <div key={i} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600 }}>{r.from}</div>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[...Array(r.rating)].map((_, i) => <Star key={i} size={12} fill="var(--primary)" color="var(--primary)" />)}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>"{r.comment}"</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
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
