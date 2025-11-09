// Supabase Configuration and Client Initialization
// This file sets up the Supabase client for authentication and database operations

// Note: In production, use environment variables or a secure config system
// For client-side apps, the anon key is safe to expose as it has Row Level Security (RLS)

// You'll need to replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api
const SUPABASE_URL = 'https://wfnfenamljihdgdmoyoy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmbmZlbmFtbGppaGRnZG1veW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MTcwNjMsImV4cCI6MjA3ODE5MzA2M30.516EJYAbNSYXdaiHLkVgjE1Ah8yQmLQhQPVEsgOLqoY';

// Initialize Supabase client
// Make sure to include the Supabase JS library in your HTML before this script
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files (if using modules)
// For regular script tags, supabase will be available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase };
}

// Helper function to check if user is authenticated
async function isUserAuthenticated() {
  const { data: { user } } = await supabase.auth.getUser();
  return user !== null;
}

// Helper function to get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Helper function to get current session
async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Sign out helper
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    return false;
  }
  return true;
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);

  // Handle different auth events
  switch(event) {
    case 'SIGNED_IN':
      console.log('User signed in:', session.user);
      break;
    case 'SIGNED_OUT':
      console.log('User signed out');
      // Redirect to login page if not already there
      if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('/')) {
        window.location.href = '/index.html';
      }
      break;
    case 'TOKEN_REFRESHED':
      console.log('Token refreshed');
      break;
    case 'USER_UPDATED':
      console.log('User updated');
      break;
  }
});

// Protect pages that require authentication
async function protectPage() {
  const authenticated = await isUserAuthenticated();

  // List of pages that don't require authentication
  const publicPages = ['/', '/index.html'];
  const currentPath = window.location.pathname;

  if (!authenticated && !publicPages.some(page => currentPath.endsWith(page))) {
    // User is not authenticated and trying to access protected page
    window.location.href = '/index.html';
  }
}

// Call protectPage on load for protected pages
// Add this script to pages that require authentication
