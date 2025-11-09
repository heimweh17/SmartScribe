// Authentication Logic with Supabase
// This file handles login, signup, and password reset functionality

// Show loading state
function showLoading(button) {
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = 'Loading...';
}

// Hide loading state
function hideLoading(button) {
  button.disabled = false;
  button.textContent = button.dataset.originalText;
}

// Show error message
function showError(message) {
  // You can customize this to show a nicer error UI
  alert(message);
}

// Password visibility toggle
document.addEventListener('DOMContentLoaded', async function() {
  console.log('DOM loaded, checking Supabase...');

  // Check if Supabase is loaded
  if (typeof supabase === 'undefined') {
    console.error('Supabase client not loaded!');
    showError('Authentication system not initialized. Please refresh the page.');
    return;
  }

  console.log('Supabase loaded successfully');

  // Check if user is already logged in
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Session check:', session ? 'User is logged in' : 'No session', error);

    if (session) {
      // User is already logged in, redirect to dashboard
      console.log('Redirecting to Dashboard...');
      window.location.href = '/dashboard_screen/dashboard.html';
      return;
    }
  } catch (err) {
    console.error('Session check error:', err);
  }

  const togglePasswordButton = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.querySelector('.eye-icon');

  if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener('click', function() {
      // Toggle password visibility
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);

      // Toggle eye icon slash
      eyeIcon.classList.toggle('password-visible');
    });
  }

  // Form submission handler with Supabase
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Login form submitted');

      const email = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const loginButton = loginForm.querySelector('.login-button');

      console.log('Login attempt with email:', email);

      // Basic validation
      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      // Show loading state
      showLoading(loginButton);
      console.log('Calling Supabase signInWithPassword...');

      try {
        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        console.log('Supabase response:', { data, error });

        if (error) {
          throw error;
        }

        // Success! User is authenticated
        console.log('Login successful! User:', data.user);
        console.log('Session:', data.session);

        // Small delay to ensure session is saved
        await new Promise(resolve => setTimeout(resolve, 500));

        // Redirect to dashboard page
        console.log('Redirecting to dashboard_screen.html...');
        window.location.href = '/dashboard_screen/dashboard.html';

      } catch (error) {
        console.error('❌ Login error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', JSON.stringify(error, null, 2));

        hideLoading(loginButton);

        // Show detailed error messages
        if (error.message.includes('Invalid login credentials')) {
          showError('❌ Invalid email or password.\n\nPlease check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          showError('❌ Email not confirmed.\n\nPlease check your email and confirm your account before logging in.');
        } else if (error.message.includes('User not found')) {
          showError('❌ User not found.\n\nPlease check your email or sign up for a new account.');
        } else {
          showError(`❌ Login failed.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
        }
      }
    });
  }

  // Forgot password link handler
  const forgotPasswordLink = document.querySelector('.forgot-password');

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async function(e) {
      e.preventDefault();

      const email = document.getElementById('username').value;

      if (!email) {
        showError('Please enter your email address first.');
        return;
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password.html`,
        });

        if (error) {
          throw error;
        }

        alert('Password reset email sent! Please check your inbox.');
      } catch (error) {
        console.error('Password reset error:', error);
        showError('Failed to send password reset email. Please try again.');
      }
    });
  }

  // Sign up link handler - redirect to signup page
  const signupLink = document.querySelector('.signup-link');

  if (signupLink) {
    signupLink.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = 'signup.html';
    });
  }

  // Add enter key handler for better UX
  passwordInput?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      loginForm.dispatchEvent(new Event('submit'));
    }
  });
});

// Add subtle animation on load
window.addEventListener('load', function() {
  const loginCard = document.querySelector('.login-card');
  if (loginCard) {
    loginCard.style.opacity = '0';
    loginCard.style.transform = 'translateY(20px)';

    setTimeout(function() {
      loginCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      loginCard.style.opacity = '1';
      loginCard.style.transform = 'translateY(0)';
    }, 100);
  }
});
