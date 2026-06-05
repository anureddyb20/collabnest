/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Hub from './pages/Hub';
import Workspace from './pages/Workspace';
import Profile from './pages/Profile';
import BuilderHub from './pages/BuilderHub';
import Navbar from './components/Navbar';
import { userService } from './data/userService';
import { useView } from './context/ViewContext';

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isMobileView } = useView();

  useEffect(() => {
    if (!supabase) {
      console.error("Supabase is not initialized. Please check your .env variables.");
      setIsLoading(false);
      return;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const localUser = userService.getCurrentUser() || userService.registerOrLogin({ email: session.user.email });
        setUser(localUser);
      } else {
        setUser(null);
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
        setUser(null);
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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding setUser={setUser} />} />
            <Route path="/hub" element={<ProtectedRoute user={user}><Hub user={user} /></ProtectedRoute>} />
            <Route path="/builder" element={<ProtectedRoute user={user}><BuilderHub user={user} /></ProtectedRoute>} />
            <Route path="/workspace/:id" element={<ProtectedRoute user={user}><Workspace /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute user={user}><Profile /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;