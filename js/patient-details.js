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
  startBtn.addEventListener('click', async () => {
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

      // Clear the initial message
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

// Save summary to backend
async function saveSummaryToChart() {
  const patient = getPatientFromURL();
  const subjective = document.getElementById('soap-subjective').textContent;
  const objective = document.getElementById('soap-objective').textContent;
  const assessment = document.getElementById('soap-assessment').textContent;
  const plan = document.getElementById('soap-plan').textContent;

  try {
    const response = await fetch(`${API_BASE}/soap-notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_mrn: patient.mrn,
        patient_name: patient.name,
        soap_note: {
          subjective,
          objective,
          assessment,
          plan
        },
        created_at: new Date().toISOString()
      })
    });

    if (response.ok) {
      showNotification('💾 Summary saved to chart', 'success');
    } else {
      showNotification('❌ Failed to save summary', 'error');
    }
  } catch (error) {
    console.error('Error saving summary:', error);
    showNotification('❌ Error saving summary', 'error');
  }
}

// ==========================================
// INITIALIZATION
// ==========================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing patient details page...');
  
  displayPatientInfo();
  initializeTranscription();
  initializeAISummary();
});

// Warn before leaving if recording
window.addEventListener('beforeunload', (e) => {
  if (isRecording) {
    e.preventDefault();
    e.returnValue = 'Recording in progress. Are you sure you want to leave?';
  }
});