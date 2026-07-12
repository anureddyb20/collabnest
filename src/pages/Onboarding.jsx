import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Code, ChevronRight, CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import { userService } from '../data/userService';
import { supabase } from '../supabase';

const AVAILABLE_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "PHP",
  "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express", "Django", "Flask", "Spring Boot", "HTML/CSS", "TailwindCSS", "Sass",
  "React Native", "Flutter", "iOS (Swift)", "Android (Kotlin)",
  "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Data Analysis", "Pandas", "Scikit-Learn", "NLP", "Computer Vision",
  "AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "CI/CD", "Terraform", "Linux",
  "UI/UX Design", "Figma", "Adobe XD", "Sketch", "Prototyping",
  "Cybersecurity", "Penetration Testing", "Cryptography", "Network Security",
  "Product Management", "Agile/Scrum", "Marketing", "SEO", "Content Creation", "Electronics", "Embedded Systems", "IoT"
];

const Onboarding = ({ setUser, user }) => {
  const [step, setStep] = useState(0); // 0: Account, 1: Role, 2: Profile, 3: Idea
  const [accountData, setAccountData] = useState({ name: '', email: '', password: '' });
  const [role, setRole] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  
  const [profileData, setProfileData] = useState({
    expertise: 'Frontend Developer',
    experience: 'Entry Level (0-2 years)',
    commitment: 'Less than 5 hours / week'
  });
  
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [selectedMotivations, setSelectedMotivations] = useState([]);

  // Handle skill input
  const handleSkillInputChange = (e) => {
    const value = e.target.value;
    setSkillInput(value);
    if (value.trim().length >= 1) {
      const suggestions = AVAILABLE_SKILLS.filter(skill => 
        skill.toLowerCase().includes(value.toLowerCase()) && !selectedSkills.includes(skill)
      );
      setSkillSuggestions(suggestions.slice(0, 5));
    } else {
      setSkillSuggestions([]);
    }
  };

  const addSkill = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSkillInput('');
    setSkillSuggestions([]);
  };

  const removeSkill = (skillToRemove) => {
    setSelectedSkills(selectedSkills.filter(skill => skill !== skillToRemove));
  };
  
  const handleMotivationToggle = (motivation) => {
    if (selectedMotivations.includes(motivation)) {
      setSelectedMotivations(selectedMotivations.filter(m => m !== motivation));
    } else if (selectedMotivations.length < 2) {
      setSelectedMotivations([...selectedMotivations, motivation]);
    }
  };

  const [newIdea, setNewIdea] = useState({ 
    title: '', domain: 'Sustainability', difficulty: 'Medium', desc: '', skills: [],
    expectedOutcome: '', projectGoals: '', teamSize: 5
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check for a logged-in user
    const session = userService.getCurrentUser();
    // Always transition to Role Selection (Step 1) after login instead of skipping it
    if (session && !showOtp && step === 0) {
      setStep(1);
    }
  }, [step, showOtp]);

  useEffect(() => {
    let timer;
    if (showOtp) {
      timer = setInterval(() => {
        setOtpCountdown(prev => prev > 0 ? prev - 1 : 0);
        setMockExpiry(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtp]);

  const checkSupabaseStatus = async () => {
    try {
      // Fast timeout (2 seconds) to avoid long hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, { 
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return true;
    } catch (err) {
      return false;
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      // Quick test with timeout to see if Supabase is reachable
      const isOnline = await checkSupabaseStatus();
      if (!isOnline) {
        console.warn("Supabase auth failed to fetch (offline or paused). Falling back to local session for Google login.");
        const finalUser = await userService.registerOrLogin({ 
          email: 'googleuser@example.com', 
          name: 'Google User',
        });
        setUser(finalUser);
        setStep(1);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/onboarding'
        }
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!accountData.email || !accountData.password || (!isLoginMode && !accountData.name)) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!accountData.email.toLowerCase().endsWith('@vvce.ac.in')) {
      setErrorMsg("Only VVCE college accounts are allowed.");
      return;
    }
    
    try {
      setLoading(true);
      setErrorMsg('');
      
      const isOnline = await checkSupabaseStatus();
      let authResult = {};
      
      if (!isOnline) {
         authResult = { error: new Error('Failed to fetch') };
      } else {
        try {
          if (isLoginMode) {
            authResult = await supabase.auth.signInWithPassword({
              email: accountData.email,
              password: accountData.password,
            });
          } else {
            authResult = await supabase.auth.signUp({
              email: accountData.email,
              password: accountData.password,
              options: {
                data: {
                  full_name: accountData.name,
                  name: accountData.name
                }
              }
            });
          }
        } catch (fetchError) {
          authResult = { error: fetchError };
        }
      }

      if (authResult.error) {
        if (authResult.error.message === 'Failed to fetch' || authResult.error.message.includes('fetch') || authResult.error.name === 'AbortError') {
          console.warn("Supabase auth failed to fetch (offline or paused). Falling back to local session.");
        } else {
          throw authResult.error;
        }
      }
      
      const finalUser = await userService.registerOrLogin({ 
        email: accountData.email, 
        name: accountData.name || accountData.email.split('@')[0],
      });
      setUser(finalUser);
      setStep(1);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (selectedRole) => {
    try {
      setRole(selectedRole);
      // Use user prop first, fallback to cache, or default to safe empty object
      const session = user || userService.getCurrentUser() || {};
      
      // Safety check: if email is missing, do not attempt to register, just proceed
      if (!session.email) {
        setStep(selectedRole === 'owner' ? 3 : 2);
        return;
      }
      
      const finalUser = await userService.registerOrLogin({ email: session.email, name: session.name, role: selectedRole });
      setUser(finalUser);
      
      if (selectedRole === 'owner') {
        const allProblems = await userService.getAllProblems();
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
    } catch (err) {
      console.error("Error in handleRoleSelect:", err);
      // Proceed gracefully even if backend fails
      setStep(selectedRole === 'owner' ? 3 : 2);
    }
  };

  const handleFinish = async () => {
    const finalSkills = selectedSkills.length > 0 ? selectedSkills : ['Developer'];
    const session = user || userService.getCurrentUser() || {};
    
    if (!session.email) {
       navigate('/hub');
       return;
    }

    try {
      const finalUser = await userService.registerOrLogin({ 
        ...accountData, 
        email: session.email,
        name: session.name,
        role,
        skills: finalSkills,
        motivations: selectedMotivations,
        expertise: profileData.expertise,
        experience: profileData.experience,
        commitment: profileData.commitment
      });
      setUser(finalUser);
    } catch (err) {
      console.error("Error in handleFinish:", err);
    }
    navigate('/hub');
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative' }}>
      <div>
        {step === 0 ? (
          <motion.div 
            key="step0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel"
            style={{ padding: '48px', maxWidth: '500px', width: '100%' }}
          >
            <button 
              onClick={() => navigate('/')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '24px', padding: 0, fontSize: '0.9rem' }}
            >
              ← Back to Home
            </button>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                {isLoginMode ? 'Sign In to CollabNest' : 'Create an Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {isLoginMode ? 'Welcome back! Please enter your details.' : 'Join the community of visionaries and builders.'}
              </p>
            </div>
            
            <form onSubmit={handleEmailAuth}>
              {errorMsg && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} />
                  {errorMsg}
                </div>
              )}

              {!isLoginMode && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Full Name</label>
                  <input 
                    type="text" 
                    required={!isLoginMode}
                    value={accountData.name}
                    onChange={(e) => setAccountData({...accountData, name: e.target.value})}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem' }}
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email Address</label>
                <input 
                  type="email" 
                  required
                  value={accountData.email}
                  onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem' }}
                  placeholder="john@example.com"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password</label>
                <input 
                  type="password" 
                  required
                  value={accountData.password}
                  onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem' }}
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '14px', marginBottom: '24px', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? 'Sign In' : 'Sign Up')}
              </button>

              <div style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button" 
                  onClick={() => setIsLoginMode(!isLoginMode)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                >
                  {isLoginMode ? 'Sign up' : 'Log in'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR</div>
                <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{ 
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  padding: '14px', background: 'white', color: '#333', 
                  borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s'
                }}
                onMouseOver={(e) => !loading && (e.currentTarget.style.background = '#f5f5f5')}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
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
            <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {(userService.getCurrentUser()?.name || 'Builder').split(' ')[0]}!</h2>
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

            <div style={{ marginBottom: '24px', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Key Skills</label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: selectedSkills.length > 0 ? '12px' : '0' }}>
                <AnimatePresence>
                  {selectedSkills.map(skill => (
                    <motion.div 
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px', 
                        background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)',
                        padding: '6px 12px', borderRadius: '20px', fontSize: '0.85rem',
                        border: '1px solid rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      {skill}
                      <button 
                        type="button" 
                        onClick={() => removeSkill(skill)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0' }}
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <input 
                type="text" 
                value={skillInput}
                onChange={handleSkillInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && skillSuggestions.length > 0) {
                    e.preventDefault();
                    addSkill(skillSuggestions[0]);
                  }
                }}
                placeholder={selectedSkills.length === 0 ? "e.g. React, Node.js, Figma, Python..." : "Type to add more skills..."}
                style={{ 
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px', color: 'white', fontSize: '1rem'
                }}
              />
              
              <AnimatePresence>
                {skillSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ 
                      position: 'absolute', top: '100%', left: 0, right: 0, 
                      background: '#1a1a2e', border: '1px solid var(--border)', 
                      borderRadius: '12px', marginTop: '8px', zIndex: 10,
                      overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                  >
                    {skillSuggestions.map((suggestion, idx) => (
                      <div 
                        key={suggestion}
                        onClick={() => addSkill(suggestion)}
                        style={{ 
                          padding: '12px 16px', cursor: 'pointer', 
                          borderBottom: idx < skillSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          background: 'transparent', transition: 'background 0.2s',
                          color: 'white'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>What motivates you most?</label>
                <span style={{ fontSize: '0.8rem', color: selectedMotivations.length >= 2 ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {selectedMotivations.length}/2 selected
                </span>
              </div>
              {selectedMotivations.length >= 2 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '12px' }}>
                  You can select up to 2 motivations.
                </div>
              )}
              <div className="onboarding-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  "Building a Portfolio",
                  "Finding a Co-founder",
                  "Solving Social Problems",
                  "Learning New Tech",
                  "Side Project Growth",
                  "Networking"
                ].map(m => {
                  const isSelected = selectedMotivations.includes(m);
                  const isDisabled = !isSelected && selectedMotivations.length >= 2;
                  
                  return (
                    <motion.label 
                      key={m} 
                      whileHover={isDisabled ? {} : { scale: 1.02 }}
                      whileTap={isDisabled ? {} : { scale: 0.98 }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.03)', 
                        padding: '10px', 
                        borderRadius: '8px', 
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        cursor: isDisabled ? 'not-allowed' : 'pointer', 
                        fontSize: '0.85rem',
                        opacity: isDisabled ? 0.5 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleMotivationToggle(m)}
                        disabled={isDisabled}
                        style={{ accentColor: 'var(--primary)', cursor: isDisabled ? 'not-allowed' : 'pointer' }} 
                      />
                      <span style={{ color: isSelected ? 'white' : 'var(--text-muted)' }}>{m}</span>
                    </motion.label>
                  );
                })}
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
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              // Register user first
              const session = userService.getCurrentUser() || {};
              const finalUser = await userService.registerOrLogin({ email: session.email, name: session.name, role: 'owner' });
              setUser(finalUser);
              
              // Post idea
              const createdProblem = await userService.addProblem(newIdea);
              
              if (createdProblem) {
                // Navigate to Workspace
                navigate(`/workspace/${createdProblem.id}`);
              }
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
        ) : (
          <div style={{ color: 'red', fontSize: '24px' }}>
            Debug: Step is {String(step)}
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
