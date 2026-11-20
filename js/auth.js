/**
 * NoteX Authentication & College Email Verification
 */

const NoteXAuth = (() => {
  // Known college domain lookup map for instant friendly badges
  const COLLEGE_DOMAIN_MAP = {
    'stanford.edu': 'Stanford University',
    'mit.edu': 'Massachusetts Institute of Technology',
    'berkeley.edu': 'UC Berkeley',
    'harvard.edu': 'Harvard University',
    'ox.ac.uk': 'University of Oxford',
    'cam.ac.uk': 'University of Cambridge',
    'iitb.ac.in': 'IIT Bombay',
    'iitd.ac.in': 'IIT Delhi',
    'iitm.ac.in': 'IIT Madras',
    'cmu.edu': 'Carnegie Mellon University',
    'gatech.edu': 'Georgia Institute of Technology',
    'columbia.edu': 'Columbia University',
    'nyu.edu': 'New York University',
    'ucla.edu': 'UCLA',
    'toronto.edu': 'University of Toronto',
    'nus.edu.sg': 'National University of Singapore',
    'purdue.edu': 'Purdue University',
    'uiuc.edu': 'University of Illinois Urbana-Champaign'
  };

  /**
   * Validates if an email is an authentic educational / institutional email
   * Valid extensions: .edu, .ac.*, .edu.*, .college, .univ, etc.
   */
  function validateCollegeEmail(email) {
    if (!email || typeof email !== 'string') return { valid: false, reason: 'Email is required' };
    
    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return { valid: false, reason: 'Invalid email format' };
    }

    const domain = emailTrimmed.split('@')[1];

    // Explicitly reject standard commercial mailboxes
    const genericMailboxes = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'zoho.com'];
    if (genericMailboxes.includes(domain)) {
      return { 
        valid: false, 
        reason: 'Personal email addresses (@gmail, @yahoo, etc.) are not allowed. Please enter your College/University mail ID.' 
      };
    }

    // Check institutional patterns
    const isEduDomain = 
      domain.endsWith('.edu') || 
      domain.includes('.edu.') || 
      domain.endsWith('.ac.in') || 
      domain.endsWith('.ac.uk') || 
      domain.includes('.ac.') || 
      domain.endsWith('.res.in') ||
      domain.endsWith('.univ') ||
      domain.includes('college') ||
      domain.includes('campus');

    if (!isEduDomain) {
      return { 
        valid: false, 
        reason: 'Must be an institutional or college domain (e.g. yourname@college.edu or student@dept.ac.in)' 
      };
    }

    // Identify college name
    let detectedCollege = COLLEGE_DOMAIN_MAP[domain];
    if (!detectedCollege) {
      // Formulate a clean name from the domain (e.g. "mit.edu" -> "MIT", "vtu.ac.in" -> "VTU")
      const domainName = domain.split('.')[0].toUpperCase();
      detectedCollege = `${domainName} Institute / University`;
    }

    return {
      valid: true,
      domain,
      detectedCollege
    };
  }

  // Get active session
  function getCurrentUser() {
    return NoteXDB.getActiveUser();
  }

  // Check if someone is logged in
  function isAuthenticated() {
    return getCurrentUser() !== null;
  }

  // Login handler
  async function login(email, password) {
    const emailTrimmed = (email || '').trim().toLowerCase();
    if (!emailTrimmed || !password) {
      return { success: false, message: 'Please provide both college email and password.' };
    }

    await NoteXDB.init();
    try {
      const result = await NoteXDB.loginUser(emailTrimmed, password);
      NoteXDB.setActiveUser(result.user);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Register handler
  async function register({ fullName, email, password, branch, semester, college }) {
    if (!fullName || !fullName.trim()) {
      return { success: false, message: 'Please enter your full name.' };
    }

    const emailCheck = validateCollegeEmail(email);
    if (!emailCheck.valid) {
      return { success: false, message: emailCheck.reason };
    }

    if (!password || password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters long.' };
    }

    const assignedCollege = college || emailCheck.detectedCollege;

    try {
      const result = await NoteXDB.registerUser({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        college: assignedCollege,
        branch: branch || 'Computer Science & Engineering',
        semester: semester || 1
      });
      if (result.success) NoteXDB.setActiveUser(result.user);
      return result;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Logout
  function logout() {
    NoteXDB.setActiveUser(null);
    window.location.reload();
  }

  return {
    validateCollegeEmail,
    getCurrentUser,
    isAuthenticated,
    login,
    register,
    logout
  };
})();

window.NoteXAuth = NoteXAuth;
