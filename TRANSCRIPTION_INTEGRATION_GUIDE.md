# Medical Transcription Integration Guide

This guide explains how to integrate the real-time medical transcription system into your UI.

## Overview

The transcription system provides **live, real-time transcription** of doctor-patient conversations with automatic speaker detection. Text appears in the chat as they speak.

---

## Files Created

1. **`js/deepgram-config.js`** - API configuration (API key already added)
2. **`js/medical-transcription.js`** - Main transcription class

---

## Quick Start Integration

### Step 1: Include Scripts in HTML

Add these script tags to your page (in order):

```html
<!-- Deepgram Configuration -->
<script src="js/deepgram-config.js"></script>
<!-- Medical Transcription System -->
<script src="js/medical-transcription.js"></script>
```

### Step 2: Initialize the Transcription System

```javascript
// Create transcription instance
const transcription = new MedicalTranscription();
```

### Step 3: Start Recording (When Button Clicked)

```javascript
// Your "Start Transcript" button click handler
async function startTranscript() {
  try {
    // Start recording with callback for live updates
    await transcription.start((segment) => {
      // This callback is called every time new text arrives
      // segment = {
      //   speaker: "Doctor" or "Patient",
      //   text: "the transcribed text",
      //   timestamp: "00:05",
      //   isFinal: true/false,
      //   confidence: 0.95
      // }

      // Add to your live chat UI
      addMessageToChat(segment);
    });

    console.log('Recording started!');
  } catch (error) {
    console.error('Failed to start:', error);
    alert('Could not start recording. Please check microphone permissions.');
  }
}
```

### Step 4: Stop Recording

```javascript
async function stopTranscript() {
  await transcription.stop();

  // Optionally get full transcript
  const fullTranscript = transcription.getTranscript();
  console.log('Full transcript:', fullTranscript);
}
```

---

## Complete Example

Here's a complete working example:

```javascript
// Initialize
const transcription = new MedicalTranscription();
let isRecording = false;

// Start button handler
document.getElementById('startButton').addEventListener('click', async () => {
  if (isRecording) return;

  try {
    await transcription.start((segment) => {
      // Called for each new piece of text
      if (segment.isFinal) {
        // Final text - add to chat permanently
        addMessageToChat({
          speaker: segment.speaker,
          text: segment.text,
          timestamp: segment.timestamp
        });
      } else {
        // Interim text - show as "typing..." or preview
        showTypingPreview(segment.speaker, segment.text);
      }
    });

    isRecording = true;
    updateButtonText('Stop Recording');
  } catch (error) {
    alert('Error: ' + error.message);
  }
});

// Stop button handler
document.getElementById('stopButton').addEventListener('click', async () => {
  if (!isRecording) return;

  await transcription.stop();
  isRecording = false;
  updateButtonText('Start Recording');

  // Get full transcript
  const transcript = transcription.getTranscript();
  console.log(`Recorded ${transcript.length} messages`);
});

// Function to add message to your chat UI
function addMessageToChat(message) {
  const chatContainer = document.getElementById('chatContainer');

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${message.speaker.toLowerCase()}`;
  messageDiv.innerHTML = `
    <div class="message-header">
      <span class="speaker">${message.speaker}</span>
      <span class="timestamp">${message.timestamp}</span>
    </div>
    <div class="message-text">${message.text}</div>
  `;

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight; // Auto-scroll
}

// Function to show typing preview (optional)
function showTypingPreview(speaker, text) {
  const preview = document.getElementById('typingPreview');
  preview.textContent = `${speaker} is speaking: ${text}...`;
}
```

---

## API Reference

### `MedicalTranscription` Class

#### Constructor
```javascript
const transcription = new MedicalTranscription();
```

#### Methods

##### `start(onTranscriptUpdate)`
Start recording and live transcription.

**Parameters:**
- `onTranscriptUpdate` (Function) - Callback called when new text arrives
  - Receives: `{ speaker, text, timestamp, isFinal, confidence }`

**Returns:** Promise

**Example:**
```javascript
await transcription.start((segment) => {
  console.log(`[${segment.timestamp}] ${segment.speaker}: ${segment.text}`);
});
```

##### `stop()`
Stop recording and transcription.

**Returns:** Promise

**Example:**
```javascript
await transcription.stop();
```

##### `getTranscript()`
Get array of all final transcript segments.

**Returns:** Array of objects
```javascript
[
  {
    speaker: "Doctor",
    text: "How are you feeling today?",
    timestamp: "00:00",
    isFinal: true,
    confidence: 0.98
  },
  // ... more segments
]
```

##### `getFormattedTranscript()`
Get transcript as formatted string.

**Returns:** String

**Example:**
```javascript
const text = transcription.getFormattedTranscript();
console.log(text);
// Output:
// [00:00] Doctor: How are you feeling today?
//
// [00:05] Patient: I've had a headache for two days.
```

##### `clearTranscript()`
Clear all transcript data.

##### `isActive()`
Check if currently recording.

**Returns:** Boolean

##### `getDuration()`
Get recording duration in milliseconds.

**Returns:** Number

##### `getFormattedDuration()`
Get recording duration as "MM:SS".

**Returns:** String (e.g., "05:23")

##### `setSpeakerLabels(speakerMap)`
Customize speaker names.

**Parameters:**
- `speakerMap` (Object) - Map of speaker IDs to names

**Example:**
```javascript
transcription.setSpeakerLabels({
  0: "Dr. Smith",
  1: "John Doe"
});
```

---

## Callback Data Structure

The `onTranscriptUpdate` callback receives this object:

```javascript
{
  speaker: "Doctor" | "Patient",  // Speaker identification
  text: "the transcribed text",   // What was said
  timestamp: "00:05",              // When it was said (MM:SS)
  isFinal: true | false,           // Is this final or interim?
  confidence: 0.95                 // Transcription confidence (0-1)
}
```

### `isFinal` explained:
- **`false`**: Interim/partial result (text may change as user continues speaking)
- **`true`**: Final result (text won't change, safe to display permanently)

**Recommendation:** Only add `isFinal: true` messages to your chat permanently. Use interim results for "typing..." previews.

---

## Example Chat UI Integration

Here's how to build a simple chat UI:

### HTML Structure
```html
<div class="transcription-container">
  <!-- Control buttons -->
  <div class="controls">
    <button id="startBtn">🎙️ Start Recording</button>
    <button id="stopBtn" disabled>⏹️ Stop Recording</button>
    <span id="duration">00:00</span>
  </div>

  <!-- Live chat display -->
  <div id="chatContainer" class="chat-container">
    <!-- Messages will appear here -->
  </div>

  <!-- Typing preview (optional) -->
  <div id="typingPreview" class="typing-preview"></div>
</div>
```

### JavaScript
```javascript
const transcription = new MedicalTranscription();
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const chatContainer = document.getElementById('chatContainer');
const durationDisplay = document.getElementById('duration');

let durationInterval;

// Start recording
startBtn.addEventListener('click', async () => {
  await transcription.start((segment) => {
    if (segment.isFinal) {
      // Add final message to chat
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${segment.speaker.toLowerCase()}`;
      messageDiv.innerHTML = `
        <strong>${segment.speaker}</strong>
        <span class="time">${segment.timestamp}</span>
        <p>${segment.text}</p>
      `;
      chatContainer.appendChild(messageDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  startBtn.disabled = true;
  stopBtn.disabled = false;

  // Update duration display
  durationInterval = setInterval(() => {
    durationDisplay.textContent = transcription.getFormattedDuration();
  }, 1000);
});

// Stop recording
stopBtn.addEventListener('click', async () => {
  await transcription.stop();

  startBtn.disabled = false;
  stopBtn.disabled = true;
  clearInterval(durationInterval);

  console.log('Final transcript:', transcription.getTranscript());
});
```

---

## Speaker Detection

The system automatically detects up to 2 speakers:
- **Speaker 0** = labeled as "Doctor"
- **Speaker 1** = labeled as "Patient"

The AI determines who's speaking based on voice characteristics. **It's quite accurate but not perfect.**

### Custom Speaker Names

You can customize speaker labels:

```javascript
transcription.setSpeakerLabels({
  0: "Dr. Sarah Smith",
  1: "John Doe"
});
```

---

## Error Handling

Always wrap in try-catch:

```javascript
try {
  await transcription.start(callback);
} catch (error) {
  if (error.message.includes('Permission denied')) {
    alert('Please allow microphone access');
  } else if (error.message.includes('NotFoundError')) {
    alert('No microphone found');
  } else {
    alert('Error: ' + error.message);
  }
}
```

---

## Browser Compatibility

**Supported Browsers:**
- ✅ Chrome 47+ (recommended)
- ✅ Edge 79+
- ✅ Firefox 25+
- ✅ Safari 11+
- ✅ Opera 34+

**Required:**
- HTTPS connection (required for microphone access)
- Microphone permission

---

## Performance & Cost

### Bandwidth
- Streams ~16 KB/sec of audio
- ~1 MB per minute
- Ensure stable internet connection

### Deepgram Cost
- $0.0043 per minute
- 30-minute consultation = $0.13
- 100 consultations/month = ~$13/month

### Free Credits
- You have $200 in credits
- ~46,000 minutes of transcription
- ~1,500 hours

---

## Privacy & Security

### HIPAA Compliance
- Audio is transmitted over WSS (encrypted WebSocket)
- Enable PII redaction if needed (see below)
- Consider deleting audio after transcription
- Store transcripts encrypted in database

### Enable PII Redaction
In `deepgram-config.js`, change:
```javascript
redact: 'pii'  // Redacts names, SSN, credit cards, etc.
```

---

## Troubleshooting

### "Permission denied" error
- User denied microphone access
- Ask them to allow in browser settings

### No transcription appearing
- Check browser console for errors
- Verify API key in `deepgram-config.js`
- Check internet connection
- Ensure HTTPS (required for microphone)

### Wrong speaker labels
- AI isn't perfect at speaker detection
- Consider manual speaker selection in UI
- Or ask user to verify/correct speakers after

### Poor accuracy
- Ensure quiet environment
- Check microphone quality
- Speak clearly and at normal pace
- Medical model is optimized for medical terminology

---

## Next Steps

1. **Test the integration** - Try it out first
2. **Add UI styling** - Make it look good
3. **Save to database** - Store transcripts in Supabase
4. **Add features** - Edit transcript, export to PDF, etc.

---

## Example: Save Transcript to Supabase

After stopping recording:

```javascript
stopBtn.addEventListener('click', async () => {
  await transcription.stop();

  // Get transcript
  const transcript = transcription.getTranscript();

  // Save to Supabase
  const { data, error } = await supabase
    .from('consultation_transcripts')
    .insert([{
      patient_id: currentPatientId,
      user_id: currentUserId,
      transcript: transcript,
      audio_duration: transcription.getDuration() / 1000, // Convert to seconds
      recorded_at: new Date().toISOString()
    }]);

  if (error) {
    console.error('Error saving:', error);
  } else {
    console.log('Transcript saved!');
  }
});
```

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify API key is correct
3. Test in Chrome first (most reliable)
4. Check microphone permissions
5. Ensure HTTPS connection

For Deepgram-specific issues, see: https://developers.deepgram.com/docs
