const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Onboarding.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove states
content = content.replace(/const \[accountData, setAccountData\] = useState\(\{ name: '', email: '', password: '' \}\);\n/, '');
content = content.replace(/const \[isLoginMode, setIsLoginMode\] = useState\(false\);\n/, '');
content = content.replace(/const \[successMsg, setSuccessMsg\] = useState\(''\);\n/, '');
content = content.replace(/const \[showOtp, setShowOtp\] = useState\(false\);\n/, '');
content = content.replace(/const \[otpValues, setOtpValues\] = useState\(\['', '', '', '', '', ''\]\);\n/, '');
content = content.replace(/const \[otpCountdown, setOtpCountdown\] = useState\(0\);\n/, '');
content = content.replace(/const \[isVerifying, setIsVerifying\] = useState\(false\);\n/, '');

// 2. Fix useEffect
content = content.replace(
  /const session = userService\.getCurrentUser\(\);\n\s+\/\/ Always transition to Role Selection \(Step 1\) after login instead of skipping it\n\s+if \(session && !showOtp && step === 0\) \{\n\s+setStep\(1\);\n\s+\}\n\s+\}, \[step, showOtp\]\);/g,
  `const session = userService.getCurrentUser();
    // Always transition to Role Selection (Step 1) after login instead of skipping it
    if (session && step === 0) {
      setStep(1);
    }
  }, [step]);`
);

// 3. Remove second useEffect for OTP
content = content.replace(
  /useEffect\(\(\) => \{\n\s+let timer;\n\s+if \(showOtp\) \{\n\s+timer = setInterval\(\(\) => \{\n\s+setOtpCountdown\(prev => prev > 0 \? prev - 1 : 0\);\n\s+setMockExpiry\(prev => prev > 0 \? prev - 1 : 0\);\n\s+\}, 1000\);\n\s+\}\n\s+return \(\) => clearInterval\(timer\);\n\s+\}, \[showOtp\]\);\n/g,
  ''
);

// 4. Remove all OTP and account submit handlers
const startDel1 = content.indexOf('const validatePassword = (password) => {');
const endDel1 = content.indexOf('const handleRoleSelect = async (selectedRole) => {');
if (startDel1 !== -1 && endDel1 !== -1) {
  content = content.slice(0, startDel1) + 
`  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
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

  ` + content.slice(endDel1);
}

// 5. Fix handleRoleSelect
content = content.replace(
  /const finalUser = await userService\.registerOrLogin\(\{ \.\.\.accountData, role: selectedRole \}\);/g,
  `const session = userService.getCurrentUser() || {};
    const finalUser = await userService.registerOrLogin({ email: session.email, name: session.name, role: selectedRole });`
);

// 6. Fix handleFinish
content = content.replace(
  /const finalUser = await userService\.registerOrLogin\(\{ \n\s+\.\.\.accountData, \n\s+role,/g,
  `const session = userService.getCurrentUser() || {};
    const finalUser = await userService.registerOrLogin({ 
      email: session.email, name: session.name, 
      role,`
);

// 7. Fix step 3 form
content = content.replace(
  /const finalUser = await userService\.registerOrLogin\(\{ \.\.\.accountData, role: 'owner' \}\);/g,
  `const session = userService.getCurrentUser() || {};
              const finalUser = await userService.registerOrLogin({ email: session.email, name: session.name, role: 'owner' });`
);

// 8. Fix step 1 header
content = content.replace(
  /<h2 style=\{\{ fontSize: '2rem', marginBottom: '1rem' \}\}>Welcome, \{accountData\.name\.split\(' '\)\[0\]\}!<\/h2>/g,
  `<h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Welcome, {(userService.getCurrentUser()?.name || 'Builder').split(' ')[0]}!</h2>`
);

// 9. Rewrite Step 0 UI
const startUI = content.indexOf('{step === 0 ? (');
const endUI = content.indexOf(') : step === 1 ? (');
if (startUI !== -1 && endUI !== -1) {
  const replacementUI = `{step === 0 ? (
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
                Sign In to CollabNest
              </h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Join the community of visionaries and builders.
              </p>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()}>
              {errorMsg && (
                <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                  <AlertCircle size={18} />
                  {errorMsg}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{ 
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  padding: '14px', marginBottom: '24px', background: 'white', color: '#333', 
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
        `;
  content = content.slice(0, startUI) + replacementUI + content.slice(endUI);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully refactored Onboarding.jsx');
