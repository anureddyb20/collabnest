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
            name = email.split('@')[0].toUpperCase();
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)', color: 'var(--primary)' }}>
        Loading...
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