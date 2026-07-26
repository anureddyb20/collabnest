import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = ({ message = 'Loading...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      gap: '4px',
      background: 'var(--bg-main)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: 800, 
          margin: 0, 
          display: 'flex', 
          alignItems: 'center',
          letterSpacing: '-1px'
        }}>
          <span style={{ color: 'var(--text-main)' }}>Collab</span>
          <span style={{ color: '#6C63FF' }}>Nest</span>
        </h1>
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ marginLeft: '-4px', marginTop: '-24px' }}
        >
          <svg viewBox="5 -10 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="60" height="60">
            <g transform="translate(90, 0) scale(-1, 1)">
              <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="#6C63FF" />
              <path d="M 60 41 L 83.5 48.5 L 82 52 L 55 45 Z" fill="#4F46E5" />
              <path d="M 22 46 L 5 46 C 5 30 15 28 22 32 Z" fill="#4F46E5" />
              <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="#6C63FF" stroke="var(--bg-main)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M 25 28 C 25 48 42 52 58 43 L 62 35 C 50 25 44 20 42 12 Z" fill="#6C63FF" />
              <circle cx="34" cy="20" r="12" fill="#6C63FF" />
              <path d="M 24 18 L 12 21 L 24 24 Z" fill="#6C63FF" />
              <path d="M 36 24 C 50 24 58 35 58 40 C 48 42 36 36 36 24 Z" fill="#4F46E5" stroke="var(--bg-main)" strokeWidth="2.5" strokeLinejoin="round" />
              <circle cx="30" cy="16" r="2.5" fill="#FFF" />
            </g>
          </svg>
        </motion.div>
      </div>

      <svg width="260" height="12" viewBox="0 0 260 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: '-8px' }}>
        <path d="M 4 8 Q 130 2 256 8" stroke="#6C63FF" strokeWidth="3" strokeLinecap="round" />
      </svg>

      <div style={{
        color: 'var(--text-secondary)',
        fontSize: '1.1rem',
        fontWeight: 600,
        letterSpacing: '0.5px',
        marginTop: '4px'
      }}>
        Collaborate. Build. Grow.
      </div>

      {message && message !== 'Loading...' && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            color: 'var(--text-dim)',
            fontSize: '0.9rem',
            marginTop: '16px'
          }}
        >
          {message}
        </motion.div>
      )}
    </div>
  );
};

export default LoadingScreen;
