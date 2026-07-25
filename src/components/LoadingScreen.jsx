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
      gap: '24px',
      background: 'var(--bg-main)',
    }}>
      {/* Animated Logo */}
      <motion.div
        animate={{ 
          scale: [1, 1.08, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          duration: 1.8, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
      >
        <svg viewBox="5 -10 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72">
          <g transform="translate(90, 0) scale(-1, 1)">
            <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="#6C63FF" />
            <path d="M 60 41 L 83.5 48.5 L 82 52 L 55 45 Z" fill="#4F46E5" />
            <path d="M 22 46 L 5 46 C 5 30 15 28 22 32 Z" fill="#4F46E5" />
            <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="#6C63FF" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M 25 28 C 25 48 42 52 58 43 L 62 35 C 50 25 44 20 42 12 Z" fill="#6C63FF" />
            <circle cx="34" cy="20" r="12" fill="#6C63FF" />
            <path d="M 24 18 L 12 21 L 24 24 Z" fill="#6C63FF" />
            <path d="M 36 24 C 50 24 58 35 58 40 C 48 42 36 36 36 24 Z" fill="#4F46E5" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="30" cy="16" r="2.5" fill="#FFF" />
          </g>
        </svg>
      </motion.div>

      {/* Brand Name */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          fontSize: '1.4rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #6C63FF, #4F46E5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px'
        }}
      >
        CollabNest
      </motion.div>

      {/* Loading message */}
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        {message}
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
