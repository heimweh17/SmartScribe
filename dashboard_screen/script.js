// Search functionality
const searchInput = document.getElementById('searchInput');
const patientCards = document.querySelectorAll('.patient-card');
const noResults = document.getElementById('noResults');

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
// Add click handlers to patient cards
document.addEventListener('DOMContentLoaded', function() {
    const patientCards = document.querySelectorAll('.patient-card');
    
    patientCards.forEach(card => {
        card.style.cursor = 'pointer';
        
        card.addEventListener('click', function(e) {
            // Don't navigate if clicking on action buttons
            if (e.target.closest('.action-btn')) {
                return;
            }
            
            const patientName = this.dataset.name;
            const patientMrn = this.dataset.mrn;
            
            // Navigate to patient details page with URL parameters
             window.location.href = `../patient-details.html?name=${encodeURIComponent(patientName)}&mrn=${patientMrn}`;
        });
    });
});
// Logout button functionality
const logoutBtn = document.querySelector('.logout-btn');
logoutBtn.addEventListener('click', function() {
    
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