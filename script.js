// script.js - Complete application with auth included

// Supabase configuration
const SUPABASE_URL = 'https://ahvoijugqchxwltmfqxf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodm9panVncWNoeHdsdG1mcXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MzQzNTIsImV4cCI6MjA4NjUxMDM1Mn0.JnbYypJNbRdoxj65icl_deDLu_FiZqGYAMEY9vZXjuk';

// Initialize Supabase client
let supabase;

// ===== AUTH FUNCTIONS =====

function initSupabase(supabaseUrl, supabaseAnonKey) {
  supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
}

async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// ===== APP INITIALIZATION =====

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize Supabase
  initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Check authentication status
  const session = await checkAuth();
  
  if (session) {
    showApp(session.user);
  } else {
    showAuth();
  }
  
  // Listen for auth changes
  onAuthStateChange((event, session) => {
    if (session) {
      showApp(session.user);
    } else {
      showAuth();
    }
  });
  
  // Character counter for hook input
  const hookInput = document.getElementById('hookInput');
  if (hookInput) {
    hookInput.addEventListener('input', updateCharCounter);
  }
});

// ===== UI FUNCTIONS =====

function showAuth() {
  document.getElementById('authContainer').style.display = 'block';
  document.getElementById('appContainer').classList.remove('active');
}

async function showApp(user) {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').classList.add('active');
  document.getElementById('userEmail').textContent = user.email;
  
  // Load usage stats
  await loadUsageStats();
}

function switchAuthTab(tab) {
  const loginTab = document.querySelector('.auth-tab:nth-child(1)');
  const signupTab = document.querySelector('.auth-tab:nth-child(2)');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (tab === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  }
  
  // Clear error messages
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('signupError').style.display = 'none';
  document.getElementById('signupSuccess').style.display = 'none';
}

// ===== AUTH HANDLERS =====

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    errorDiv.style.display = 'none';
    
    await signIn(email, password);
    
    // Success - auth state change will handle UI update
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
}

async function handleSignup(event) {
  event.preventDefault();
  
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const errorDiv = document.getElementById('signupError');
  const successDiv = document.getElementById('signupSuccess');
  const signupBtn = document.getElementById('signupBtn');
  
  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    await signUp(email, password);
    
    successDiv.textContent = 'Account created! Check your email to confirm, then log in.';
    successDiv.style.display = 'block';
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
    
    // Clear form
    document.getElementById('signupEmail').value = '';
    document.getElementById('signupPassword').value = '';
    
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
  }
}

async function handleLogout() {
  try {
    await signOut();
    showAuth();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// ===== UTILITY FUNCTIONS =====

function updateCharCounter() {
  const input = document.getElementById('hookInput');
  const counter = document.getElementById('charCounter');
  const length = input.value.length;
  
  counter.textContent = `${length} / 280`;
  
  if (length > 260) {
    counter.classList.add('warning');
  } else {
    counter.classList.remove('warning');
  }
}

async function loadUsageStats() {
  const rateLimitInfo = document.getElementById('rateLimitInfo');
  
  try {
    const user = await getCurrentUser();
    if (!user) return;
    
    // Call serverless function to get usage count
    const response = await fetch('/.netlify/functions/getUsage', {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load usage stats');
    }
    
    const data = await response.json();
    const remaining = 5 - data.count;
    
    rateLimitInfo.innerHTML = `<strong>${remaining} / 5</strong> analyses remaining today`;
    
  } catch (error) {
    rateLimitInfo.textContent = 'Usage stats unavailable';
  }
}

// ===== HOOK ANALYSIS =====

async function analyzeHook(event) {
  event.preventDefault();
  
  const input = document.getElementById('hookInput').value.trim();
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultsDiv = document.getElementById('results');
  const resultsContent = document.getElementById('resultsContent');
  const errorDiv = document.getElementById('appError');
  
  if (!input) return;
  
  if (input.length > 280) {
    errorDiv.textContent = 'Hook must be 280 characters or less.';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    errorDiv.style.display = 'none';
    resultsDiv.classList.remove('active');
    
    // Get auth token
    const session = await supabase.auth.getSession();
    const token = session.data.session.access_token;
    
    // Call serverless function
    const response = await fetch('/.netlify/functions/analyzeHook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ hook: input })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed');
    }
    
    // Display results
    resultsContent.textContent = data.analysis;
    resultsDiv.classList.add('active');
    
    // Reload usage stats
    await loadUsageStats();
    
    // Clear input
    document.getElementById('hookInput').value = '';
    updateCharCounter();
    
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.style.display = 'block';
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze Hook';
  }
}