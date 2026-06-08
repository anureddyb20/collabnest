import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code, Lightbulb, Users, Shield, BarChart, Award } from 'lucide-react';

const Landing = ({ user }) => {
  const navigate = useNavigate();

  const features = [
    { icon: Lightbulb, title: "Problem-First Approach", desc: "Start with meaningful problems, then build the team." },
    { icon: Users, title: "Smart Matching", desc: "AI-driven teammate and project recommendations." },
    { icon: Shield, title: "Reputation Layer", desc: "Earn trust through contribution, not just static profiles." },
    { icon: BarChart, title: "Structured Growth", desc: "Milestone-based tracking from idea to MVP." },
  ];

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section style={{ padding: '80px 0', textAlign: 'center' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge badge-primary" style={{ marginBottom: '1.5rem' }}>
              Solving the execution gap
            </span>
            <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: '1.5rem' }}>
              Where <span className="accent-gradient">Visionaries</span> find<br />
              the <span className="accent-gradient">Builders</span> they need.
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
              A structured collaboration platform that guides you from a raw problem statement to a fully executed solution. 
              No ghosting, just building.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate(user ? '/hub' : '/onboarding')}
                className="btn-primary" 
                style={{ padding: '16px 32px', fontSize: '1.1rem', cursor: 'pointer', zIndex: 10, position: 'relative' }}
              >
                {user ? 'Go to Hub' : 'Start Collaborating'}
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => {
                  if (user) {
                    navigate('/hub');
                  } else {
                    navigate('/onboarding');
                  }
                }}
                className="btn-outline" 
                style={{ padding: '16px 32px', fontSize: '1.1rem', cursor: 'pointer', zIndex: 10, position: 'relative' }}
              >
                Explore Problem Hub
              </button>
            </div>
          </motion.div>

          {/* Stats/Social Proof */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            style={{ marginTop: '60px', display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>250+</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active Problems</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>1.2k</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Builders joined</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>45</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>MVPs Shipped</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '100px 0', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div className="grid-auto">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: '32px' }}
              >
                <div style={{ 
                  width: '48px', height: '48px', 
                  borderRadius: '12px', background: 'rgba(108, 99, 255, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '20px', color: 'var(--primary)'
                }}>
                  <f.icon size={24} />
                </div>
                <h3 style={{ marginBottom: '12px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '60px 0 40px', 
        borderTop: '1px solid var(--border)', 
        background: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        marginTop: '60px'
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.5rem' 
        }}>
          {/* Social Links */}
          <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center' }}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'block' }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
            © {new Date().getFullYear()} CollabNest. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
