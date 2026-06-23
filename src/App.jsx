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
    
    let intervalId;
    
    const checkNotifications = async () => {
      try {
        const { data: applications, error } = await supabase
          .from('project_applications')
          .select('id, project_id, status, projects(title)')
          .eq('applicant_id', user.id)
          .eq('status', 'Accepted');
          
        if (error) return;
        
        const notifiedStr = localStorage.getItem('collabnest_notified_apps');
        const notified = notifiedStr ? JSON.parse(notifiedStr) : [];
        let hasNew = false;
        
        applications.forEach(app => {
          if (!notified.includes(app.id)) {
            showNotification(`Your application to "${app.projects?.title || 'a project'}" has been Accepted!`, 'success', 8000);
            notified.push(app.id);
            hasNew = true;
          }
        });
        
        if (hasNew) {
          localStorage.setItem('collabnest_notified_apps', JSON.stringify(notified));
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    checkNotifications();
    intervalId = setInterval(checkNotifications, 10000);
    
    return () => clearInterval(intervalId);
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

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const localUser = userService.getCurrentUser() || userService.registerOrLogin({ email: session.user.email });
        setUser(localUser);
      } else {
        const localUser = userService.getCurrentUser();
        if (localUser) {
          setUser(localUser);
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    }).catch((error) => {
      console.error("Supabase session error:", error);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const localUser = userService.getCurrentUser() || userService.registerOrLogin({ email: session.user.email });
        setUser(localUser);
      } else {
        const localUser = userService.getCurrentUser();
        if (localUser) {
          setUser(localUser);
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
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