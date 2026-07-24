import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, LayoutGrid as Hub, Layout, User, Zap, LogOut, Hammer, Menu, X, Monitor, Smartphone, Filter, Users, Target, Briefcase, Bookmark, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { userService } from '../data/userService';
import { useView } from '../context/ViewContext';
import { supabase } from '../supabase';

const Navbar = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = user || userService.getCurrentUser();
  const myWorkspaces = userService.getJoinedProblems();
  const { isMobileView } = useView();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  React.useEffect(() => {
    if (!currentUser?.id || !supabase) return;

    const fetchNotifs = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(20);
          
        // Safely ignore missing table errors (PGRST116) or just render empty if error
        if (data && !error) {
          setNotifications(data.map(n => ({
            id: n.id,
            message: n.message,
            read: n.read_status,
            date: new Date(n.created_at)
          })));
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    
    fetchNotifs();

    const channel = supabase
      .channel('navbar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications(prev => [{
            id: payload.new.id,
            message: payload.new.message,
            read: payload.new.read_status,
            date: new Date(payload.new.created_at)
          }, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotifications = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      if (currentUser?.id && supabase) {
        try {
          await supabase
            .from('notifications')
            .update({ read_status: true })
            .eq('user_id', currentUser.id)
            .eq('read_status', false);
        } catch (e) {
          console.error(e);
        }
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      userService.logout();
      window.location.href = '/';
    }
  };

  const navLinks = [
    { path: '/hub', label: 'Problem Hub', icon: Hub },
    { path: '/workspace', label: 'Workspace', icon: Layout },
    { path: '/profile', label: 'Portfolio', icon: User },
  ];

  return (
    <nav className="navbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      padding: '1rem 2rem'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {location.pathname !== '/' && location.pathname !== '/hub' && location.pathname !== '/onboarding' && (
            <button 
              onClick={() => navigate(-1)} 
              className="btn-ghost" 
              style={{ padding: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#0F172A' }}>Collab</span>
              <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary)' }}>Nest</span>
              
              {/* Cute Bluebird over the 'st' */}
              <svg width="48" height="48" viewBox="0 0 100 100" fill="none" style={{ position: 'absolute', right: '-34px', top: '-18px' }}>
                <g transform="translate(10, 20)">
                  {/* Tail */}
                  <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="var(--primary)" />
                  {/* Tail Shadow */}
                  <path d="M 60 41 L 83.5 48.5 L 82 52 L 55 45 Z" fill="var(--secondary)" />

                  {/* Back Wing (shifted left for gap) */}
                  <path d="M 22 46 L 5 46 C 5 30 15 28 22 32 Z" fill="var(--secondary)" />
                  
                  {/* Tail (with stroke for gap from shadow) */}
                  <path d="M 50 35 L 85 45 L 82 52 L 55 45 Z" fill="var(--primary)" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
                  
                  {/* Body (drawn over tail) */}
                  <path d="M 25 28 C 25 48 42 52 58 43 L 62 35 C 50 25 44 20 42 12 Z" fill="var(--primary)" />
                  
                  {/* Head */}
                  <circle cx="34" cy="20" r="12" fill="var(--primary)" />
                  
                  {/* Beak */}
                  <path d="M 24 18 L 12 21 L 24 24 Z" fill="var(--primary)" />
                  
                  {/* Main Wing (with stroke for gap from body) */}
                  <path d="M 36 24 C 50 24 58 35 58 40 C 48 42 36 36 36 24 Z" fill="var(--secondary)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                  
                  {/* Eye */}
                  <circle cx="30" cy="16" r="2.5" fill="#FFF" />
                </g>
              </svg>
            </div>
            
            {/* Swoosh Underline */}
            <svg width="105%" height="8" viewBox="0 0 100 8" preserveAspectRatio="none" style={{ marginTop: '-2px' }}>
              <path d="M0 6Q50 0 100 6" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
            
            {/* Tagline */}
            <div style={{ width: '100%', textAlign: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.02em' }}>
                Collaborate. Build. Grow.
              </span>
            </div>
          </Link>
        </div>

        {isMobileView ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button onClick={handleOpenNotifications} className="btn-ghost" style={{ padding: '8px', position: 'relative' }}>
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: '4px', right: '4px', background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: 700, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            )}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="btn-ghost"
              style={{ padding: '8px' }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = (location.pathname.startsWith('/workspace') && link.path.startsWith('/workspace'))
                ? true
                : location.pathname === link.path;
              return (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  style={{ 
                    textDecoration: 'none', 
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                    position: 'relative'
                  }}
                >
                  <Icon size={18} />
                  {link.label}
                  {isActive && (
                    <motion.div 
                      layoutId="nav-underline"
                      style={{ position: 'absolute', bottom: '-1rem', height: '2px', background: 'var(--primary)', width: '100%' }}
                    />
                  )}
                </Link>
              );
            })}
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: '1rem' }}>

              {currentUser ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <button onClick={handleOpenNotifications} className="btn-ghost" style={{ padding: '8px', position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                      <Bell size={20} color="var(--text-main)" />
                      {unreadCount > 0 && (
                        <span style={{ position: 'absolute', top: '2px', right: '2px', background: 'var(--primary)', color: 'white', fontSize: '10px', fontWeight: 700, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <AnimatePresence>
                      {showNotifications && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            style={{ position: 'absolute', top: '40px', right: 0, width: isMobileView ? 'calc(100vw - 32px)' : '320px', maxWidth: '350px', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid var(--border)', overflow: 'hidden', zIndex: 1000 }}
                          >
                            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            Notifications
                          </div>
                          <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {notifications.length === 0 ? (
                              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                No notifications yet.
                              </div>
                            ) : (
                              notifications.map(n => (
                                <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: n.read ? '#fff' : 'rgba(139, 92, 246, 0.05)' }}>
                                  <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '4px' }}>{n.message}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(n.date).toLocaleString()}</div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Hi, {currentUser.name}
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="btn-outline" 
                    style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                  >
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              ) : (
                <Link to="/onboarding" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', textDecoration: 'none' }}>
                  Get Started
                  <Zap size={16} />
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isMobileView && isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', background: '#fff', borderTop: '1px solid var(--border)', marginTop: '1rem' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', padding: '1rem 0' }}>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = (location.pathname.startsWith('/workspace') && link.path.startsWith('/workspace'))
                  ? true
                  : location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      padding: '1rem 2rem',
                      textDecoration: 'none',
                      color: isActive ? 'var(--primary)' : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      fontWeight: 600,
                      background: isActive ? 'var(--primary-glow)' : 'transparent',
                    }}
                  >
                    <Icon size={20} />
                    {link.label}
                  </Link>
                );
              })}
              
              <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
                {currentUser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                       <div style={{ 
                          width: '50px', height: '50px', borderRadius: '50%', 
                          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.5rem', fontWeight: 700, color: 'white'
                        }}>
                          {currentUser.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{currentUser.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Reputation: {(currentUser.joined?.length || 0) * 10} XP
                          </div>
                        </div>
                    </div>

                    {location.pathname === '/hub' && (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                          <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('changeHubTab', { detail: 'Problems' })) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: 0, fontSize: '1rem', cursor: 'pointer' }}><Filter size={18} /> Browse Hub</button>
                          <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('changeHubTab', { detail: 'Teams' })) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: 0, fontSize: '1rem', cursor: 'pointer' }}><Users size={18} /> My Teams</button>
                          <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('changeHubTab', { detail: 'Submissions' })) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: 0, fontSize: '1rem', cursor: 'pointer' }}><Target size={18} /> Submissions</button>
                          <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('changeHubTab', { detail: 'MyProblems' })) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: 0, fontSize: '1rem', cursor: 'pointer' }}><Briefcase size={18} /> My Posted Statements</button>
                          <button onClick={() => { setIsMenuOpen(false); window.dispatchEvent(new CustomEvent('changeHubTab', { detail: 'Saved' })) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: 0, fontSize: '1rem', cursor: 'pointer' }}><Bookmark size={18} /> Saved Problems</button>
                       </div>
                    )}
                    <button 
                      onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                      className="btn-outline" 
                      style={{ padding: '12px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', width: '100%' }}
                    >
                      <LogOut size={18} />
                      Log Out
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/onboarding" 
                    onClick={() => setIsMenuOpen(false)}
                    className="btn-primary" 
                    style={{ padding: '12px', fontSize: '1rem', textDecoration: 'none', display: 'flex', justifyContent: 'center', width: '100%' }}
                  >
                    Get Started
                    <Zap size={18} />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
