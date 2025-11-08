import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseKey = 'YOUR_ANON_PUBLIC_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);
// Search functionality
const searchInput = document.getElementById('searchInput');
const patientCards = document.querySelectorAll('.patient-card');
const noResults = document.getElementById('noResults');
//asdasd
searchInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase().trim();
    let visibleCount = 0;

    patientCards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const mrn = card.getAttribute('data-mrn');
        
        if (name.includes(searchTerm) || mrn.includes(searchTerm)) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    // Show/hide no results message
    if (visibleCount === 0) {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
});

// Logout button functionality
const logoutBtn = document.querySelector('.logout-btn');
logoutBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to log out?')) {
        alert('Logging out...');
        // Here you would typically redirect to a login page
        // window.location.href = '/login';
    }
});

// Action button functionality (folder and document icons)
const actionButtons = document.querySelectorAll('.action-btn');
actionButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        e.stopPropagation();
        const patientCard = this.closest('.patient-card');
        const patientName = patientCard.getAttribute('data-name');
        
        // Check if it's a folder or document button based on SVG path
        const isFolderBtn = this.querySelector('svg path[d*="M22 19"]');
        
        if (isFolderBtn) {
            alert(`Opening folder for ${patientName}`);
        } else {
            alert(`Opening documents for ${patientName}`);
        }
    });
});

// Patient card click functionality
patientCards.forEach(card => {
    card.addEventListener('click', function() {
        const patientName = this.getAttribute('data-name');
        alert(`Opening consultation for ${patientName}`);
        // Here you would typically navigate to the patient's consultation page
        // window.location.href = `/consultation/${patientMRN}`;
    });
});

// Add hover effect highlight
patientCards.forEach(card => {
    card.style.cursor = 'pointer';
});
document.addEventListener('DOMContentLoaded', async () => {
  // Protect page (redirect if not logged in)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/index.html';
    return;
  }

  // Load patient data
  await loadPatients();
});

// Make sure Supabase is initialized before this
// Example:
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function loadPatients() {
  const patientList = document.getElementById('patientList');
  patientList.innerHTML = '<p>Loading patients...</p>'; // optional loader

  // 1️⃣ Fetch data from Supabase
  const { data: patients, error } = await supabase
    .from('patients')
    .select('patient_name, date_of_birth, mrn, visit_date');

  if (error) {
    console.error('Error fetching patients:', error);
    patientList.innerHTML = '<p>Error loading patients.</p>';
    return;
  }

  // 2️⃣ Handle empty list
  if (!patients || patients.length === 0) {
    patientList.innerHTML = '<p>No patients found.</p>';
    return;
  }

  // 3️⃣ Clear any placeholder
  patientList.innerHTML = '';

  // 4️⃣ Loop through and create styled cards
  patients.forEach(patient => {
    const card = document.createElement('div');
    card.className = 'patient-card';

    // Generate avatar initials (e.g. “John Smith” → “JS”)
    const initials = patient.patient_name
      .split(' ')
      .map(word => word[0].toUpperCase())
      .join('');

    // Convert visit date and DOB nicely
    const visitDate = new Date(patient.visit_date).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const dob = new Date(patient.date_of_birth).toLocaleDateString();

    // 5️⃣ Build inner HTML (reuses your design)
    card.innerHTML = `
      <div class="patient-left">
        <div class="patient-avatar avatar-blue">${initials}</div>
        <div class="patient-info">
          <h3 class="patient-name">${patient.patient_name}</h3>
          <div class="patient-details">
            <div>DOB: ${dob}, MRN: ${patient.mrn}</div>
            <div>Visit: ${visitDate}</div>
          </div>
        </div>
      </div>
      <div class="patient-right">
        <span class="status-badge status-waiting">Waiting</span>
        <button class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
        <button class="action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        </button>
      </div>
    `;

    // 6️⃣ Append card to the container
    patientList.appendChild(card);
  });
}

// Run automatically when page loads
document.addEventListener('DOMContentLoaded', loadPatients);

