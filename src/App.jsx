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

const ProtectedRoute = ({ user, children }) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(userService.getCurrentUser());

  async function checkConnection() {
    if (!supabase) return; // No env vars configured yet
    const { data, error } = await supabase
      .from('test')
      .select('*');
    console.log('SUPABASE DATA:', data);
    console.log('SUPABASE ERROR:', error);
  }

  useEffect(() => {
    const session = userService.getCurrentUser();
    if (session) {
      setUser(session);
    }
    
    // Supabase Connection Test
    checkConnection();
  }, []);

  return (
    <Router>
      <div className="app-container">
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