// Password visibility toggle
document.addEventListener('DOMContentLoaded', function() {
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

  // Form submission handler
  const loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      // Basic validation
      if (!username || !password) {
        alert('Please enter both username and password.');
        return;
      }

      // Here you would typically make an API call to authenticate
      // For now, we'll just log the attempt and redirect
      console.log('Login attempt:', { username });

      // Example: Simple validation (replace with actual authentication)
      if (username && password) {
        // Store login state (in production, use proper session management)
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('username', username);

        // Redirect to main application
        window.location.href = '../index.html';
      }
    });
  }

  // Forgot password link handler
  const forgotPasswordLink = document.querySelector('.forgot-password');

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      // In production, this would open a password reset flow
      alert('Password reset functionality would be implemented here.\n\nPlease contact your system administrator.');
    });
  }

  // Sign up link handler
  const signupLink = document.querySelector('.signup-link');

  if (signupLink) {
    signupLink.addEventListener('click', function(e) {
      e.preventDefault();
      // In production, this would navigate to a registration page
      alert('New user registration would be implemented here.\n\nPlease contact your system administrator to create an account.');
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
