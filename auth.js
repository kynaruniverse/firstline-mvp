// auth.js - Supabase Authentication Handler
// Handles: signup, login, logout, session management

// Initialize Supabase client
// These values will be loaded from index.html where we inject them from Netlify env vars
let supabase;

function initSupabase(supabaseUrl, supabaseAnonKey) {
  supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
}

// Check if user is authenticated
async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Sign up new user
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

// Sign in existing user
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

// Sign out current user
async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error(error.message);
  }
}

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Listen for auth state changes
function onAuthStateChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}