import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Code, ChevronRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { userService } from '../data/userService';
import { supabase } from '../supabase';

const Onboarding = ({ setUser, user }) => {
  const [step, setStep] = useState(0); // 0: Account, 1: Role, 2: Profile, 3: Idea
  const [accountData, setAccountData] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  
  const [profileData, setProfileData] = useState({
    expertise: 'Frontend Developer',
    experience: 'Entry Level (0-2 years)',
    skills: '',
    commitment: 'Less than 5 hours / week'
  });
  const [newIdea, setNewIdea] = useState({ 
    title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
    expectedOutcome: '', projectGoals: '', teamSize: 5
  });
  const navigate = useNavigate();

  useEffect(() => {
    // If there is already a logged-in user with a role, redirect them
    const session = userService.getCurrentUser();
    if (session) {
      if (session.role === 'builder') {
        navigate('/hub');
      } else if (session.role === 'owner') {
        const allProblems = userService.getAllProblems();
        const myProblems = allProblems.filter(
          p => p.author && userService.areEmailsSimilar(p.author, session.email)
        );
        if (myProblems.length > 0) {
          myProblems.sort((a, b) => Number(b.id) - Number(a.id));
          navigate(`/workspace/${myProblems[0].id}`);
        } else {
          navigate('/hub');
        }
      } else if (step === 0) {
        // Logged in but no role assigned yet
        setStep(1);
      }
    }
  }, [navigate, user, step]);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) return "Password must be at least 8 characters.";
    if (!hasUpperCase) return "Password must contain an uppercase letter.";
    if (!hasLowerCase) return "Password must contain a lowercase letter.";
    if (!hasNumbers) return "Password must contain a number.";
    if (!hasSpecialChar) return "Password must contain a special character.";
    return null;
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!isLoginMode) {
      const pwdError = validatePassword(accountData.password);
      if (pwdError) {
        setErrorMsg(pwdError);
        setLoading(false);
        return;
      }

      // Signup flow
      const { data, error } = await supabase.auth.signUp({
        email: accountData.email,
        password: accountData.password,
        options: {
          data: {
            full_name: accountData.name
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Save name to local storage profile preemptively
        const users = userService.getAllUsers ? userService.getAllUsers() : {};
        const cleanEmail = accountData.email.toLowerCase().trim();
        if (!users[cleanEmail]) {
           userService.registerOrLogin({ email: cleanEmail, name: accountData.name });
           // sign out immediately so they have to verify
           await supabase.auth.signOut();
        }
        setSuccessMsg("Please verify your email before accessing the platform.");
        setIsVerificationPending(true);
      }
    } else {
      // Login flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email: accountData.email,
        password: accountData.password
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMsg("Your email is not verified. Please verify your email to continue.");
          setIsVerificationPending(true);
        } else {
          setErrorMsg(error.message);
        }
      } else {
        // Handled by App.jsx onAuthStateChange which sets the user
        setSuccessMsg("Logged in successfully.");
      }
    }
    setLoading(false);
  };

  const resendVerification = async () => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: accountData.email,
    });
    
    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg("Verification email resent. Please check your inbox.");
    }
    setLoading(false);
  };

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    // Immediately save role choice to session so navigating away works correctly
    const finalUser = userService.registerOrLogin({ ...accountData, role: selectedRole });
    setUser(finalUser);
    
    if (selectedRole === 'owner') {
      const allProblems = userService.getAllProblems();
      const myProblems = allProblems.filter(
        p => p.author && userService.areEmailsSimilar(p.author, finalUser.email)
      );
      
      if (myProblems.length > 0) {
        myProblems.sort((a, b) => Number(b.id) - Number(a.id));
        navigate(`/workspace/${myProblems[0].id}`);
      } else {
        setStep(3);
      }
    } else {
      setStep(2);
    }
  };

  const handleFinish = () => {
    const finalSkills = profileData.skills
      ? profileData.skills.split(',').map(s => s.trim()).filter(Boolean)
      : ['Developer'];
    const finalUser = userService.registerOrLogin({ 
      ...accountData, 
      role,
      skills: finalSkills,
      expertise: profileData.expertise,
      experience: profileData.experience,
      commitment: profileData.commitment
    });
    setUser(finalUser);
    navigate('/hub');
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div 
            key="step0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel"
            style={{ padding: '48px', maxWidth: '500px', width: '100%' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                {isLoginMode ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {isLoginMode ? 'Sign in to access your projects and teams.' : 'Join the community of visionaries and builders.'}
              </p>
            </div>
            
            <form onSubmit={handleAccountSubmit}>
              {errorMsg && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#22c55e', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <CheckCircle2 size={18} />
                  {successMsg}
                </div>
              )}

              {!isLoginMode && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Full Name</label>
                  <input 
                    type="text" 
                    required={!isLoginMode}
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    placeholder="John Doe"
                    disabled={loading}
                    style={{ 
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                    }}
                  />
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={accountData.email}
                  onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                  placeholder="john@example.com"
                  disabled={loading}
                  style={{ 
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Password</label>
                <input 
                  type="password" 
                  required
                  value={accountData.password}
                  onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{ 
                    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                  }}
                />
              </div>
              
              <button 
                type="submit"
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '16px', marginBottom: '16px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? 'Log In' : 'Continue')}
                {!loading && <ChevronRight size={20} />}
              </button>

              {isVerificationPending && (
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={loading}
                  style={{ 
                    width: '100%', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', 
                    borderRadius: '8px', padding: '12px', marginBottom: '16px', cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}
                >
                  Resend Verification Email
                </button>
              )}

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); setIsVerificationPending(false); }}
                  disabled={loading}
                  style={{ 
                    background: 'none', border: 'none', color: 'var(--primary)', 
                    cursor: loading ? 'not-allowed' : 'pointer', textDecoration: 'underline', fontSize: '0.9rem',
                    fontWeight: 500
                  }}
                >
                  {isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                </button>
              </div>
            </form>
          </motion.div>
        ) : step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.3 }}
            className="glass-panel"
            style={{ padding: '48px', maxWidth: '800px', width: '100%', textAlign: 'center' }}
          >
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {accountData.name.split(' ')[0]}!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem' }}>Choose your path to get started.</p>
            
            <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
              <div 
                className={`glass-card ${role === 'owner' ? 'active-role' : ''}`}
                style={{ 
                  padding: '40px', cursor: 'pointer', border: role === 'owner' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  position: 'relative', transition: 'all 0.3s ease'
                }}
                onClick={() => handleRoleSelect('owner')}
              >
                <div style={{ color: 'var(--secondary)', marginBottom: '20px' }}>
                  <Lightbulb size={48} />
                </div>
                <h3>I have an idea</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '0.9rem' }}>
                  I have a problem statement and need a team to build it.
                </p>
              </div>

              <div 
                className={`glass-card ${role === 'builder' ? 'active-role' : ''}`}
                style={{ 
                  padding: '40px', cursor: 'pointer', border: role === 'builder' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => handleRoleSelect('builder')}
              >
                <div style={{ color: 'var(--accent)', marginBottom: '20px' }}>
                  <Code size={48} />
                </div>
                <h3>I want to build</h3>
                <p style={{ color: 'var(--text-muted)', marginTop: '12px', fontSize: '0.9rem' }}>
                  I have skills and I'm looking for meaningful problems to solve.
                </p>
              </div>
            </div>
          </motion.div>
        ) : step === 2 ? (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="glass-panel"
            style={{ padding: '48px', maxWidth: '700px', width: '100%' }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Professional Profiling</h2>
              <p style={{ color: 'var(--text-muted)' }}>Tell us about your background to help us find the best matches.</p>
            </div>
            
            <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Primary Expertise</label>
                <select 
                  value={profileData.expertise}
                  onChange={(e) => setProfileData({ ...profileData, expertise: e.target.value })}
                  className="custom-select"
                >
                  <option>Frontend Developer</option>
                  <option>Backend Developer</option>
                  <option>Fullstack Developer</option>
                  <option>UI/UX Designer</option>
                  <option>Product Manager</option>
                  <option>Marketing Specialist</option>
                  <option>Data Scientist</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Experience Level</label>
                <select 
                  value={profileData.experience}
                  onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                  className="custom-select"
                >
                  <option>Entry Level (0-2 years)</option>
                  <option>Intermediate (2-5 years)</option>
                  <option>Senior (5-8 years)</option>
                  <option>Expert (8+ years)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Key Skills (Comma separated)</label>
              <input 
                type="text" 
                value={profileData.skills}
                onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                placeholder="e.g. React, Node.js, Figma, Python..."
                style={{ 
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Portfolio / GitHub / LinkedIn</label>
              <input 
                type="text" 
                placeholder="https://..."
                style={{ 
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>What motivates you most?</label>
              <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  "Building a Portfolio",
                  "Finding a Co-founder",
                  "Solving Social Problems",
                  "Learning New Tech",
                  "Side Project Growth",
                  "Networking"
                ].map(m => (
                  <label key={m} style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: 'rgba(255,255,255,0.03)', padding: '10px', 
                    borderRadius: '8px', border: '1px solid var(--border)',
                    cursor: 'pointer', fontSize: '0.85rem'
                  }}>
                    <input type="checkbox" style={{ accentColor: 'var(--primary)' }} />
                    {m}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Weekly Commitment</label>
              <select 
                value={profileData.commitment}
                onChange={(e) => setProfileData({ ...profileData, commitment: e.target.value })}
                className="custom-select"
              >
                <option>Less than 5 hours / week</option>
                <option>5-10 hours / week</option>
                <option>10-20 hours / week</option>
                <option>20+ hours / week</option>
              </select>
            </div>

            <button 
              onClick={handleFinish}
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
            >
              Enter Problem Hub
              <ChevronRight size={20} />
            </button>
          </motion.div>
        ) : step === 3 ? (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="glass-panel"
            style={{ padding: '48px', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Post Your Idea</h2>
              <p style={{ color: 'var(--text-muted)' }}>Define your problem statement and build your dream team.</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              // Register user first
              const finalUser = userService.registerOrLogin({ ...accountData, role: 'owner' });
              setUser(finalUser);
              
              // Post idea
              const createdProblem = userService.addProblem(newIdea);
              
              // Navigate to Workspace
              navigate(`/workspace/${createdProblem.id}`);
            }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Title</label>
                <input 
                  type="text" 
                  required
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  placeholder="e.g., AI-Powered Crop Disease Diagnostics"
                />
              </div>

              <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Domain / Category</label>
                  <select 
                    value={newIdea.domain}
                    onChange={(e) => setNewIdea({...newIdea, domain: e.target.value})}
                    className="custom-select"
                  >
                    {['Sustainability', 'FinTech', 'AI/ML', 'HealthTech', 'Education'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Difficulty Level</label>
                  <select 
                    value={newIdea.difficulty}
                    onChange={(e) => setNewIdea({...newIdea, difficulty: e.target.value})}
                    className="custom-select"
                  >
                    {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Detailed Description</label>
                <textarea 
                  required
                  value={newIdea.desc}
                  onChange={(e) => setNewIdea({...newIdea, desc: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white', minHeight: '100px' }}
                  placeholder="Describe the problem, current challenges, and your vision..."
                />
              </div>

              <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Expected Outcome</label>
                  <input 
                    type="text" 
                    value={newIdea.expectedOutcome}
                    onChange={(e) => setNewIdea({...newIdea, expectedOutcome: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., A working MVP mobile app"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Project Goals</label>
                  <input 
                    type="text" 
                    value={newIdea.projectGoals}
                    onChange={(e) => setNewIdea({...newIdea, projectGoals: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                    placeholder="e.g., Reach 1,000 beta users"
                  />
                </div>
              </div>

              <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '32px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Team Size Needed</label>
                  <input 
                    type="number" 
                    min="1" max="20"
                    value={newIdea.teamSize}
                    onChange={(e) => setNewIdea({...newIdea, teamSize: parseInt(e.target.value)})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Required Skills / Roles (Select multiple)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {['Frontend', 'Backend', 'UI/UX', 'AI/ML', 'App Dev', 'Marketing'].map(skill => (
                      <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <input 
                          type="checkbox" 
                          checked={newIdea.skills.includes(skill)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewIdea({...newIdea, skills: [...newIdea.skills, skill]});
                            } else {
                              setNewIdea({...newIdea, skills: newIdea.skills.filter(s => s !== skill)});
                            }
                          }}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
              >
                Create Project & Enter Workspace
                <ChevronRight size={20} />
              </button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
