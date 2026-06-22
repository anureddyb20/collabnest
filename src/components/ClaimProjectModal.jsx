import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Users, Target } from 'lucide-react';
import { useView } from '../context/ViewContext';

const ClaimProjectModal = ({ isOpen, project, onConfirm, onCancel }) => {
  const { isMobileView } = useView();

  if (!isOpen || !project) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--primary)',
            borderRadius: '16px',
            padding: isMobileView ? '24px' : '32px',
            width: '100%',
            maxWidth: '450px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top accent line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />

          <button 
            onClick={onCancel}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', padding: '4px'
            }}
          >
            <X size={20} />
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '50%', 
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--primary)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginBottom: '20px',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <Shield size={28} />
            </div>
            
            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.4rem', color: 'var(--text-main)', fontWeight: 800 }}>Claim Ownership</h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Are you sure you want to claim this project?
            </p>

            <div style={{ 
              width: '100%', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>{project.title}</h4>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Target size={16} color="var(--primary)" />
                  {project.domain || 'Tech'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <Users size={16} color="var(--secondary)" />
                  Team: {project.teamSize || project.team?.total || 5}
                </div>
              </div>
            </div>

            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              color: 'var(--warning, #f59e0b)', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              fontSize: '0.85rem', 
              lineHeight: '1.5',
              marginBottom: '24px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <Shield size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>Once claimed, you become the Project Owner and can manage applicants, workspace access, and team collaboration.</div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={onCancel}
                className="btn-outline"
                style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                className="btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: '0.95rem' }}
              >
                Confirm Claim
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClaimProjectModal;
