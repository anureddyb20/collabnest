import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useView } from '../context/ViewContext';

const ConfirmModal = ({ isOpen, title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel, isDanger = false }) => {
  const { isMobileView } = useView();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
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
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: isMobileView ? '24px' : '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            position: 'relative'
          }}
        >
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
              width: '48px', height: '48px', borderRadius: '50%', 
              background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              color: isDanger ? 'var(--error, #ef4444)' : 'var(--warning, #f59e0b)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={24} />
            </div>
            
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>{title}</h3>
            <p style={{ margin: '0 0 24px 0', color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={onCancel}
                className="btn-outline"
                style={{ flex: 1, padding: '0 12px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box' }}
              >
                {cancelText}
              </button>
              <button 
                onClick={onConfirm}
                className="btn-primary"
                style={{ 
                  flex: 1, padding: '0 12px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxSizing: 'border-box',
                  background: isDanger ? 'var(--error, #ef4444)' : 'var(--primary)',
                  color: 'white',
                  border: 'none'
                }}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmModal;
