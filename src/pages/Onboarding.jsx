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

    const isDev = import.meta.env.DEV;
    console.log(`[Auth] Attempting ${isLoginMode ? 'Login' : 'Signup'} for ${accountData.email}`);

    // Temporary bypass for OTP receiving as requested by user
    setTimeout(async () => {
      const cleanEmail = accountData.email.toLowerCase().trim();
      const users = userService.getAllUsers ? userService.getAllUsers() : {};
      
      if (!isLoginMode && !users[cleanEmail]) {
        await userService.registerOrLogin({ email: cleanEmail, name: accountData.name });
      }

      // Immediately log in and transition to the next step
      const finalUser = await userService.registerOrLogin({ email: cleanEmail, name: accountData.name });
      setUser(finalUser);
      setLoading(false);
      // Always proceed to role selection instead of skipping to Hub
      setStep(1); 
    }, 500);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newOtp = [...otpValues];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtpValues(newOtp);
      const focusIndex = Math.min(pastedData.length, 5);
      const focusInput = document.getElementById(`otp-${focusIndex}`);
      if (focusInput) focusInput.focus();
    }
  };

  const verifyOtpSubmit = async (e) => {
    if (e) e.preventDefault();
    const token = otpValues.join('');
    if (token.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const isDev = import.meta.env.DEV;
    const type = isLoginMode ? 'email' : 'signup';
    console.log(`[Auth] Attempting to verify OTP for ${accountData.email} with type: ${type}`);



    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: accountData.email,
        token,
        type
      });
      
      console.log(`[Auth] verifyOtp response:`, { data, error });

      if (error) {
        console.error(`[Auth] verifyOtp error:`, error.message);
        setErrorMsg(isDev ? `[Dev Error] ${error.message}` : error.message);
      } else if (!data?.session) {
        console.error(`[Auth] verifyOtp silent failure: No session established`);
        setErrorMsg("Failed to verify OTP. Please try again.");
      } else {
        console.log(`[Auth] OTP Verification successful! Session established.`);
        setSuccessMsg("Verification successful!");
        setShowOtp(false);
        // App.jsx will automatically detect the new session and trigger the redirect via useEffect
      }
    } catch (err) {
      console.error(`[Auth] Unexpected exception during verifyOtp:`, err);
      setErrorMsg("A network or configuration error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (otpCountdown > 0) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const isDev = import.meta.env.DEV;
    console.log(`[Auth] Attempting to resend verification to ${accountData.email}`);



    try {
      let response;
      if (!isLoginMode) {
        console.log(`[Auth] Calling resend for signup...`);
        response = await supabase.auth.resend({
          type: 'signup',
          email: accountData.email,
        });
      } else {
        console.log(`[Auth] Calling signInWithOtp for login...`);
        response = await supabase.auth.signInWithOtp({
          email: accountData.email,
        });
      }
      
      console.log(`[Auth] Resend response:`, response);
      
      if (response.error) {
        console.error(`[Auth] Resend error:`, response.error.message);
        setErrorMsg(isDev ? `[Dev Error] ${response.error.message}` : response.error.message);
      } else {
        console.log(`[Auth] Resend successful`);
        setSuccessMsg("A new OTP has been sent to your email.");
        setOtpCountdown(60);
        setOtpValues(['', '', '', '', '', '']);
        const firstInput = document.getElementById('otp-0');
        if (firstInput) firstInput.focus();
      }
    } catch (err) {
      console.error(`[Auth] Unexpected exception during resend:`, err);
      setErrorMsg("A network or configuration error occurred during resend.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (selectedRole) => {
    setRole(selectedRole);
    // Immediately save role choice to session so navigating away works correctly
    const finalUser = await userService.registerOrLogin({ ...accountData, role: selectedRole });
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
  };

  const handleFinish = async () => {
    const finalSkills = selectedSkills.length > 0 ? selectedSkills : ['Developer'];
    const finalUser = await userService.registerOrLogin({ 
      ...accountData, 
      role,
      skills: finalSkills,
      motivations: selectedMotivations,
      expertise: profileData.expertise,
      experience: profileData.experience,
      commitment: profileData.commitment
    });
    setUser(finalUser);
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
                {isLoginMode ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                {isLoginMode ? 'Sign in to access your projects and teams.' : 'Join the community of visionaries and builders.'}
              </p>
            </div>
            
            {showOtp ? (
              <form onSubmit={verifyOtpSubmit}>
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
                
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-main)', marginBottom: '8px' }}>
                    Sent to <strong>{accountData.email}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => { setShowOtp(false); setErrorMsg(''); setSuccessMsg(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Change Email
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }} onPaste={handleOtpPaste}>
                  {otpValues.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      disabled={loading}
                      style={{
                        width: '48px', height: '56px', fontSize: '1.5rem', textAlign: 'center',
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${errorMsg ? '#ef4444' : 'var(--border)'}`,
                        borderRadius: '12px', color: 'white', outline: 'none',
                        transition: 'border-color 0.2s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = errorMsg ? '#ef4444' : 'var(--border)'}
                    />
                  ))}
                </div>

                <button 
                  type="submit"
                  className="btn-primary" 
                  disabled={loading || otpValues.join('').length !== 6}
                  style={{ width: '100%', justifyContent: 'center', padding: '16px', marginBottom: '16px', opacity: (loading || otpValues.join('').length !== 6) ? 0.7 : 1 }}
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : 'Verify Account'}
                  {!loading && <CheckCircle2 size={20} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={loading || otpCountdown > 0}
                    style={{ 
                      background: 'none', border: 'none', color: otpCountdown > 0 ? 'var(--text-muted)' : 'var(--primary)', 
                      cursor: (loading || otpCountdown > 0) ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontWeight: 500
                    }}
                  >
                    {otpCountdown > 0 ? `Resend OTP in ${otpCountdown}s` : "Didn't receive code? Resend OTP"}
                  </button>
                </div>
              </form>
            ) : (
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
                  {loading ? <Loader2 className="animate-spin" size={20} /> : (isLoginMode ? 'Log In' : 'Create Account')}
                  {!loading && <ChevronRight size={20} />}
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => { setIsLoginMode(!isLoginMode); setErrorMsg(''); setSuccessMsg(''); }}
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
            )}
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
              const finalUser = await userService.registerOrLogin({ ...accountData, role: 'owner' });
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
