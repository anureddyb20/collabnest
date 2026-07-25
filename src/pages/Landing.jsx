import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Code, Lightbulb, Users, Shield, BarChart, Award } from 'lucide-react';
import { useView } from '../context/ViewContext';
import { supabase } from '../supabase';

const Landing = ({ user }) => {
  const navigate = useNavigate();
  const { isMobileView } = useView();
  const [stats, setStats] = useState({ problems: 0, builders: 0, mvps: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count active problems
        const { count: problemCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });

        // Count builders (registered users)
        const { count: builderCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        // Count MVPs (projects at stage 3+)
        const { count: mvpCount } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .gte('stage_index', 3);

        setStats({
          problems: problemCount || 0,
          builders: builderCount || 0,
          mvps: mvpCount || 0
        });
      } catch (err) {
        console.error('Failed to fetch landing stats:', err);
      }
    };
    fetchStats();
  }, []);

  const features = [
    { icon: Lightbulb, title: "Problem-First Approach", desc: "Start with meaningful problems, then build the team." },
    { icon: Users, title: "Smart Matching", desc: "AI-driven teammate and project recommendations." },
    { icon: Shield, title: "Reputation Layer", desc: "Earn trust through contribution, not just static profiles." },
    { icon: BarChart, title: "Structured Growth", desc: "Milestone-based tracking from idea to MVP." },
  ];

  return (
    <div className="landing-page" style={{ background: 'var(--bg-main)', color: 'var(--text-main)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Hero Section */}
      <section style={{ padding: isMobileView ? '40px 0' : '80px 0', textAlign: 'center' }}>
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="badge badge-primary" style={{ display: 'inline-block', marginBottom: isMobileView ? '2rem' : '1.5rem', marginTop: isMobileView ? '2rem' : '0', textTransform: 'uppercase' }}>
              Solving the execution gap
            </span>
            <h1 style={{ fontSize: isMobileView ? '2.5rem' : '4rem', lineHeight: 1.1, marginBottom: '1.5rem', wordBreak: 'break-word' }}>
              Where <span style={{ color: '#3b82f6' }}>Visionaries</span> find{!isMobileView && <br />}
              the <span style={{ color: '#3b82f6' }}>Builders</span> they need.
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
            className="landing-stats-mobile"
            style={{ marginTop: isMobileView ? '40px' : '60px', display: 'flex', justifyContent: isMobileView ? 'space-around' : 'center', gap: isMobileView ? '10px' : '60px', flexWrap: isMobileView ? 'wrap' : 'nowrap' }}
          >
            <div style={{ textAlign: 'center', flex: isMobileView ? '1 1 30%' : 'initial' }}>
              <div style={{ fontSize: isMobileView ? '1.5rem' : '2rem', fontWeight: 700 }}>{stats.problems}+</div>
              <div style={{ color: 'var(--text-muted)', fontSize: isMobileView ? '0.75rem' : '0.9rem' }}>Active Problems</div>
            </div>
            <div style={{ textAlign: 'center', flex: isMobileView ? '1 1 30%' : 'initial' }}>
              <div style={{ fontSize: isMobileView ? '1.5rem' : '2rem', fontWeight: 700 }}>{stats.builders}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: isMobileView ? '0.75rem' : '0.9rem' }}>Builders joined</div>
            </div>
            <div style={{ textAlign: 'center', flex: isMobileView ? '1 1 30%' : 'initial' }}>
              <div style={{ fontSize: isMobileView ? '1.5rem' : '2rem', fontWeight: 700 }}>{stats.mvps}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: isMobileView ? '0.75rem' : '0.9rem' }}>MVPs Shipped</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: isMobileView ? '60px 0' : '100px 0', background: 'rgba(255,255,255,0.02)' }}>
        <div className="container">
          <div className="grid-auto">
            {features.map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card"
                style={{ padding: isMobileView ? '24px' : '32px' }}
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
        padding: isMobileView ? '40px 0 30px' : '60px 0 40px', 
        borderTop: '1px solid var(--border)', 
        background: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        marginTop: isMobileView ? '40px' : '60px'
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '1.5rem' 
        }}>

          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
            © {new Date().getFullYear()} CollabNest. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
