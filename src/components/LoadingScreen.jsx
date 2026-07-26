import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'var(--bg-main)',
    }}>
      <div className="animate-float" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>Collab</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Nest</span>
          
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none" style={{ position: 'absolute', right: '-34px', top: '-18px' }}>
            <g transform="translate(10, 20)">
              <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="var(--primary)" />
              <path d="M 60 41 L 83.5 48.5 L 82 52 L 55 45 Z" fill="var(--secondary)" />
              <path d="M 22 46 L 5 46 C 5 30 15 28 22 32 Z" fill="var(--secondary)" />
              <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M 25 28 C 25 48 42 52 58 43 L 62 35 C 50 25 44 20 42 12 Z" fill="var(--primary)" />
              <circle cx="34" cy="20" r="12" fill="var(--primary)" />
              <path d="M 24 18 L 12 21 L 24 24 Z" fill="var(--primary)" />
              <path d="M 36 24 C 50 24 58 35 58 40 C 48 42 36 36 36 24 Z" fill="var(--secondary)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="30" cy="16" r="2.5" fill="#FFF" />
            </g>
          </svg>
        </div>
        
        <svg width="105%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none" style={{ marginTop: '-2px' }}>
          <path d="M0 6Q50 0 100 6" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
        
        <div style={{ width: '100%', textAlign: 'center', marginTop: '2px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.02em' }}>
            Collaborate. Build. Grow.
          </span>
        </div>
      </div>

      {message && message !== 'Loading...' && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            color: 'var(--text-dim)',
            fontSize: '0.9rem',
            marginTop: '24px'
          }}
        >
          {message}
        </motion.div>
      )}
    </div>
  );
};

export default LoadingScreen;
