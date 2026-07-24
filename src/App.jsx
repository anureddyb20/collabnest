/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Hub from './pages/Hub';
import Workspace from './pages/Workspace';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import BuilderHub from './pages/BuilderHub';
import Navbar from './components/Navbar';
import { userService } from './data/userService';
import { useView } from './context/ViewContext';
import { useNotification } from './context/NotificationContext';
import { ErrorBoundary } from './ErrorBoundary';

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    console.log("ProtectedRoute: Redirecting to Landing Page. User is:", user, "Path:", window.location.pathname);
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isMobileView } = useView();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (!user || !user.id || !supabase) return;

    // Supabase Realtime Subscription for Global Notifications
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_applications',
          filter: `applicant_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new.status === 'Accepted' && payload.old.status !== 'Accepted') {
            // Fetch project title
            const { data } = await supabase.from('projects').select('title').eq('id', payload.new.project_id).single();
            const title = data?.title || 'a project';
            showNotification(`Your application to "${title}" has been Accepted!`, 'success', 8000);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
           showNotification(payload.new.message, payload.new.type || 'info', 8000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, showNotification]);

  useEffect(() => {
    try {
      if (!supabase) {
        console.error("Supabase is not initialized. Please check your .env variables.");
        const localUser = userService.getCurrentUser();
        if (localUser) {
          setUser(localUser);
        } else {
          setUser(null);
        }
        setIsLoading(false);
        return;
      }

      // Helper to sync user
      const syncUser = async (session) => {
        try {
          if (session?.user) {
            const email = session.user.email;
            if (!email || !email.toLowerCase().endsWith('@vvce.ac.in')) {
              await supabase.auth.signOut();
              userService.logout(true);
              setUser(null);
              setTimeout(() => {
                showNotification("Only VVCE college accounts are allowed.", "error", 8000);
              }, 500);
              return;
            }

            let name = session.user.user_metadata?.full_name || session.user.user_metadata?.name;
            if (!name || name.toLowerCase() === 'user' || name === email) {
              name = email.split('@')[0];
            }
            let localUser = await userService.registerOrLogin({ 
              email: email,
              name: name
            });
            setUser(localUser);
          } else {
            userService.logout(true); // pass true for localOnly to avoid infinite loop
            setUser(null);
          }
        } catch (err) {
          console.error("Sync user error:", err);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      };

      // Check initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        syncUser(session);
      }).catch((error) => {
        console.error("Supabase session error:", error);
        setIsLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return; // Handled by getSession()
        syncUser(session);
      });

      // Ultimate fallback: Drop loading screen after 4 seconds regardless of what happens
      const fallbackTimeout = setTimeout(() => {
        setIsLoading((prev) => {
          if (prev) console.warn("Loading screen dropped by 4-second safety fallback.");
          return false;
        });
      }, 4000);

      return () => {
        subscription?.unsubscribe();
        clearTimeout(fallbackTimeout);
      };
    } catch (criticalError) {
      console.error("Critical error in App.jsx useEffect:", criticalError);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
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
      </div>
    );
  }

  return (
    <Router>
      <div className={`app-container ${isMobileView ? 'mobile-view' : 'desktop-view'}`}>
        <Navbar user={user} />
        <main>
          <ErrorBoundary>
            <Routes>
            <Route path="/" element={<Landing user={user} />} />
            <Route path="/onboarding" element={<Onboarding setUser={setUser} />} />
            <Route path="/u/:userId" element={<PublicProfile />} />
            <Route path="/hub" element={<ProtectedRoute user={user}><Hub user={user} /></ProtectedRoute>} />
            <Route path="/builder" element={<ProtectedRoute user={user}><BuilderHub user={user} /></ProtectedRoute>} />
            <Route path="/workspace" element={<ProtectedRoute user={user}><WorkspaceDashboard /></ProtectedRoute>} />
            <Route path="/workspace/:id" element={<ProtectedRoute user={user}><Workspace /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </Router>
  );
}

export default App;