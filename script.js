// API base URL
const API_BASE = 'http://localhost:3001/api';

// Collapsible sections
function toggleSection(id) {
  const el = document.getElementById(id);
  el.classList.toggle('collapsed');
}

// Quick-note chips
function addChip(text) {
  const ta = document.getElementById('quick-notes');
  ta.value = (ta.value ? ta.value + '\n' : '') + `• ${text}`;
}

// Fetch dynamic fields from backend
async function updateDynamic() {
  const chief = document.getElementById('chief').value;
  const container = document.getElementById('dynamic');
  container.innerHTML = '';

  if (!chief) return;

  try {
    // Call backend to get template fields
    const response = await fetch(`${API_BASE}/templates/${chief}`);
    const fields = await response.json();

    // Create form fields dynamically
    fields.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'form-row';
      
      const label = document.createElement('label');
      label.setAttribute('for', f.id);
      label.textContent = f.label;
      
      const input = document.createElement('input');
      input.id = f.id;
      input.type = 'text';
      input.placeholder = f.placeholder || `Enter ${f.label.toLowerCase()}...`;
      
      wrap.appendChild(label);
      wrap.appendChild(input);
      container.appendChild(wrap);
    });

    // Get AI suggestions for this chief complaint
    fetchSuggestions(chief);

  } catch (error) {
    console.error('Error fetching template:', error);
  }
}

// Fetch AI suggestions
async function fetchSuggestions(context) {
  try {
    const response = await fetch(`${API_BASE}/suggest?context=${context}`);
    const data = await response.json();
    
    if (data.suggestions && data.suggestions.length > 0) {
      updateSmartSuggestion(data.suggestions[0]);
    }
  } catch (error) {
    console.error('Error fetching suggestions:', error);
  }
}

// Update the smart suggestion box
function updateSmartSuggestion(suggestion) {
  const smartText = document.querySelector('.smart-text');
  const addButton = document.querySelector('.smart .btn.accent');
  
  smartText.textContent = suggestion;
  addButton.onclick = () => appendToPlan(suggestion);
}

// Generate SOAP note by calling backend
async function generateSOAP(e) {
  e.preventDefault();

  const chief = document.getElementById('chief').value;
  const hpi = document.getElementById('hpi').value.trim();
  const assessment = document.getElementById('assessment').value.trim();
  const plan = document.getElementById('plan').value.trim();

  // Collect dynamic field data
  const dynamicFields = [];
  const dynInputs = document.getElementById('dynamic').querySelectorAll('input');
  dynInputs.forEach(inp => {
    if (inp.value.trim()) {
      dynamicFields.push({
        label: inp.previousSibling.textContent,
        value: inp.value.trim()
      });
    }
  });

  // Build payload for backend
  const payload = {
    patient: {
      name: 'Annalise Keating', // Could be dynamic from form
      mrn: '987654321',
      dob: '1975-08-21'
    },
    chiefComplaint: chief,
    hpi: hpi,
    dynamicFields: dynamicFields,
    assessment: assessment,
    plan: plan,
    vitals: {
      bp: '120/80 mmHg',
      hr: '72 bpm', 
      temp: '98.6°F',
      o2: '98%'
    }
  };

  try {
    // Call backend to generate SOAP
    const response = await fetch(`${API_BASE}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.ok) {
      // Update the SOAP preview with backend response
      document.getElementById('soap-subjective').textContent = data.soap.subjective;
      document.getElementById('soap-objective').textContent = data.soap.objective;
      document.getElementById('soap-assessment').textContent = data.soap.assessment;
      document.getElementById('soap-plan').textContent = data.soap.plan;

      // Show success message
      showNotification('SOAP note generated successfully!', 'success');
    } else {
      showNotification('Error generating SOAP note', 'error');
    }

  } catch (error) {
    console.error('Error calling backend:', error);
    showNotification('Failed to connect to backend', 'error');
  }
}

// ICD-10 search with autocomplete
let searchTimeout;
function setupICD10Search() {
  const assessmentField = document.getElementById('assessment');
  
  assessmentField.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length < 2) return;
    
    searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/icd10?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        showSearchResults(results, assessmentField);
      } catch (error) {
        console.error('Error searching ICD-10:', error);
      }
    }, 300);
  });
}

// Show search results dropdown
function showSearchResults(results, inputField) {
  // Remove existing dropdown
  const existing = document.querySelector('.search-dropdown');
  if (existing) existing.remove();

  if (results.length === 0) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    width: ${inputField.offsetWidth}px;
    margin-top: 4px;
  `;

  results.forEach(result => {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--border);
    `;
    item.textContent = `${result.code} - ${result.name}`;
    
    item.addEventListener('click', () => {
      inputField.value = `${result.code} - ${result.name}`;
      dropdown.remove();
    });
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--uf-blue-700)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
    });

    dropdown.appendChild(item);
  });

  // Position dropdown
  const rect = inputField.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
  
  document.body.appendChild(dropdown);

  // Close dropdown when clicking outside
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== inputField) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }, 100);
}

// Utility functions
function clearForm() {
  document.getElementById('doc-form').reset();
  document.getElementById('dynamic').innerHTML = '';
  document.getElementById('soap-subjective').textContent = '—';
  document.getElementById('soap-objective').textContent = 'Vitals reviewed; exam to be documented.';
  document.getElementById('soap-assessment').textContent = '—';
  document.getElementById('soap-plan').textContent = '—';
}

function appendToPlan(text) {
  const plan = document.getElementById('plan');
  plan.value = plan.value ? plan.value + '\n' + text : text;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    z-index: 2000;
    background: ${type === 'success' ? 'var(--teal)' : type === 'error' ? 'var(--uf-orange)' : 'var(--uf-blue)'};
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  setupICD10Search();
  
  // Test backend connection
  fetch(`${API_BASE}/health`)
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        showNotification('Connected to UF SmartScribe API', 'success');
      }
    })
    .catch(error => {
      showNotification('Failed to connect to backend', 'error');
      console.error('Backend connection error:', error);
    });
});