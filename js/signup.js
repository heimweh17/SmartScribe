// Signup Logic with Supabase
// This file handles user registration functionality

// Show loading state
function showLoading(button) {
  button.disabled = true;
  button.dataset.originalText = button.textContent;
  button.textContent = 'Creating Account...';
}

// Hide loading state
function hideLoading(button) {
  button.disabled = false;
  button.textContent = button.dataset.originalText;
}

// Show error message
function showError(message) {
  alert(message);
}

// Show success message
function showSuccess(message) {
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

  // Password visibility toggles
  const togglePasswordButton = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');
  const eyeIcon = togglePasswordButton?.querySelector('.eye-icon');

  if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      eyeIcon.classList.toggle('password-visible');
    });
  }

  const togglePasswordConfirmButton = document.querySelector('.toggle-password-confirm');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const eyeIconConfirm = togglePasswordConfirmButton?.querySelector('.eye-icon');

  if (togglePasswordConfirmButton && confirmPasswordInput) {
    togglePasswordConfirmButton.addEventListener('click', function() {
      const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordInput.setAttribute('type', type);
      eyeIconConfirm.classList.toggle('password-visible');
    });
  }

  // Form submission handler with Supabase
  const signupForm = document.getElementById('signupForm');

  if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Signup form submitted');

      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const signupButton = signupForm.querySelector('.signup-button');

      console.log('Signup attempt with email:', email);

      // Validation
      if (!fullName || !email || !password || !confirmPassword) {
        showError('Please fill in all fields.');
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match. Please try again.');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }

      // Show loading state
      showLoading(signupButton);
      console.log('Calling Supabase signUp...');

      try {
        // Sign up with Supabase
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard_screen/dashboard.html`
          }
        });

        console.log('Supabase response:', { data, error });

        if (error) {
          throw error;
        }

        // Success! User account created
        console.log('Signup successful! User:', data.user);

        hideLoading(signupButton);

        // Check if email confirmation is required
        if (data.user && !data.session) {
          // Email confirmation required
          showSuccess('Account created successfully!\n\nPlease check your email to confirm your account before logging in.');

          // Redirect to login page after a delay
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        } else if (data.session) {
          // Auto-login enabled (no email confirmation required)
          showSuccess('Account created successfully! Redirecting to dashboard...');

          // Small delay to ensure session is saved
          await new Promise(resolve => setTimeout(resolve, 500));

          // Redirect to dashboard
          console.log('Redirecting to dashboard...');
          window.location.href = '/dashboard_screen/dashboard.html';
        } else {
          // Unexpected state
          showSuccess('Account created successfully! Please log in.');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 2000);
        }

      } catch (error) {
        console.error('Signup error:', error);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Full error:', JSON.stringify(error, null, 2));

        hideLoading(signupButton);

        // Show detailed error messages
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          showError('This email is already registered.\n\nPlease log in or use a different email address.');
        } else if (error.message.includes('invalid email')) {
          showError('Invalid email address.\n\nPlease enter a valid email.');
        } else if (error.message.includes('Password should be')) {
          showError('Password is too weak.\n\nPlease use a stronger password with at least 6 characters.');
        } else if (error.message.includes('rate limit')) {
          showError('Too many signup attempts.\n\nPlease wait a few minutes and try again.');
        } else {
          showError(`Signup failed.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
        }
      }
    });
  }

  // Add enter key handler for better UX
  confirmPasswordInput?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      signupForm.dispatchEvent(new Event('submit'));
    }
  });
});

// Add subtle animation on load
window.addEventListener('load', function() {
  const signupCard = document.querySelector('.signup-card');
  if (signupCard) {
    signupCard.style.opacity = '0';
    signupCard.style.transform = 'translateY(20px)';

    setTimeout(function() {
      signupCard.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      signupCard.style.opacity = '1';
      signupCard.style.transform = 'translateY(0)';
    }, 100);
  }
});
