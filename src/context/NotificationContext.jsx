import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useView } from './ViewContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const { isMobileView } = useView();

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color="var(--success, #10b981)" />;
      case 'error': return <AlertCircle size={20} color="var(--error, #ef4444)" />;
      case 'warning': return <AlertTriangle size={20} color="var(--warning, #f59e0b)" />;
      case 'info':
      default: return <Info size={20} color="var(--primary, #6366f1)" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success': return 'rgba(16, 185, 129, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'info':
      default: return 'rgba(99, 102, 241, 0.1)';
    }
  };

  const getBorderColor = (type) => {
    switch (type) {
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'info':
      default: return 'rgba(99, 102, 241, 0.3)';
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast Container */}
      <div 
        style={{
          position: 'fixed',
          top: isMobileView ? '20px' : 'auto',
          bottom: isMobileView ? 'auto' : '24px',
          right: isMobileView ? '50%' : '24px',
          transform: isMobileView ? 'translateX(50%)' : 'none',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none',
          width: isMobileView ? '90%' : '380px',
          maxWidth: '400px'
        }}
      >
        <AnimatePresence>
          {notifications.map(notif => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: isMobileView ? -20 : 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              layout
              style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${getBorderColor(notif.type)}`,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                pointerEvents: 'auto',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'absolute',
                left: 0, top: 0, bottom: 0, width: '4px',
                background: getBackgroundColor(notif.type).replace('0.1', '1')
              }} />
              
              <div style={{ flexShrink: 0, marginTop: '2px', marginLeft: '4px' }}>
                {getIcon(notif.type)}
              </div>
              
              <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.4', fontWeight: 500 }}>
                {notif.message}
              </div>
              
              <button 
                onClick={() => removeNotification(notif.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px', color: 'var(--text-muted)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%', transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
