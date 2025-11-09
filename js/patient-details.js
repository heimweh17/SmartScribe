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

// Get patient info from URL parameters
function getPatientFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    name: urlParams.get('name'),
    mrn: urlParams.get('mrn')
  };
}

// Update patient display
function displayPatientInfo() {
  const patient = getPatientFromURL();
  
  if (patient.name && patient.mrn) {
    // Update patient card in sidebar
    const nameEl = document.querySelector('.patient-card .name');
    const mrnEl = document.querySelector('.patient-card .mrn');
    const avatarEl = document.querySelector('.patient-card .avatar');
    
    if (nameEl) nameEl.textContent = patient.name;
    if (mrnEl) mrnEl.textContent = `MRN: ${patient.mrn}`;
    
    // Update avatar initials
    if (avatarEl) {
      const initials = patient.name.split(' ').map(n => n[0]).join('');
      avatarEl.textContent = initials;
    }
  }
}

// Show notification
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
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#FA4616' : '#0021A5'};
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// ==========================================
// TRANSCRIPTION INTEGRATION
// ==========================================

let transcription = null;
let isRecording = false;
let durationInterval = null;

// Initialize transcription system
function initializeTranscription() {
  // Check if transcription elements exist
  const startBtn = document.getElementById('start-recording');
  const stopBtn = document.getElementById('stop-recording');
  const clearBtn = document.getElementById('clear-transcript');
  const exportBtn = document.getElementById('export-transcript');
  
  if (!startBtn) {
    console.warn('Transcription buttons not found - skipping transcription setup');
    return;
  }

  // Check if MedicalTranscription class exists
  if (typeof MedicalTranscription === 'undefined') {
    console.error('MedicalTranscription class not loaded');
    return;
  }

  // Create transcription instance
  transcription = new MedicalTranscription();
  console.log('✅ Transcription system initialized');

  // Start Recording Button
  // --- 🟢 Add Consent Modal ---
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div id="consent-modal" class="modal">
      <div class="modal-content">
        <h2>Patient Consent</h2>
        <p class="consent-text">
          Do you consent to being recorded for medical documentation and transcription purposes?
        </p>
        <div class="modal-buttons">
          <button id="consent-yes" class="btn accent">Yes, I consent</button>
          <button id="consent-no" class="btn">No</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const modalEl = document.getElementById('consent-modal');

  function openConsentModal() {
    modalEl.style.display = 'flex';
  }
  function closeConsentModal() {
    modalEl.style.display = 'none';
  }

  // Start Recording Button
  startBtn.addEventListener('click', async () => {
    // show the consent modal first
    openConsentModal();

    // wait for consent response
    const consent = await new Promise((resolve) => {
      document.getElementById('consent-yes').onclick = () => resolve(true);
      document.getElementById('consent-no').onclick = () => resolve(false);
    });

    closeConsentModal();
    if (!consent) {
      showNotification('⚠️ Recording canceled — patient did not consent', 'warning');
      return;
    }

    try {
      console.log('Starting recording...');

      await transcription.start((segment) => {
        if (segment.isFinal) {
          addMessageToChat(segment);
        } else {
          showTypingPreview(segment);
        }
      });

      // Update UI
      isRecording = true;
      startBtn.style.display = 'none';
      stopBtn.style.display = 'inline-block';
      clearBtn.style.display = 'inline-block';
      exportBtn.style.display = 'inline-block';
      document.getElementById('recording-duration').style.display = 'inline';

      // Clear initial message
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer.querySelector('p')) {
        chatContainer.innerHTML = '';
      }

      // Start duration counter
      startDurationCounter();
      showNotification('🎙️ Recording started', 'success');
      
    } catch (error) {
      console.error('Error starting recording:', error);

      if (error.message.includes('Permission denied') || error.message.includes('NotAllowedError')) {
        showNotification('❌ Please allow microphone access', 'error');
      } else if (error.message.includes('NotFoundError')) {
        showNotification('❌ No microphone found', 'error');
      } else {
        showNotification('❌ Failed to start: ' + error.message, 'error');
      }
    }
  });

  // Stop Recording Button
  stopBtn.addEventListener('click', async () => {
    await stopRecording();
  });

  // Clear Transcript Button
  clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the transcript?')) {
      clearTranscript();
    }
  });

  // Export Transcript Button
  exportBtn.addEventListener('click', () => {
    exportTranscript();
  });
}

// Stop recording
async function stopRecording() {
  if (!isRecording) return;

  try {
    console.log('Stopping recording...');
    await transcription.stop();

    // Update UI
    isRecording = false;
    document.getElementById('start-recording').style.display = 'inline-block';
    document.getElementById('stop-recording').style.display = 'none';
    document.getElementById('recording-duration').style.display = 'none';
    
    // Stop duration counter
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    // Clear typing preview
    const preview = document.getElementById('typing-preview');
    if (preview) preview.textContent = '';

    // Get final transcript
    const finalTranscript = transcription.getTranscript();
    console.log('Recording stopped. Total segments:', finalTranscript.length);

    // Save to backend if available
    if (finalTranscript.length > 0) {
      await saveTranscriptToBackend(finalTranscript);
    }

    showNotification('⏹️ Recording stopped', 'success');

    // Automatically ask AI to extract sidebar fields (demographics, vitals, meds, problems)
    try {
      const patientInfo = getPatientFromURL();
      if (aiSummary && typeof aiSummary.generateSidebarData === 'function') {
        document.getElementById('ai-status').textContent = 'Extracting sidebar data...';
        const sidebarData = await aiSummary.generateSidebarData(finalTranscript, patientInfo);
        populateSidebarWithAI(sidebarData);
        document.getElementById('ai-status').textContent = 'Ready';
      }
    } catch (err) {
      console.error('Error extracting sidebar data:', err);
      document.getElementById('ai-status').textContent = 'Error';
    }

  } catch (error) {
    console.error('Error stopping recording:', error);
    showNotification('❌ Error stopping recording', 'error');
  }
}

// Add message to chat UI
function addMessageToChat(segment) {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `transcript-message ${segment.speaker.toLowerCase()}`;
  messageDiv.style.cssText = `
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 8px;
    background: ${segment.speaker === 'Doctor' ? 'rgba(0, 33, 165, 0.1)' : 'rgba(250, 70, 22, 0.1)'};
    border-left: 3px solid ${segment.speaker === 'Doctor' ? '#0021A5' : '#FA4616'};
    animation: slideIn 0.3s ease-out;
  `;

  messageDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
      <strong style="color: ${segment.speaker === 'Doctor' ? '#0021A5' : '#FA4616'}; font-size: 0.95em;">
        ${segment.speaker}
      </strong>
      <span style="color: #888; font-size: 0.85em;">
        ${segment.timestamp}
      </span>
    </div>
    <div style="color: white; line-height: 1.5;">
      ${segment.text}
    </div>
  `;

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Show typing preview
function showTypingPreview(segment) {
  const preview = document.getElementById('typing-preview');
  if (!preview) return;
  
  preview.innerHTML = `
    <span style="color: ${segment.speaker === 'Doctor' ? '#0021A5' : '#FA4616'};">
      ${segment.speaker}
    </span> is speaking: <span style="opacity: 0.7;">${segment.text}...</span>
  `;
}

// Start duration counter
function startDurationCounter() {
  const durationDisplay = document.getElementById('recording-duration');
  if (!durationDisplay) return;
  
  durationInterval = setInterval(() => {
    if (transcription && isRecording) {
      durationDisplay.textContent = transcription.getFormattedDuration();
    }
  }, 1000);
}

// Clear transcript
function clearTranscript() {
  const chatContainer = document.getElementById('chat-container');
  if (!chatContainer) return;
  
  chatContainer.innerHTML = `
    <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
      Click "Start Recording" to begin transcription
    </p>
  `;
  
  if (transcription) {
    transcription.clearTranscript();
  }
  
  const preview = document.getElementById('typing-preview');
  if (preview) preview.textContent = '';
  
  const clearBtn = document.getElementById('clear-transcript');
  const exportBtn = document.getElementById('export-transcript');
  if (clearBtn) clearBtn.style.display = 'none';
  if (exportBtn) exportBtn.style.display = 'none';
  
  showNotification('Transcript cleared', 'success');
}

// Export transcript
function exportTranscript() {
  if (!transcription) return;
  
  const patient = getPatientFromURL();
  const transcript = transcription.getFormattedTranscript();
  
  if (!transcript || transcript.trim() === '') {
    showNotification('No transcript to export', 'error');
    return;
  }
  
  const content = `
UF Health SmartScribe - Consultation Transcript
==============================================

Patient: ${patient.name || 'Unknown'}
MRN: ${patient.mrn || 'Unknown'}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}
Duration: ${transcription.getFormattedDuration()}

Transcript:
-----------

${transcript}

==============================================
Generated by UF Health SmartScribe
`;
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcript-${patient.mrn || 'unknown'}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  showNotification('📄 Transcript exported', 'success');
}

// Save transcript to backend
async function saveTranscriptToBackend(transcript) {
  const patient = getPatientFromURL();
  
  if (!patient.mrn) {
    console.warn('No patient MRN - skipping backend save');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_mrn: patient.mrn,
        patient_name: patient.name,
        transcript: transcript,
        duration_seconds: transcription.getDuration() / 1000,
        recorded_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      console.log('✅ Transcript saved to backend');
    }
  } catch (error) {
    console.error('Error saving transcript:', error);
  }
}

// ==========================================
// AI MEDICAL SUMMARY INTEGRATION
// ==========================================

let aiSummary = null;

// Display summary - DEFINED BEFORE IT'S USED
function displaySummary(soapNote, quickSummary) {
  // Show container
  document.getElementById('summary-container').style.display = 'block';

  // Display SOAP sections
  document.getElementById('soap-subjective').textContent = soapNote.subjective || 'Not documented';
  document.getElementById('soap-objective').textContent = soapNote.objective || 'Not documented';
  document.getElementById('soap-assessment').textContent = soapNote.assessment || 'Not documented';
  document.getElementById('soap-plan').textContent = soapNote.plan || 'Not documented';

  // Show action buttons
  document.getElementById('copy-summary-btn').style.display = 'inline-block';
  document.getElementById('export-summary-btn').style.display = 'inline-block';
  document.getElementById('save-summary-btn').style.display = 'inline-block';
}

// Display recommendations - DEFINED BEFORE IT'S USED
function displayRecommendations(recommendations) {
  document.getElementById('rec-medications').textContent = recommendations.medications || 'None needed';
  document.getElementById('rec-lifestyle').textContent = recommendations.lifestyle || 'None needed';
  document.getElementById('rec-followup').textContent = recommendations.followup || 'None needed';
  document.getElementById('rec-education').textContent = recommendations.education || 'None needed';
  document.getElementById('rec-tests').textContent = recommendations.tests || 'None needed';
  document.getElementById('rec-referrals').textContent = recommendations.referrals || 'None needed';
}

// Initialize AI summary system
function initializeAISummary() {
  // Check if AI summary elements exist
  const generateBtn = document.getElementById('generate-summary-btn');
  
  if (!generateBtn) {
    console.warn('AI summary buttons not found - skipping AI setup');
    return;
  }

  // Check if AIMedicalSummary class exists
  if (typeof AIMedicalSummary === 'undefined') {
    console.error('AIMedicalSummary class not loaded');
    return;
  }

  // Create AI summary instance
  aiSummary = new AIMedicalSummary();
  console.log('✅ AI Medical Summary system initialized');

  // Generate Summary Button
  generateBtn.addEventListener('click', async () => {
    await generateMedicalSummary();
  });

  // Copy Summary Button
  const copyBtn = document.getElementById('copy-summary-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      copySummaryToClipboard();
    });
  }

  // Export Summary Button
  const exportBtn = document.getElementById('export-summary-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportSummaryToPDF();
    });
  }

  // Save Summary Button
  const saveBtn = document.getElementById('save-summary-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveSummaryToChart();
    });
  }
}

// Generate medical summary
async function generateMedicalSummary() {
  if (!transcription) {
    showNotification('❌ No transcription available', 'error');
    return;
  }

  const transcript = transcription.getTranscript();

  if (transcript.length === 0) {
    showNotification('❌ Transcript is empty. Record a conversation first.', 'error');
    return;
  }

  // Get patient info
  const patientInfo = getPatientFromURL();

  // Show loading
  document.getElementById('generate-summary-btn').disabled = true;
  document.getElementById('summary-loading').style.display = 'block';
  document.getElementById('summary-container').style.display = 'none';
  document.getElementById('ai-status').textContent = 'Generating...';

  try {
    console.log('🤖 Generating medical summary...');

    // Generate SOAP note
    const soapNote = await aiSummary.generateSummary(transcript, patientInfo);

    // Generate quick summary (we still generate it but don't display it)
    const quickSummary = await aiSummary.generateQuickSummary(transcript);

    // Display results
    displaySummary(soapNote, quickSummary);

    // Generate and display recommendations
    document.getElementById('recommendations-status').textContent = 'Generating...';
    const recommendations = await aiSummary.generateRecommendations(transcript, soapNote, patientInfo);
    displayRecommendations(recommendations);
    document.getElementById('recommendations-status').textContent = '';

    showNotification('✅ Summary and recommendations generated', 'success');
    document.getElementById('ai-status').textContent = 'Ready';

  } catch (error) {
    console.error('❌ Error generating summary:', error);
    showNotification('❌ Failed to generate summary: ' + error.message, 'error');
    document.getElementById('ai-status').textContent = 'Error';
  } finally {
    document.getElementById('generate-summary-btn').disabled = false;
    document.getElementById('summary-loading').style.display = 'none';
  }
}

// Copy summary to clipboard
function copySummaryToClipboard() {
  const subjective = document.getElementById('soap-subjective').textContent;
  const objective = document.getElementById('soap-objective').textContent;
  const assessment = document.getElementById('soap-assessment').textContent;
  const plan = document.getElementById('soap-plan').textContent;

  const fullText = `SUBJECTIVE:\n${subjective}\n\nOBJECTIVE:\n${objective}\n\nASSESSMENT:\n${assessment}\n\nPLAN:\n${plan}`;

  navigator.clipboard.writeText(fullText).then(() => {
    showNotification('📋 Summary copied to clipboard', 'success');
  }).catch(err => {
    showNotification('❌ Failed to copy', 'error');
  });
}

// Populate sidebar DOM with AI-extracted data
function populateSidebarWithAI(data) {
  if (!data || typeof data !== 'object') return;

  // Demographics
  try {
    if (data.demographics) {
      const dobEl = document.getElementById('demo-dob');
      const ccEl = document.getElementById('demo-cc');
      const pharmacyEl = document.getElementById('demo-pharmacy');
      const nameEl = document.querySelector('.patient-card .name');
      const mrnEl = document.querySelector('.patient-card .mrn');

      if (nameEl && data.demographics.name) nameEl.textContent = data.demographics.name;
      if (mrnEl && data.demographics.mrn) mrnEl.textContent = `MRN: ${data.demographics.mrn}`;
      if (dobEl && data.demographics.dob) dobEl.textContent = new Date(data.demographics.dob).toLocaleDateString();
      if (ccEl && data.chief_complaint) ccEl.textContent = data.chief_complaint;
      if (pharmacyEl && data.primary_pharmacy) pharmacyEl.textContent = data.primary_pharmacy;
    }

    // Vitals
    if (data.vitals) {
      const bpEl = document.getElementById('vitals-bp');
      const hrEl = document.getElementById('vitals-hr');
      const tempEl = document.getElementById('vitals-temp');
      const o2El = document.getElementById('vitals-o2');

      if (bpEl && (data.vitals.bp_systolic || data.vitals.bp_diastolic)) {
        const s = data.vitals.bp_systolic || '--';
        const d = data.vitals.bp_diastolic || '--';
        bpEl.textContent = `${s}/${d} mmHg`;
      }
      if (hrEl && data.vitals.heart_rate) hrEl.textContent = `${data.vitals.heart_rate} bpm`;
      if (tempEl && data.vitals.temperature) tempEl.textContent = `${data.vitals.temperature}°${data.vitals.temperature_unit || 'F'}`;
      if (o2El && data.vitals.o2_saturation) o2El.textContent = `${data.vitals.o2_saturation}%`;
    }

    // Allergies & medications
    if (Array.isArray(data.allergies)) {
      const allergyEl = document.querySelector('#allergy .row:nth-child(1) span:last-child');
      if (allergyEl) allergyEl.textContent = data.allergies.length ? data.allergies.join(', ') : 'None noted';
    }

    if (Array.isArray(data.medications)) {
      const medsEl = document.querySelector('#allergy .row:nth-child(2) span:last-child');
      if (medsEl) medsEl.textContent = data.medications.length ? data.medications.join(', ') : 'None noted';
    }

    // Active problems / History
    if (Array.isArray(data.active_problems)) {
      const condEl = document.querySelector('#history .row:nth-child(1) span:last-child');
      if (condEl) condEl.textContent = data.active_problems.length ? data.active_problems.map(p => p.condition).join(', ') : 'None listed';
    }

    // Care gaps (not shown explicitly, but can surface as a notification)
    if (Array.isArray(data.care_gaps) && data.care_gaps.length) {
      showNotification(`⚠️ AI detected ${data.care_gaps.length} care gap(s)`, 'info');
    }
  } catch (err) {
    console.error('Error populating sidebar with AI data', err);
  }
}

// Export summary to file
function exportSummaryToPDF() {
  const patient = getPatientFromURL();
  const subjective = document.getElementById('soap-subjective').textContent;
  const objective = document.getElementById('soap-objective').textContent;
  const assessment = document.getElementById('soap-assessment').textContent;
  const plan = document.getElementById('soap-plan').textContent;

  const content = `
UF Health SmartScribe - Medical Summary
========================================

Patient: ${patient.name || 'Unknown'}
MRN: ${patient.mrn || 'Unknown'}
Date: ${new Date().toLocaleDateString()}
Time: ${new Date().toLocaleTimeString()}

SOAP NOTE
---------

SUBJECTIVE:
${subjective}

OBJECTIVE:
${objective}

ASSESSMENT:
${assessment}

PLAN:
${plan}

========================================
Generated by UF Health SmartScribe AI
`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `medical-summary-${patient.mrn || 'unknown'}-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  showNotification('📄 Summary exported', 'success');
}

// Save summary to backend - UPDATED
async function saveSummaryToChart() {
  try {
    await saveCompleteConsultation();
  } catch (error) {
    console.error('Error saving consultation:', error);
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize on page load
// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing patient details page...');
  
  displayPatientInfo();
  initializeTranscription();
  initializeAISummary();
  
  // Load consultation if specified
  const urlParams = new URLSearchParams(window.location.search);
  const consultationId = urlParams.get('consultation_id');
  const patientMRN = urlParams.get('mrn');
  
  if (consultationId) {
    await loadConsultationById(consultationId);
  } else if (patientMRN) {
    await loadLatestConsultation(patientMRN);
  }
});

// Warn before leaving if recording
window.addEventListener('beforeunload', (e) => {
  if (isRecording) {
    e.preventDefault();
    e.returnValue = 'Recording in progress. Are you sure you want to leave?';
  }
});

// ==========================================
// CONSULTATION SAVE/LOAD SYSTEM
// ==========================================

/**
 * Gather all patient data from the sidebar
 */
function gatherPatientData() {
  const demographics = {
    dob: document.querySelector('#demo .section-body .row:nth-child(1) span:last-child')?.textContent || '',
    chiefComplaint: document.querySelector('#demo .section-body .row:nth-child(2) span:last-child')?.textContent || '',
    primaryPharmacy: document.querySelector('#demo .section-body .row:nth-child(3) span:last-child')?.textContent || ''
  };

  const vitals = {
    bp: document.querySelector('#vitals .section-body .row:nth-child(1) span:last-child')?.textContent || '',
    hr: document.querySelector('#vitals .section-body .row:nth-child(2) span:last-child')?.textContent || '',
    temp: document.querySelector('#vitals .section-body .row:nth-child(3) span:last-child')?.textContent || '',
    o2_sat: document.querySelector('#vitals .section-body .row:nth-child(4) span:last-child')?.textContent || ''
  };

  const allergiesMeds = {
    allergies: document.querySelector('#allergy .section-body .row:nth-child(1) span:last-child')?.textContent || '',
    currentMedications: document.querySelector('#allergy .section-body .row:nth-child(2) span:last-child')?.textContent || ''
  };

  const history = {
    conditions: document.querySelector('#history .section-body .row:nth-child(1) span:last-child')?.textContent || '',
    lastVisit: document.querySelector('#history .section-body .row:nth-child(2) span:last-child')?.textContent || ''
  };

  const quickNotes = document.getElementById('quick-notes')?.value || '';

  return { demographics, vitals, allergiesMeds, history, quickNotes };
}

/**
 * Generate formatted transcript HTML
 */
function generateTranscriptHTML(transcript) {
  if (!transcript || transcript.length === 0) {
    return '';
  }

  let html = '';
  transcript.forEach(segment => {
    const speakerColor = segment.speaker === 'Doctor' ? '#0021A5' : '#FA4616';
    const bgColor = segment.speaker === 'Doctor' ? 'rgba(0, 33, 165, 0.1)' : 'rgba(250, 70, 22, 0.1)';

    html += `
      <div style="margin-bottom: 12px; padding: 12px; border-radius: 8px; background: ${bgColor}; border-left: 3px solid ${speakerColor};">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; align-items: center;">
          <strong style="color: ${speakerColor}; font-size: 0.95em;">${segment.speaker}</strong>
          <span style="color: #888; font-size: 0.85em;">${segment.timestamp}</span>
        </div>
        <div style="color: #ffffff; line-height: 1.5;">${segment.text}</div>
      </div>
    `;
  });

  return html;
}

/**
 * Save complete consultation to Supabase
 */
async function saveCompleteConsultation() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('You must be logged in');
    }

    const patient = getPatientFromURL();
    if (!patient.mrn) {
      throw new Error('Patient MRN not found');
    }

    const patientData = gatherPatientData();
    const transcript = transcription ? transcription.getTranscript() : [];
    const transcriptHTML = generateTranscriptHTML(transcript);

    // Get SOAP note for demographics extraction
    const soapNote = {
      subjective: document.getElementById('soap-subjective')?.textContent || '',
      objective: document.getElementById('soap-objective')?.textContent || '',
      assessment: document.getElementById('soap-assessment')?.textContent || '',
      plan: document.getElementById('soap-plan')?.textContent || ''
    };

    // Extract and save demographics if transcript and SOAP note exist
    if (transcript.length > 0 && (soapNote.subjective || soapNote.objective || soapNote.assessment || soapNote.plan)) {
      try {
        console.log('🔍 Extracting demographics from transcript and SOAP note...');
        await extractAndSaveDemographics(transcript, soapNote, patient, user.id);
      } catch (demographicsError) {
        console.warn('⚠️ Failed to extract demographics:', demographicsError);
        // Continue with consultation save even if demographics extraction fails
      }
    }

    const consultationData = {
      user_id: user.id,
      patient_mrn: patient.mrn,
      patient_name: patient.name,
      date_of_birth: patientData.demographics.dob,
      chief_complaint: patientData.demographics.chiefComplaint,
      primary_pharmacy: patientData.demographics.primaryPharmacy,
      bp: patientData.vitals.bp,
      hr: patientData.vitals.hr,
      temp: patientData.vitals.temp,
      o2_sat: patientData.vitals.o2_sat,
      allergies: patientData.allergiesMeds.allergies,
      current_medications: patientData.allergiesMeds.currentMedications,
      medical_conditions: patientData.history.conditions,
      last_visit: patientData.history.lastVisit,
      transcript: transcript,
      transcript_html: transcriptHTML,
      recording_duration_seconds: transcription ? transcription.getDuration() / 1000 : 0,
      soap_subjective: soapNote.subjective,
      soap_objective: soapNote.objective,
      soap_assessment: soapNote.assessment,
      soap_plan: soapNote.plan,
      rec_medications: document.getElementById('rec-medications')?.textContent || '',
      rec_lifestyle: document.getElementById('rec-lifestyle')?.textContent || '',
      rec_followup: document.getElementById('rec-followup')?.textContent || '',
      rec_education: document.getElementById('rec-education')?.textContent || '',
      rec_tests: document.getElementById('rec-tests')?.textContent || '',
      rec_referrals: document.getElementById('rec-referrals')?.textContent || '',
      quick_notes: patientData.quickNotes,
      consultation_date: new Date().toISOString()
    };

    console.log('💾 Saving consultation...');

    const { data, error } = await supabase
      .from('consultations')
      .insert([consultationData])
      .select();

    if (error) throw error;

    console.log('✅ Saved:', data);
    showNotification('💾 Consultation saved!', 'success');
    return data[0];

  } catch (error) {
    console.error('❌ Error:', error);
    showNotification('❌ Failed to save: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Extract demographics using AI and save/update patient record
 */
async function extractAndSaveDemographics(transcript, soapNote, patientInfo, userId) {
  if (!aiSummary || typeof aiSummary.extractDemographics !== 'function') {
    console.warn('AI summary system not available for demographics extraction');
    return;
  }

  try {
    // Extract demographics using Gemini
    const extractedData = await aiSummary.extractDemographics(transcript, soapNote, patientInfo);
    
    if (!extractedData || !extractedData.demographics) {
      console.warn('No demographics extracted');
      return;
    }

    const demographics = extractedData.demographics;
    const medicalInfo = extractedData.medical_info || {};
    const vitals = extractedData.vitals || {};

    // Check if patient exists in patients table
    const { data: existingPatient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('mrn', patientInfo.mrn)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw fetchError;
    }

    // Prepare update data - only include fields that have values
    const updateData = {
      patient_name: demographics.name || patientInfo.name || null,
      mrn: demographics.mrn || patientInfo.mrn || null,
      visit_date: new Date().toISOString()
    };

    // Add user_id if the column exists (optional column)
    try {
      // Check if user_id column exists by trying to query it
      const testQuery = await supabase.from('patients').select('user_id').limit(1);
      if (!testQuery.error) {
        updateData.user_id = userId;
      }
    } catch (e) {
      // user_id column doesn't exist, skip it
      console.log('user_id column not found in patients table, skipping');
    }

    // Add date_of_birth if available (required field)
    if (demographics.date_of_birth) {
      updateData.date_of_birth = demographics.date_of_birth;
    } else {
      // date_of_birth is required, use a placeholder if not available
      updateData.date_of_birth = '1900-01-01';
    }

    // If patient exists, only update empty/null fields
    if (existingPatient) {
      // Only update fields that are null or empty in existing record
      const fieldsToUpdate = {};
      
      // Check if date_of_birth needs updating (only if current is placeholder or null)
      const currentDob = existingPatient.date_of_birth;
      const isPlaceholderDob = currentDob === '1900-01-01' || currentDob === null || !currentDob;
      if (isPlaceholderDob && demographics.date_of_birth && demographics.date_of_birth !== '1900-01-01') {
        fieldsToUpdate.date_of_birth = demographics.date_of_birth;
      }
      
      // Update name if empty
      if ((!existingPatient.patient_name || existingPatient.patient_name.trim() === '') && demographics.name) {
        fieldsToUpdate.patient_name = demographics.name;
      }

      // Always update visit_date
      fieldsToUpdate.visit_date = new Date().toISOString();

      // Update patient if there are fields to update
      if (Object.keys(fieldsToUpdate).length > 0) {
        const { error: updateError } = await supabase
          .from('patients')
          .update(fieldsToUpdate)
          .eq('mrn', patientInfo.mrn);

        if (updateError) throw updateError;
        console.log('✅ Updated existing patient demographics:', fieldsToUpdate);
      } else {
        console.log('ℹ️ Patient exists, no empty fields to fill');
      }
    } else {
      // Patient doesn't exist, create new record
      const { error: insertError } = await supabase
        .from('patients')
        .insert([updateData]);

      if (insertError) {
        // If insert fails due to user_id, try without it
        if (insertError.message && insertError.message.includes('user_id')) {
          delete updateData.user_id;
          const { error: retryError } = await supabase
            .from('patients')
            .insert([updateData]);
          if (retryError) throw retryError;
        } else {
          throw insertError;
        }
      }
      console.log('✅ Created new patient record:', updateData);
    }

    // Store extended demographics in consultations table or a separate demographics table
    // For now, we'll log it - you can extend this to save to a demographics table if needed
    console.log('📊 Extracted demographics:', {
      demographics,
      medicalInfo,
      vitals
    });

  } catch (error) {
    console.error('❌ Error extracting/saving demographics:', error);
    throw error;
  }
}

/**
 * Load latest consultation
 */
async function loadLatestConsultation(patientMRN) {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_mrn', patientMRN)
      .order('consultation_date', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    populatePageWithConsultation(data[0]);
    return data[0];

  } catch (error) {
    console.error('Error loading:', error);
    return null;
  }
}

/**
 * Load specific consultation by ID
 */
async function loadConsultationById(consultationId) {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (error) throw error;
    if (data) populatePageWithConsultation(data);
    return data;

  } catch (error) {
    console.error('Error loading:', error);
    return null;
  }
}

/**
 * Populate page with saved data
 */
function populatePageWithConsultation(consultation) {
  const quickNotesEl = document.getElementById('quick-notes');
  if (quickNotesEl && consultation.quick_notes) {
    quickNotesEl.value = consultation.quick_notes;
  }

  if (consultation.soap_subjective && consultation.soap_subjective !== 'Not documented') {
    document.getElementById('soap-subjective').textContent = consultation.soap_subjective;
    document.getElementById('soap-objective').textContent = consultation.soap_objective || 'Not documented';
    document.getElementById('soap-assessment').textContent = consultation.soap_assessment || 'Not documented';
    document.getElementById('soap-plan').textContent = consultation.soap_plan || 'Not documented';
    
    document.getElementById('summary-container').style.display = 'block';
    document.getElementById('copy-summary-btn').style.display = 'inline-block';
    document.getElementById('export-summary-btn').style.display = 'inline-block';
    document.getElementById('save-summary-btn').style.display = 'inline-block';
  }

  if (consultation.rec_medications && consultation.rec_medications !== '—') {
    document.getElementById('rec-medications').textContent = consultation.rec_medications;
    document.getElementById('rec-lifestyle').textContent = consultation.rec_lifestyle || '—';
    document.getElementById('rec-followup').textContent = consultation.rec_followup || '—';
    document.getElementById('rec-education').textContent = consultation.rec_education || '—';
    document.getElementById('rec-tests').textContent = consultation.rec_tests || '—';
    document.getElementById('rec-referrals').textContent = consultation.rec_referrals || '—';
  }

  showNotification('📄 Loaded previous consultation', 'success');
}

// ==========================================
// MISSING DEMOGRAPHICS CHECKER
// ==========================================

/**
 * Check for missing demographics and display them
 */
async function checkMissingDemographics() {
  const patient = getPatientFromURL();

  if (!patient.mrn) {
    document.getElementById('missing-demo-items').innerHTML = '<li>No patient selected</li>';
    return;
  }

  try {
    // Fetch patient data from Supabase
    const { data: patientData, error } = await supabase
      .from('patients')
      .select('*')
      .eq('mrn', patient.mrn)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Define required demographics fields
    const requiredFields = [
      { key: 'patient_name', label: 'Patient Name' },
      { key: 'date_of_birth', label: 'Date of Birth' },
      { key: 'gender', label: 'Gender' },
      { key: 'race', label: 'Race' },
      { key: 'ethnicity', label: 'Ethnicity' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'email', label: 'Email Address' },
      { key: 'address', label: 'Street Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'zip_code', label: 'ZIP Code' },
      { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
      { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
      { key: 'insurance_provider', label: 'Insurance Provider' },
      { key: 'insurance_number', label: 'Insurance Number' },
      { key: 'primary_care_physician', label: 'Primary Care Physician' }
    ];

    // Check which fields are missing or placeholder values
    const missingFields = [];

    if (!patientData) {
      // Patient record doesn't exist - all fields missing
      missingFields.push(...requiredFields.map(f => f.label));
    } else {
      // Check each field
      requiredFields.forEach(field => {
        const value = patientData[field.key];
        const isMissing = !value ||
                         value === '' ||
                         value === null ||
                         value === '—' ||
                         (field.key === 'date_of_birth' && value === '1900-01-01');

        if (isMissing) {
          missingFields.push(field.label);
        }
      });
    }

    // Display missing fields
    const listElement = document.getElementById('missing-demo-items');

    if (missingFields.length === 0) {
      listElement.innerHTML = '<li style="color: var(--teal);">✓ All demographics complete</li>';
    } else {
      listElement.innerHTML = missingFields
        .map(field => `<li>${field}</li>`)
        .join('');
    }

  } catch (error) {
    console.error('Error checking demographics:', error);
    document.getElementById('missing-demo-items').innerHTML = '<li style="color: #FA4616;">Error loading demographics</li>';
  }
}

// Call checkMissingDemographics when page loads and after saving
document.addEventListener('DOMContentLoaded', () => {
  // Existing initialization code...
  setTimeout(() => {
    checkMissingDemographics();
  }, 1000); // Delay to ensure Supabase is initialized
});